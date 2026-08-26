import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

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

interface SafepayMetadata {
  user_id?: string;
  plan_id?: string;
  order_id?: string;
  source?: string;

  [key: string]: unknown;
}

interface SafepayWebhookPayload {
  token?: string;

  type?: string;

  data?: {
    amount?: number;

    currency?: string;

    customer_email?: string;

    tracker?: string;

    state?: string;

    metadata?: SafepayMetadata;

    [key: string]: unknown;
  };

  [key: string]: unknown;
}

// =====================================================
// WEBHOOK
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
    // RAW BODY
    // =================================================

    const rawBody =
      await request.text();

    // =================================================
    // HEADERS
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
    // ONLY PAYMENT SUCCESS
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

    const metadata =
      payment.metadata ??
      {};

    console.log(
      "Payment data:",
      {
        tracker:
          payment.tracker,

        amount:
          payment.amount,

        currency:
          payment.currency,

        metadata,
      }
    );

    // =================================================
    // GET SALES PILOT USER
    // =================================================

    const userId =
      typeof metadata.user_id ===
      "string"
        ? metadata.user_id
        : null;

    if (!userId) {
      console.error(
        "Safepay payment has no Sales Pilot user_id."
      );

      return NextResponse.json({
        success: true,
        received: true,
        processed: false,
        reason:
          "Missing Sales Pilot user_id.",
      });
    }

    // =================================================
    // STARTER ONLY
    // =================================================

    const planId = "starter";

    // =================================================
    // SUPABASE ADMIN
    // =================================================

    const supabase =
      getSupabaseAdmin();

    // =================================================
    // FIND PENDING TRANSACTION
    // =================================================

    const tracker =
      payment.tracker ??
      payload.token ??
      null;

    let pendingTransaction:
      | {
          id: string;
          user_id: string;
          status: string;
          amount: number;
          currency: string;
        }
      | null = null;

    if (tracker) {
      const {
        data,
        error,
      } = await supabase
        .from(
          "billing_transactions"
        )
        .select(
          "id,user_id,status,amount,currency"
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

      if (error) {
        throw error;
      }

      pendingTransaction =
        data;
    }

    // =================================================
    // DUPLICATE WEBHOOK
    // =================================================

    if (
      pendingTransaction?.status ===
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
      });
    }

    // =================================================
    // UPDATE BILLING TRANSACTION
    // =================================================

    if (pendingTransaction) {
      const {
        error,
      } = await supabase
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

      if (error) {
        throw error;
      }

      console.log(
        "Billing transaction marked succeeded."
      );
    } else {
      // -------------------------------------------------
      // Fallback:
      // Create the transaction if the pending transaction
      // cannot be found.
      // -------------------------------------------------

      const {
        error,
      } = await supabase
        .from(
          "billing_transactions"
        )
        .insert({
          user_id:
            userId,

          amount:
            payment.amount ??
            0,

          currency:
            payment.currency ??
            "PKR",

          status:
            "succeeded",

          description:
            "Starter subscription payment",

          provider:
            "safepay",

          provider_payment_id:
            tracker,

          provider_transaction_id:
            tracker,

          metadata:
            payload,
        });

      if (error) {
        throw error;
      }

      console.log(
        "Successful billing transaction created."
      );
    }

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
      }
    );

    console.log(
      "================================="
    );

    return NextResponse.json({
      success: true,

      received: true,

      processed: true,

      planId: "starter",
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