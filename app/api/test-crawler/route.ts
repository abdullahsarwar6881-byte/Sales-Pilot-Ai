import { NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/crawler/crawlWebsite";


export async function POST(req: Request) {

  try {

    const {
      url
    } = await req.json();



    if (!url) {

      return NextResponse.json(
        {
          error:
            "URL is required"
        },
        {
          status:400
        }
      );

    }



    const pages =
      await crawlWebsite(
        url
      );



    return NextResponse.json({

      success:true,

      pagesFound:
        pages.length,

      pages

    });



  } catch(error:any) {


    console.error(
      "TEST CRAWLER ERROR:",
      error
    );


    return NextResponse.json(
      {
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