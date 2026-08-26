import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// =====================================================
// GET ANALYTICS
// =====================================================

export async function GET() {
  try {
    // =================================================
    // ENVIRONMENT VARIABLES
    // =================================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL is not configured."
      );
    }

    if (!supabaseServiceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not configured."
      );
    }

    // =================================================
    // SUPABASE ADMIN CLIENT
    // =================================================

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    // =================================================
    // TOTAL CONVERSATIONS
    // =================================================

    const {
      count: totalChats,
      error: totalChatsError,
    } = await supabaseAdmin
      .from("conversations")
      .select("id", {
        count: "exact",
        head: true,
      });

    if (totalChatsError) {
      throw totalChatsError;
    }

    // =================================================
    // HUMAN TAKEOVERS
    // =================================================

    const {
      count: humanTakeovers,
      error: humanTakeoversError,
    } = await supabaseAdmin
      .from("conversations")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "assigned_to",
        "human"
      );

    if (humanTakeoversError) {
      throw humanTakeoversError;
    }

    // =================================================
    // AI SOLVED
    // =================================================

    const {
      count: aiSolved,
      error: aiSolvedError,
    } = await supabaseAdmin
      .from("conversations")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "assigned_to",
        "ai"
      )
      .eq(
        "status",
        "resolved"
      );

    if (aiSolvedError) {
      throw aiSolvedError;
    }

    // =================================================
    // CUSTOMER QUESTIONS
    // =================================================

    const {
      data: messages,
      error: messagesError,
    } = await supabaseAdmin
      .from("conversation_messages")
      .select("content")
      .eq(
        "sender",
        "customer"
      )
      .limit(100);

    if (messagesError) {
      throw messagesError;
    }

    // =================================================
    // POPULAR QUESTIONS
    // =================================================

    const questionMap: Record<
      string,
      number
    > = {};

    messages?.forEach(
      (message) => {
        const text =
          String(
            message.content || ""
          ).trim();

        if (!text) {
          return;
        }

        questionMap[text] =
          (questionMap[text] || 0) + 1;
      }
    );

    const popularQuestions =
      Object.entries(
        questionMap
      )
        .sort(
          (
            [, countA],
            [, countB]
          ) =>
            countB - countA
        )
        .slice(
          0,
          5
        )
        .map(
          ([
            question,
            count,
          ]) => ({
            question,
            count,
          })
        );

    // =================================================
    // AI SOLVED PERCENTAGE
    // =================================================

    const total =
      totalChats || 0;

    const solved =
      aiSolved || 0;

    const aiSolvedPercentage =
      total > 0
        ? Math.round(
            (solved / total) *
              100
          )
        : 0;

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json({
      success: true,

      totalChats: total,

      aiSolvedPercentage,

      humanTakeovers:
        humanTakeovers || 0,

      popularQuestions,
    });
  } catch (error: unknown) {
    console.error(
      "ANALYTICS API ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load analytics.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}