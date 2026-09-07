import { NextResponse } from "next/server";
import { authenticateUser, getAdminClient } from "@/lib/supabase/serverAuth";
import { createEmbedding } from "@/lib/ai/embeddings";

export async function POST(req: Request) {
  try {
    const auth = await authenticateUser(req);
    if (!auth?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      chunkId
    } = await req.json();

    if (!chunkId) {
      return NextResponse.json(
        {
          error: "Missing chunk id"
        },
        {
          status: 400
        }
      );
    }

    const supabaseAdmin = getAdminClient();

    const {
      data: chunk,
      error: chunkError
    } = await supabaseAdmin
      .from("knowledge_chunks")
      .select("id, content")
      .eq(
        "id",
        chunkId
      )
      .eq("user_id", auth.user.id)
      .single();

    if (chunkError || !chunk) {
      return NextResponse.json(
        {
          error: "Chunk not found or unauthorized"
        },
        {
          status: 404
        }
      );
    }

    console.log(
      "Creating embedding for chunk:",
      chunk.id
    );



    const embedding = await createEmbedding(
      chunk.content
    );



    console.log(
      "Embedding length:",
      embedding.length
    );




    const {
      error: updateError

    } = await supabaseAdmin

      .from("knowledge_chunks")

      .update({

        embedding: embedding

      })

      .eq(
        "id",
        chunkId
      );




    if (updateError) {

      console.error(
        "SUPABASE UPDATE ERROR:",
        updateError
      );

      throw updateError;

    }



    return NextResponse.json({

      success: true,

      message:
        "Embedding created successfully",

      embeddingSize:
        embedding.length

    });



  } catch(error:any) {


    console.error(
      "EMBEDDING ERROR DETAILS:",
      error
    );


    return NextResponse.json(
      {
        error:
          error?.message ||
          "Embedding failed"
      },
      {
        status:500
      }
    );

  }

}