import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

import { sendPaymentSuccessEmail } from "@/lib/email/billing-emails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// =====================================================
// SUPABASE ADMIN CLIENT
// =====================================================

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// =====================================================
// SAFEPAY WEBHOOK SIGNATURE
// =====================================================

function verifySafepayWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  const webhookSecret =
    process.env.SAFEPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      "SAFEPAY_WEBHOOK_SECRET is not configured."
    );
  }

  if (!signature || !timestamp) {
    return false;
  }

  const signedPayload =
    `${timestamp}.${rawBody}`;

  let secretKey: Buffer;

  try {
    secretKey = Buffer.from(
      webhookSecret,
      "base64"
    );
  } catch {
    return false;
  }

  const expectedSignature =
    `sha256=${crypto
      .createHmac(
        "sha256",
        secretKey
      )
      .update(signedPayload)
      .digest("hex")}`;

  const provided =
    signature.trim();

  if (
    expectedSignature.length !==
    provided.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(provided)
  );
}

// =====================================================
// SAFEPAY TYPES
// =====================================================

interface SafepayWebhookPayload {
  token?: string;

  type?: string;

  data?: {
    amount?: number;

    currency?: string;

    customer_email?: string;

    tracker?: string;

    state?: string;

    [key: string]: unknown;
  };

  [key: string]: unknown;
}

// =====================================================
// POST WEBHOOK
// =====================================================

export async function POST(
  request: Request
) {
  try {
    console.log(
      "================================="
    );

    console.log(
      "SAFE PAY WEBHOOK RECEIVED"
    );

    console.log(
      "================================="
    );

    // =================================================
    // READ RAW BODY
    // =================================================

    const rawBody =
      await request.text();

    // =================================================
    // READ HEADERS
    // =================================================

    const signature =
      request.headers.get(
        "x-sfpy-signature"
      );

    const timestamp =
      request.headers.get(
        "x-sfpy-timestamp"
      );

    const eventType =
      request.headers.get(
        "x-sfpy-event-type"
      );

    const eventId =
      request.headers.get(
        "x-sfpy-event-id"
      );

    console.log(
      "Webhook headers:",
      {
        eventType,
        eventId,
        hasSignature:
          Boolean(signature),
        hasTimestamp:
          Boolean(timestamp),
      }
    );

    // =================================================
    // VERIFY SIGNATURE
    // =================================================

    const valid =
      verifySafepayWebhook(
        rawBody,
        signature,
        timestamp
      );

    if (!valid) {
      console.error(
        "Invalid Safepay webhook signature."
      );

      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid webhook signature.",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "Safepay webhook signature verified."
    );

    // =================================================
    // PARSE JSON
    // =================================================

    let payload:
      | SafepayWebhookPayload
      | null = null;

    try {
      payload =
        JSON.parse(
          rawBody
        ) as SafepayWebhookPayload;
    } catch {
      console.error(
        "Invalid Safepay webhook JSON."
      );

      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid JSON payload.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "Safepay event:",
      payload.type
    );

    // =================================================
    // ONLY PROCESS SUCCESSFUL PAYMENTS
    // =================================================

    if (
      payload.type !==
        "payment.succeeded" &&
      eventType !==
        "payment.succeeded"
    ) {
      console.log(
        "Ignoring Safepay event:",
        payload.type ||
          eventType
      );

      return NextResponse.json({
        success: true,

        received: true,

        processed: false,
      });
    }

    // =================================================
    // PAYMENT DATA
    // =================================================

    const payment =
      payload.data;

    if (!payment) {
      throw new Error(
        "Safepay payment data is missing."
      );
    }

    // =================================================
    // GET SAFEPAY TRACKER
    // =================================================

    const tracker =
      payment.tracker ??
      payload.token ??
      null;

    if (!tracker) {
      throw new Error(
        "Safepay webhook did not contain a tracker."
      );
    }

    console.log(
      "Safepay payment:",
      {
        tracker,

        amount:
          payment.amount,

        currency:
          payment.currency,

        customerEmail:
          payment.customer_email,

        state:
          payment.state,
      }
    );

    // =================================================
    // SUPABASE ADMIN
    // =================================================

    const supabase =
      getSupabaseAdmin();

    // =================================================
    // FIND OUR PENDING TRANSACTION
    // =================================================
    //
    // We identify the Sales Pilot user using our own
    // pending transaction.
    //
    // We do NOT depend on Safepay metadata for user_id.
    // =================================================

    const {
      data:
        pendingTransaction,

      error:
        transactionLookupError,
    } =
      await supabase
        .from(
          "billing_transactions"
        )
        .select(
          `
            id,
            user_id,
            amount,
            currency,
            status,
            provider_payment_id
          `
        )
        .eq(
          "provider",
          "safepay"
        )
        .eq(
          "provider_payment_id",
          tracker
        )
        .maybeSingle();

    if (
      transactionLookupError
    ) {
      throw transactionLookupError;
    }

    // =================================================
    // TRANSACTION NOT FOUND
    // =================================================

    if (!pendingTransaction) {
      console.error(
        "No pending Sales Pilot transaction found for Safepay tracker:",
        tracker
      );

      /*
       * Never activate a subscription without a
       * matching Sales Pilot transaction.
       */

      return NextResponse.json({
        success: true,

        received: true,

        processed: false,

        reason:
          "No matching Sales Pilot transaction found.",
      });
    }

    const userId =
      pendingTransaction.user_id;

    // =================================================
    // DUPLICATE PAYMENT PROTECTION
    // =================================================

    if (
      pendingTransaction.status ===
      "succeeded"
    ) {
      console.log(
        "Payment already processed:",
        tracker
      );

      return NextResponse.json({
        success: true,

        received: true,

        processed: false,

        duplicate: true,

        planId:
          "starter",
      });
    }

    // =================================================
    // VERIFY AMOUNT
    // =================================================

    const expectedAmount =
      pendingTransaction.amount;

    const paidAmount =
      payment.amount;

    if (
      typeof paidAmount ===
        "number" &&
      typeof expectedAmount ===
        "number" &&
      paidAmount !==
        expectedAmount
    ) {
      console.error(
        "Safepay payment amount does not match pending transaction.",
        {
          expectedAmount,

          paidAmount,

          tracker,
        }
      );

      return NextResponse.json(
        {
          success: false,

          error:
            "Payment amount does not match the pending transaction.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // VERIFY CURRENCY
    // =================================================

    const expectedCurrency =
      pendingTransaction.currency;

    const paidCurrency =
      payment.currency;

    if (
      paidCurrency &&
      expectedCurrency &&
      paidCurrency !==
        expectedCurrency
    ) {
      console.error(
        "Safepay payment currency does not match pending transaction.",
        {
          expectedCurrency,

          paidCurrency,

          tracker,
        }
      );

      return NextResponse.json(
        {
          success: false,

          error:
            "Payment currency does not match the pending transaction.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // STARTER ONLY
    // =================================================

    const planId =
      "starter";

    // =================================================
    // UPDATE BILLING TRANSACTION
    // =================================================

    const {
      error:
        transactionUpdateError,
    } =
      await supabase
        .from(
          "billing_transactions"
        )
        .update({
          status:
            "succeeded",

          provider_transaction_id:
            tracker,

          metadata:
            payload,
        })
        .eq(
          "id",
          pendingTransaction.id
        );

    if (
      transactionUpdateError
    ) {
      throw transactionUpdateError;
    }

    console.log(
      "Billing transaction marked succeeded:",
      pendingTransaction.id
    );

    // =================================================
    // SUBSCRIPTION PERIOD
    // =================================================

    const now =
      new Date();

    const periodEnd =
      new Date(
        now.getTime() +
          30 *
            24 *
            60 *
            60 *
            1000
      );

    // =================================================
    // ACTIVATE STARTER
    // =================================================

    const {
      error:
        subscriptionError,
    } =
      await supabase
        .from(
          "subscriptions"
        )
        .upsert(
          {
            user_id:
              userId,

            plan_id:
              planId,

            status:
              "active",

            billing_cycle:
              "monthly",

            current_period_start:
              now.toISOString(),

            current_period_end:
              periodEnd.toISOString(),

            updated_at:
              now.toISOString(),
          },
          {
            onConflict:
              "user_id",
          }
        );

    if (
      subscriptionError
    ) {
      throw subscriptionError;
    }

    console.log(
      "Starter subscription activated:",
      userId
    );

    // =================================================
    // GET USER EMAIL
    // =================================================

    let customerEmail:
      | string
      | null = null;

    try {
      const {
        data:
          authUserData,

        error:
          authUserError,
      } =
        await supabase.auth.admin.getUserById(
          userId
        );

      if (authUserError) {
        throw authUserError;
      }

      customerEmail =
        authUserData.user?.email ??
        null;
    } catch (emailLookupError) {
      console.error(
        "Unable to retrieve Sales Pilot customer email:",
        emailLookupError
      );
    }

    // =================================================
    // SEND PAYMENT SUCCESS EMAIL
    // =================================================
    //
    // IMPORTANT:
    //
    // Email failure must NOT reverse a successful
    // payment or subscription.
    // =================================================

    if (customerEmail) {
      try {
        await sendPaymentSuccessEmail({
          to:
            customerEmail,

          planName:
            "Starter",

          amount:
            pendingTransaction.amount,

          currency:
            pendingTransaction.currency,

          billingCycle:
            "monthly",

          paymentDate:
            now.toISOString(),

          nextBillingDate:
            periodEnd.toISOString(),
        });

        console.log(
          "Sales Pilot payment confirmation email sent:",
          customerEmail
        );
      } catch (emailError) {
        console.error(
          "Sales Pilot payment confirmation email failed:",
          emailError
        );
      }
    } else {
      console.warn(
        "No customer email found. Payment email was not sent.",
        {
          userId,
        }
      );
    }

    // =================================================
    // SUCCESS
    // =================================================

    console.log(
      "================================="
    );

    console.log(
      "STARTER SUBSCRIPTION ACTIVATED"
    );

    console.log(
      {
        userId,

        planId,

        tracker,

        amount:
          payment.amount,

        currency:
          payment.currency,

        transactionId:
          pendingTransaction.id,

        emailSent:
          Boolean(customerEmail),
      }
    );

    console.log(
      "================================="
    );

    return NextResponse.json({
      success: true,

      received: true,

      processed: true,

      planId:
        "starter",

      userId,

      emailSent:
        Boolean(customerEmail),
    });
  } catch (
    error: unknown
  ) {
    console.error(
      "Safepay webhook error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}