import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createEmbedding } from "@/lib/ai/embeddings";

// =====================================================
// SUPABASE ADMIN CLIENT
// =====================================================

const supabaseAdmin =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// =====================================================
// SEARCH API
// =====================================================

export async function POST(
  req: Request
) {
  try {
    // =================================================
    // READ REQUEST
    // =================================================

    const {
      question,
      userId,
    } = await req.json();

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Question is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User ID is required for knowledge search.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CREATE QUERY EMBEDDING
    // =================================================

    console.log(
      "================================="
    );

    console.log(
      "KNOWLEDGE SEARCH START"
    );

    console.log(
      "QUESTION:",
      question
    );

    console.log(
      "USER:",
      userId
    );

    const embedding =
      await createEmbedding(
        question
      );

    // =================================================
    // VERIFY DIMENSIONS
    // =================================================

    console.log(
      "QUERY EMBEDDING DIMENSIONS:",
      embedding.length
    );

    if (
      embedding.length !== 768
    ) {
      throw new Error(
        `Query embedding has ${embedding.length} dimensions. Expected 768.`
      );
    }

    // =================================================
    // SEARCH KNOWLEDGE CHUNKS
    // =================================================

    console.log(
      "CALLING match_knowledge_chunks..."
    );

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        "match_knowledge_chunks",
        {
          query_embedding:
            embedding,

          match_count: 5,

          filter_user_id:
            userId,
        }
      );

    // =================================================
    // SUPABASE ERROR
    // =================================================

    if (error) {
      console.error(
        "KNOWLEDGE SEARCH RPC ERROR:",
        error
      );

      throw error;
    }

    // =================================================
    // SUCCESS
    // =================================================

    console.log(
      "KNOWLEDGE SEARCH COMPLETED"
    );

    console.log(
      "MATCH COUNT:",
      data?.length ?? 0
    );

    console.log(
      "================================="
    );

    return NextResponse.json({
      success: true,

      matches:
        data || [],
    });
  } catch (
    error: any
  ) {
    console.error(
      "================================="
    );

    console.error(
      "SEARCH ERROR:",
      error
    );

    console.error(
      "================================="
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Knowledge search failed.",
      },
      {
        status: 500,
      }
    );
  }
}