import { NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// =====================================================
// SUPABASE ADMIN CLIENT
// =====================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
// WEBHOOK SIGNATURE VERIFICATION
// =====================================================
//
// Safepay signs:
// timestamp + "." + rawBody
//
// The raw body MUST be used exactly as received.
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

  /*
   * Safepay's current webhook documentation
   * describes a base64-encoded webhook secret.
   */
  let secretKey: Buffer;

  try {
    secretKey =
      Buffer.from(
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
// WEBHOOK TYPES
// =====================================================

interface SafepayMetadata {
  user_id?: string;
  userId?: string;

  plan_id?: string;
  planId?: string;

  reference?: string;

  order_id?: string;
  orderId?: string;

  source?: string;

  [key: string]: unknown;
}

interface SafepayWebhookPayload {
  token?: string;
  version?: string;
  merchant_api_key?: string;
  type?: string;
  endpoint?: string;

  data?: {
    amount?: number;
    currency?: string;
    customer_email?: string;
    fee?: number;
    net?: number;
    intent?: string;
    state?: string;
    tracker?: string;

    metadata?: SafepayMetadata;

    [key: string]: unknown;
  };

  created_at?: {
    seconds?: number;
    nanos?: number;
  };
}

// =====================================================
// POST WEBHOOK
// =====================================================

export async function POST(
  request: Request
) {
  try {
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

    const eventTypeHeader =
      request.headers.get(
        "x-sfpy-event-type"
      );

    const eventId =
      request.headers.get(
        "x-sfpy-event-id"
      );

    console.log(
      "================================="
    );

    console.log(
      "SAFE PAY WEBHOOK RECEIVED"
    );

    console.log(
      "================================="
    );

    console.log({
      eventTypeHeader,
      eventId,
      hasSignature: Boolean(signature),
      hasTimestamp: Boolean(timestamp),
    });

    // =================================================
    // VERIFY SIGNATURE
    // =================================================

    const isValid =
      verifySafepayWebhook(
        rawBody,
        signature,
        timestamp
      );

    if (!isValid) {
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
    // PARSE PAYLOAD
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
        "Invalid JSON webhook body."
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
      "payment.succeeded"
    ) {
      console.log(
        `Ignoring event: ${payload.type}`
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
      payment.metadata ?? {};

    console.log(
      "Payment:",
      {
        amount:
          payment.amount,
        currency:
          payment.currency,
        tracker:
          payment.tracker,
        customerEmail:
          payment.customer_email,
        metadata,
      }
    );

    // =================================================
    // IMPORTANT:
    //
    // Safepay's generic test event does not contain
    // our Sales Pilot user_id / plan_id.
    //
    // Never activate a subscription without identifying
    // the Sales Pilot user and plan.
    // =================================================

    const userId =
      typeof metadata.user_id ===
      "string"
        ? metadata.user_id
        : typeof metadata.userId ===
            "string"
          ? metadata.userId
          : null;

    const planId =
      typeof metadata.plan_id ===
      "string"
        ? metadata.plan_id
        : typeof metadata.planId ===
            "string"
          ? metadata.planId
          : null;

    const reference =
      typeof metadata.reference ===
      "string"
        ? metadata.reference
        : typeof metadata.order_id ===
            "string"
          ? metadata.order_id
          : typeof metadata.orderId ===
              "string"
            ? metadata.orderId
            : null;

    // =================================================
    // TEST EVENT / UNLINKED PAYMENT
    // =================================================

    if (!userId || !planId) {
      console.log(
        "Payment received but no Sales Pilot user_id/plan_id was supplied."
      );

      console.log(
        "This is expected for Safepay's generic test event."
      );

      return NextResponse.json({
        success: true,
        received: true,
        processed: false,
        reason:
          "Payment is not linked to a Sales Pilot subscription.",
      });
    }

    // =================================================
    // VALIDATE PLAN
    // =================================================

    const validPlans = [
      "starter",
      "growth",
      "business",
    ];

    if (
      !validPlans.includes(
        planId
      )
    ) {
      console.error(
        "Unknown Sales Pilot plan:",
        planId
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unknown Sales Pilot plan.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // SUPABASE
    // =================================================

    const supabase =
      getSupabaseAdmin();

    // =================================================
    // DUPLICATE PAYMENT PROTECTION
    // =================================================

    if (reference) {
      const {
        data: existingTransaction,
        error:
          transactionLookupError,
      } = await supabase
        .from(
          "billing_transactions"
        )
        .select("id")
        .eq(
          "reference",
          reference
        )
        .maybeSingle();

      if (
        transactionLookupError
      ) {
        throw transactionLookupError;
      }

      if (
        existingTransaction
      ) {
        console.log(
          "Webhook already processed:",
          reference
        );

        return NextResponse.json({
          success: true,
          received: true,
          processed: false,
          duplicate: true,
        });
      }
    }

    // =================================================
    // CREATE / UPDATE SUBSCRIPTION
    // =================================================

    const now =
      new Date();

    const periodStart =
      now;

    const periodEnd =
      new Date(
        now.getTime() +
          30 *
            24 *
            60 *
            60 *
            1000
      );

    const {
      error:
        subscriptionError,
    } = await supabase
      .from("subscriptions")
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
            periodStart.toISOString(),

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
    // RECORD BILLING TRANSACTION
    // =================================================

    const {
      error:
        transactionInsertError,
    } = await supabase
      .from(
        "billing_transactions"
      )
      .insert({
        user_id:
          userId,

        reference:
          reference,

        amount:
          payment.amount ??
          0,

        currency:
          payment.currency ??
          "PKR",

        status:
          "succeeded",

        provider:
          "safepay",

        provider_transaction_id:
          payment.tracker ??
          payload.token ??
          null,

        metadata:
          payload,
      });

    if (
      transactionInsertError
    ) {
      throw transactionInsertError;
    }

    // =================================================
    // SUCCESS
    // =================================================

    console.log(
      "================================="
    );

    console.log(
      "SALES PILOT SUBSCRIPTION ACTIVATED"
    );

    console.log(
      {
        userId,
        planId,
        reference,
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
      planId,
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