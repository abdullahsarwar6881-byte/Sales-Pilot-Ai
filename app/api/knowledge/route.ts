import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { authenticateUser, createUserClient, getAdminClient } from "@/lib/supabase/serverAuth";

export async function POST(request: Request) {
  try {
    const auth = await authenticateUser(request);
    const user = auth?.user;

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const {
      url,
      knowledgeUrlId,
    } = await request.json();

    if (!url || !knowledgeUrlId) {
      return NextResponse.json(
        {
          error:
            "URL and knowledgeUrlId are required"
        },
        {
          status: 400
        }
      );
    }

    const { normalizeUrl, isSafePublicUrl } = await import("@/lib/crawler/normalizeUrl");
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl || !isSafePublicUrl(normalizedUrl)) {
      return NextResponse.json(
        {
          error: "Invalid or disallowed website URL"
        },
        {
          status: 400
        }
      );
    }

    const userId = user.id;
    const supabase = auth.token ? createUserClient(auth.token) : getAdminClient();

    // Fetch website
    const response = await fetch(normalizedUrl);



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