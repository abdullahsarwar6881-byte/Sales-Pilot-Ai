import { NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

import { safepayCore } from "@/lib/billing/safepay-core";
import { safepayV1 } from "@/lib/billing/safepay-v1";

import {
  PLANS,
  type PlanId,
} from "@/lib/billing/plans";

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

  return createSupabaseAdmin(
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
// POST
// =====================================================

export async function POST(
  request: Request
) {
  try {
    // ===================================================
    // AUTHENTICATED USER
    // ===================================================

    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    // ===================================================
    // REQUEST
    // ===================================================

    const body =
      await request.json();

    const planId =
      body.planId as PlanId;

    // ===================================================
    // STARTER ONLY
    // ===================================================

    if (planId !== "starter") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only the Starter plan is currently available.",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // VALIDATE PLAN
    // ===================================================

    if (!(planId in PLANS)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid billing plan.",
        },
        {
          status: 400,
        }
      );
    }

    const plan =
      PLANS[planId];

    // ===================================================
    // SAFEPAY PUBLIC KEY
    // ===================================================

    const merchantApiKey =
      process.env.SAFEPAY_PUBLIC_KEY;

    if (!merchantApiKey) {
      throw new Error(
        "SAFEPAY_PUBLIC_KEY is not configured."
      );
    }

    // ===================================================
    // INTERNAL ORDER ID
    // ===================================================

    const orderId =
      crypto.randomUUID();

    /*
     * Keep the plan in our own internal reference.
     *
     * We do NOT send user_id or plan_id as Safepay
     * metadata because Safepay rejects unsupported
     * metadata keys.
     */
    const reference =
      `starter_${orderId}`;

    // ===================================================
    // CREATE SAFEPAY PAYMENT SESSION
    // ===================================================

    const session =
      await safepayCore.payments.session.setup(
        {
          merchant_api_key:
            merchantApiKey,

          intent:
            "CYBERSOURCE",

          mode:
            "payment",

          entry_mode:
            "raw",

          currency:
            plan.currency,

          amount:
            plan.price,

          /*
           * Safepay-supported metadata.
           *
           * IMPORTANT:
           * Do not add user_id or plan_id here.
           */
          metadata: {
            order_id:
              orderId,
          },
        }
      );

    console.log(
      "Safepay payment session:",
      session
    );

    // ===================================================
    // GET TRACKER
    // ===================================================

    const tracker =
      session?.data?.tracker?.token ??
      session?.tracker?.token;

    if (!tracker) {
      console.error(
        "Safepay session response:",
        session
      );

      throw new Error(
        "Safepay did not return a tracker token."
      );
    }

    console.log(
      "Safepay tracker:",
      tracker
    );

    // ===================================================
    // CREATE TEMPORARY AUTH TOKEN
    // ===================================================

    const tbt =
      await safepayV1.authorization.create();

    console.log(
      "Safepay authorization token created:",
      Boolean(tbt)
    );

    if (!tbt) {
      throw new Error(
        "Safepay did not return an authorization token."
      );
    }

    // ===================================================
    // APP URL
    // ===================================================

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://sales-pilot-ai-1d51.vercel.app";

    // ===================================================
    // ENVIRONMENT
    // ===================================================

    const environment =
      process.env.SAFEPAY_ENVIRONMENT ===
      "production"
        ? "production"
        : "sandbox";

    // ===================================================
    // CREATE HOSTED CHECKOUT URL
    // ===================================================

    const checkoutUrl =
      safepayCore.checkout.createCheckoutUrl(
        {
          env:
            environment,

          tbt,

          tracker,

          source:
            "hosted",

          order_id:
            orderId,

          cancel_url:
            `${baseUrl}/dashboard/billing?payment=cancelled`,

          redirect_url:
            `${baseUrl}/dashboard/billing?payment=success`,
        }
      );

    console.log(
      "Safepay checkout URL:",
      checkoutUrl
    );

    if (!checkoutUrl) {
      throw new Error(
        "Safepay did not return a checkout URL."
      );
    }

    // ===================================================
    // SAVE PENDING BILLING TRANSACTION
    // ===================================================
    //
    // IMPORTANT:
    //
    // billing_transactions has RLS enabled.
    // Therefore use the Supabase service-role client
    // for this server-side billing operation.
    // ===================================================

    const supabaseAdmin =
      getSupabaseAdmin();

    const {
      error:
        transactionError,
    } =
      await supabaseAdmin
        .from(
          "billing_transactions"
        )
        .insert(
          {
            user_id:
              user.id,

            reference:
              reference,

            amount:
              plan.price,

            currency:
              plan.currency,

            status:
              "pending",

            description:
              "Pending Starter subscription",

            provider:
              "safepay",

            provider_payment_id:
              tracker,
          }
        );

    if (transactionError) {
      console.error(
        "Billing transaction insert error:",
        transactionError
      );

      throw new Error(
        "Unable to create the pending billing transaction."
      );
    }

    console.log(
      "Pending Starter transaction created:",
      {
        userId:
          user.id,

        reference,

        tracker,

        amount:
          plan.price,

        currency:
          plan.currency,
      }
    );

    // ===================================================
    // RESPONSE
    // ===================================================

    return NextResponse.json(
      {
        success: true,

        checkoutUrl,

        tracker,

        orderId,

        reference,

        planId:

          "starter",

        amount:
          plan.price,

        currency:
          plan.currency,
      }
    );
  } catch (
    error: unknown
  ) {
    console.error(
      "Safepay checkout error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to create Safepay checkout.",
      },
      {
        status: 500,
      }
    );
  }
}