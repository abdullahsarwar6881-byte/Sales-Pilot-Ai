import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createEmbedding } from "@/lib/ai/embeddings";


const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);



export async function POST(
  req: Request
) {

  try {


    const {
      question
    } = await req.json();




    if(!question){

      return NextResponse.json(
        {
          error:
            "Question is required"
        },
        {
          status:400
        }
      );

    }





    // Create embedding for user question

    const embedding =
      await createEmbedding(
        question
      );






    // Search knowledge chunks
    // Now returns page information also

    const {
      data,
      error

    } =
      await supabaseAdmin.rpc(

        "match_knowledge_chunks",

        {

          query_embedding:
            embedding,


          match_count:
            5

        }

      );






    if(error){

      throw error;

    }






    return NextResponse.json({

      success:true,


      matches:
        data || []


    });






  } catch(error:any){



    console.error(
      "SEARCH ERROR:",
      error
    );




    return NextResponse.json(

      {

        success:false,


        error:
          error.message

      },

      {

        status:500

      }

    );


  }


}