import { NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@/lib/supabase/server";
import { safepay } from "@/lib/billing/safepay";
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
        { status: 401 }
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
        { status: 400 }
      );
    }

    const plan = PLANS[planId];

    // =====================================================
    // DON'T ALLOW SAME PLAN
    // =====================================================

    const {
      data: existingSubscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select("plan_id,status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    if (
      existingSubscription?.plan_id === planId &&
      existingSubscription.status === "active"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You are already on this plan.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // UNIQUE INTERNAL REFERENCE
    // =====================================================

    const reference = crypto.randomUUID();

    // =====================================================
    // CREATE SAFE PAY SUBSCRIPTION URL
    // =====================================================

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://sales-pilot-ai-1d51.vercel.app";

    const checkoutUrl =
      await safepay.checkout.createSubscription({
        planId: plan.safepayPlanId,

        reference,

        cancelUrl:
          `${baseUrl}/dashboard/billing?payment=cancelled`,

        redirectUrl:
          `${baseUrl}/dashboard/billing?payment=success`,
      });

    // =====================================================
    // STORE PENDING SUBSCRIPTION REFERENCE
    // =====================================================
    //
    // We don't activate the plan yet.
    //
    // The webhook will activate it after Safepay
    // confirms the payment/subscription.
    //
    // For now we store the reference in description.
    //

    await supabase
      .from("billing_transactions")
      .insert({
        user_id: user.id,

        amount: plan.price,

        currency: plan.currency,

        status: "pending",

        description:
          `Pending ${plan.name} subscription`,

        provider: "safepay",

        provider_payment_id: reference,
      });

    return NextResponse.json({
      success: true,

      checkoutUrl,

      reference,

      planId,
    });
  } catch (error: unknown) {
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