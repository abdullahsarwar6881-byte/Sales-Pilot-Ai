import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


function splitText(
  text: string,
  size = 500
) {

  const chunks = [];

  for (
    let i = 0;
    i < text.length;
    i += size
  ) {

    chunks.push(
      text.slice(i, i + size)
    );

  }

  return chunks;

}





const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);






export async function POST(req: Request) {

  try {


    const {
      knowledgePageId

    } = await req.json();





    if (!knowledgePageId) {

      return NextResponse.json(
        {
          error: "Missing knowledge page id"
        },
        {
          status: 400
        }
      );

    }







    const {
      data: page,
      error: pageError

    } = await supabaseAdmin

      .from("knowledge_pages")

      .select("*")

      .eq(
        "id",
        knowledgePageId
      )

      .single();







    if (pageError || !page) {

      return NextResponse.json(
        {
          error:
            pageError?.message ||
            "Knowledge page not found"
        },
        {
          status: 404
        }
      );

    }








    const chunks = splitText(
      page.content
    );








    const insertData = chunks.map(
      (chunk) => ({

        user_id: page.user_id,

        source_url: page.page_url,

        content: chunk

      })
    );









    const {
      error: insertError

    } = await supabaseAdmin

      .from("knowledge_chunks")

      .insert(
        insertData
      );








    if (insertError) {

      throw insertError;

    }








    return NextResponse.json({

      success: true,

      chunksCreated: chunks.length

    });







  } catch (error: any) {


    console.log(
      "CHUNK ERROR:",
      error
    );



    return NextResponse.json(

      {
        error:
          error.message ||
          "Chunk creation failed"
      },

      {
        status: 500
      }

    );


  }

}