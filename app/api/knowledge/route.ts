import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;



if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local"
  );
}


if (!supabaseKey) {
  throw new Error(
    "Missing Supabase key in .env.local"
  );
}



const supabase = createClient(
  supabaseUrl,
  supabaseKey
);



export async function POST(request: Request) {

  try {


    const {
      url,
      knowledgeUrlId,
      userId

    } = await request.json();



    if (!url || !knowledgeUrlId || !userId) {

      return NextResponse.json(
        {
          error:
            "URL, knowledgeUrlId and userId are required"
        },
        {
          status: 400
        }
      );

    }





    // Fetch website

    const response = await fetch(url);



    if (!response.ok) {

      return NextResponse.json(
        {
          error:
            "Could not fetch website"
        },
        {
          status: 400
        }
      );

    }



    const html = await response.text();




    // Parse HTML

    const $ = cheerio.load(html);



    const title =
      $("title").text() || "Untitled page";



    $("script").remove();

    $("style").remove();




    const content =
      $("body")
        .text()
        .replace(/\s+/g, " ")
        .trim();







    // Save crawled page

    const {
      error: pageError

    } = await supabase

      .from("knowledge_pages")

      .insert({

        user_id: userId,

        knowledge_url_id:
          knowledgeUrlId,

        page_url:
          url,

        title,

        content,

      });






    if (pageError) {

      console.log(pageError);


      return NextResponse.json(
        {
          error:
            pageError.message
        },
        {
          status: 500
        }
      );

    }






    // Update URL status

    const {
      error:updateError

    } = await supabase

      .from("knowledge_urls")

      .update({

        status:
          "completed"

      })

      .eq(
        "id",
        knowledgeUrlId
      );






    if(updateError){

      console.log(updateError);

    }






    return NextResponse.json({

      success:true,

      message:
        "Website crawled successfully"

    });






  } catch(error:any){


    console.log(error);



    return NextResponse.json(

      {

        success:false,

        error:
          error.message ||
          "Crawler failed"

      },

      {

        status:500

      }

    );


  }

}