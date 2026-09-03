import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// =====================================================
// GET ANALYTICS
// =====================================================

export async function GET() {
  try {
    // =================================================
    // AUTHENTICATE USER
    // =================================================

    const supabaseUser = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const merchantId = user.id;

    // =================================================
    // ENVIRONMENT VARIABLES
    // =================================================

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase server environment variables are not configured.");
    }

    const supabaseAdmin = createSupabaseAdmin(
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
    // TOTAL CONVERSATIONS (MERCHANT-SCOPED)
    // =================================================

    const {
      count: totalChats,
      error: totalChatsError,
    } = await supabaseAdmin
      .from("conversations")
      .select("id", {
        count: "exact",
        head: true,
      })
      .or(`user_id.eq.${merchantId},profile_id.eq.${merchantId}`);

    if (totalChatsError) {
      throw totalChatsError;
    }

    // =================================================
    // HUMAN TAKEOVERS (MERCHANT-SCOPED)
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
      .or(`user_id.eq.${merchantId},profile_id.eq.${merchantId}`)
      .eq("assigned_to", "human");

    if (humanTakeoversError) {
      throw humanTakeoversError;
    }

    // =================================================
    // AI SOLVED (MERCHANT-SCOPED)
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
      .or(`user_id.eq.${merchantId},profile_id.eq.${merchantId}`)
      .eq("assigned_to", "ai")
      .eq("status", "resolved");

    if (aiSolvedError) {
      throw aiSolvedError;
    }

    // =================================================
    // CUSTOMER QUESTIONS (MERCHANT-SCOPED)
    // =================================================

    const { data: merchantConvs } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .or(`user_id.eq.${merchantId},profile_id.eq.${merchantId}`)
      .order("created_at", { ascending: false })
      .limit(100);

    const convIds = (merchantConvs || []).map((c) => c.id);

    let popularQuestions: Array<{ question: string; count: number }> = [];

    if (convIds.length > 0) {
      const {
        data: messages,
        error: messagesError,
      } = await supabaseAdmin
        .from("conversation_messages")
        .select("content")
        .in("conversation_id", convIds)
        .eq("sender", "customer")
        .limit(150);

      if (messagesError) {
        throw messagesError;
      }

      const questionMap: Record<string, number> = {};

      messages?.forEach((message) => {
        const text = String(message.content || "").trim();
        if (!text) return;
        questionMap[text] = (questionMap[text] || 0) + 1;
      });

      popularQuestions = Object.entries(questionMap)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 5)
        .map(([question, count]) => ({
          question,
          count,
        }));
    }

    // =================================================
    // AI SOLVED PERCENTAGE
    // =================================================

    const total = totalChats || 0;
    const solved = aiSolved || 0;

    const aiSolvedPercentage =
      total > 0
        ? Math.round((solved / total) * 100)
        : 0;

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json({
      success: true,
      totalChats: total,
      aiSolvedPercentage,
      humanTakeovers: humanTakeovers || 0,
      popularQuestions,
    });
  } catch (error: unknown) {
    console.error("ANALYTICS API ERROR:", error);

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