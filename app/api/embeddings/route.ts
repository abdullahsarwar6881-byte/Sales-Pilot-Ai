import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createEmbedding } from "@/lib/ai/embeddings";


const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);



export async function POST(req: Request) {

  try {

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

      .single();



    if (chunkError || !chunk) {

      console.error(
        "CHUNK FETCH ERROR:",
        chunkError
      );


      return NextResponse.json(
        {
          error:
            chunkError?.message ||
            "Chunk not found"
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