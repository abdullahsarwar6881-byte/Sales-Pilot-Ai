import { NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@/lib/supabase/server";

import { safepayCore } from "@/lib/billing/safepay-core";
import { safepayV1 } from "@/lib/billing/safepay-v1";

import {
  PLANS,
  type PlanId,
} from "@/lib/billing/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // =====================================================
    // AUTHENTICATED USER
    // =====================================================

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================================
    // REQUEST
    // =====================================================

    const body = await request.json();

    const planId = body.planId as PlanId;

    // =====================================================
    // VALIDATE PLAN
    // =====================================================

    if (!(planId in PLANS)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid billing plan.",
        },
        {
          status: 400,
        }
      );
    }

    const plan = PLANS[planId];

    // =====================================================
    // SAFEPAY PUBLIC / MERCHANT API KEY
    // =====================================================

    const merchantApiKey =
      process.env.SAFEPAY_PUBLIC_KEY;

    if (!merchantApiKey) {
      throw new Error(
        "SAFEPAY_PUBLIC_KEY is not configured."
      );
    }

    // =====================================================
    // INTERNAL ORDER ID
    // =====================================================

    const orderId = crypto.randomUUID();

    // =====================================================
    // CREATE SAFEPAY PAYMENT SESSION
    // =====================================================

    const session =
      await safepayCore.payments.session.setup({
        merchant_api_key: merchantApiKey,

        intent: "CYBERSOURCE",

        mode: "payment",

        entry_mode: "raw",

        currency: plan.currency,

        amount: plan.price,

        metadata: {
  order_id: orderId,
  user_id: user.id,
  plan_id: planId,
  source: "sales-pilot",
},
      });

    console.log(
      "Safepay payment session:",
      session
    );

    // =====================================================
    // GET TRACKER
    // =====================================================

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

    // =====================================================
    // CREATE TEMPORARY AUTHORIZATION TOKEN
    // =====================================================
    //
    // This uses @sfpy/node-sdk.
    //
    // The node-sdk exposes:
    //
    // safepayV1.authorization.create()
    //
    // =====================================================

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

    // =====================================================
    // APP URL
    // =====================================================

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://sales-pilot-ai-1d51.vercel.app";

    // =====================================================
    // SAFEPAY ENVIRONMENT
    // =====================================================

    const environment =
      process.env.SAFEPAY_ENVIRONMENT ===
      "production"
        ? "production"
        : "sandbox";

    // =====================================================
    // CREATE HOSTED CHECKOUT URL
    // =====================================================

    const checkoutUrl =
      safepayCore.checkout.createCheckoutUrl({
        env: environment,

        tbt,

        tracker,

        source: "hosted",

        order_id: orderId,

        cancel_url:
          `${baseUrl}/dashboard/billing?payment=cancelled`,

        redirect_url:
          `${baseUrl}/dashboard/billing?payment=success`,
      });

    console.log(
      "Safepay checkout URL:",
      checkoutUrl
    );

    // =====================================================
    // VALIDATE CHECKOUT URL
    // =====================================================

    if (!checkoutUrl) {
      throw new Error(
        "Safepay did not return a checkout URL."
      );
    }

    // =====================================================
    // SAVE PENDING TRANSACTION
    // =====================================================

    const {
      error: transactionError,
    } = await supabase
      .from("billing_transactions")
      .insert({
        user_id: user.id,

        amount: plan.price,

        currency: plan.currency,

        status: "pending",

        description:
          `Pending ${plan.name} subscription`,

        provider: "safepay",

        provider_payment_id: tracker,
      });

    if (transactionError) {
      console.error(
        "Billing transaction insert error:",
        transactionError
      );
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      checkoutUrl,

      tracker,

      orderId,

      planId,

      amount: plan.price,

      currency: plan.currency,
    });
  } catch (error: unknown) {
    console.error(
      "Safepay direct checkout error:",
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