import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEmbeddings } from "@/lib/ai/embeddings";
import { crawlWebsite } from "@/lib/crawler/crawlWebsite";
import { classifyContent } from "@/lib/ai/classifyContent";
import { closeBrowser } from "@/lib/browser/browser";

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);

    parsed.hash = "";
    parsed.search = "";

    let cleanUrl = parsed.toString();

    if (cleanUrl.endsWith("/")) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    if (cleanUrl.endsWith(".md")) {
      cleanUrl = cleanUrl.replace(".md", "");
    }

    return cleanUrl;
  } catch {
    return url;
  }
}

function splitText(
  text: string,
  size = 1200
) {
  const chunks: string[] = [];

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

export async function POST(
  req: Request
) {
  const requestStart = Date.now();

  try {
    const {
      url,
      knowledgeUrlId,
      crawlJobId,
    } = await req.json();

    if (
      !url ||
      !knowledgeUrlId ||
      !crawlJobId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing URL, knowledge URL ID, or crawl job ID",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

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

    console.log(
      "================================="
    );

    console.log(
      "STARTING WEBSITE CRAWL"
    );

    console.log(
      "URL:",
      url
    );

    console.log(
      "================================="
    );

    // --------------------------------
    // CRAWL WEBSITE
    // --------------------------------

    const crawlStart =
      Date.now();

    const pages =
      await crawlWebsite(url);

    const crawlDuration =
      (Date.now() - crawlStart) /
      1000;

    console.log(
      "================================="
    );

    console.log(
      `WEBSITE CRAWLING TOOK: ${crawlDuration.toFixed(
        2
      )} seconds`
    );

    console.log(
      `WEBSITE CRAWLING TOOK: ${(
        crawlDuration / 60
      ).toFixed(2)} minutes`
    );

    console.log(
      "Pages found:",
      pages.length
    );

    console.log(
      "================================="
    );

    // --------------------------------
    // UPDATE CRAWL JOB
    // --------------------------------

    await supabase
      .from("crawl_jobs")
      .update({
        total_pages:
          pages.length,

        pages_completed: 0,

        started_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        crawlJobId
      );

    let totalChunks = 0;

    let completedPages = 0;

    let totalEmbeddingSeconds = 0;

    let totalClassificationSeconds = 0;

    let totalPageProcessingSeconds = 0;

    // --------------------------------
    // PROCESS EACH PAGE
    // --------------------------------

    for (
      const crawledPage of pages
    ) {
      const pageStart =
        Date.now();

      completedPages++;

      // --------------------------------
      // UPDATE CRAWL PROGRESS
      // --------------------------------

      await supabase
        .from("crawl_jobs")
        .update({
          pages_completed:
            completedPages,

          current_url:
            crawledPage.url,
        })
        .eq(
          "id",
          crawlJobId
        );

      const cleanUrl =
        normalizeUrl(
          crawledPage.url
        );

      console.log(
        "---------------------------------"
      );

      console.log(
        `PROCESSING PAGE ${completedPages}/${pages.length}`
      );

      console.log(
        "URL:",
        cleanUrl
      );

      // --------------------------------
      // DUPLICATE PROTECTION
      // --------------------------------

      const {
        data: existingPage,
      } =
        await supabase
          .from(
            "knowledge_pages"
          )
          .select("id")
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "page_url",
            cleanUrl
          )
          .maybeSingle();

      if (existingPage) {
        console.log(
          "Duplicate skipped:",
          cleanUrl
        );

        continue;
      }

      // --------------------------------
      // AI CLASSIFICATION
      // --------------------------------

      console.log(
        "Classifying page..."
      );

      const classificationStart =
        Date.now();

      let pageType =
        await classifyContent(
          crawledPage.title,
          crawledPage.content
        );

      const classificationDuration =
        (Date.now() -
          classificationStart) /
        1000;

      totalClassificationSeconds +=
        classificationDuration;

      console.log(
        `CLASSIFICATION TOOK: ${classificationDuration.toFixed(
          2
        )} seconds`
      );

      if (!pageType) {
        pageType = "other";
      }

      console.log(
        "AI Page Type:",
        pageType
      );

      // --------------------------------
      // PRODUCT INFORMATION
      // --------------------------------

      if (
        crawledPage.productData
      ) {
        console.log(
          "Structured product detected:"
        );

        console.log({
          name:
            crawledPage
              .productData
              .name,

          price:
            Array.isArray(
              crawledPage
                .productData
                .offers
            )
              ? crawledPage
                  .productData
                  .offers[0]
                  ?.price
              : crawledPage
                  .productData
                  .offers
                  ?.price,

          sku:
            crawledPage
              .productData
              .sku,

          brand:
            typeof crawledPage
              .productData
              .brand ===
            "string"
              ? crawledPage
                  .productData
                  .brand
              : crawledPage
                  .productData
                  .brand
                  ?.name,
        });
      }

      // --------------------------------
      // SAVE PAGE
      // --------------------------------

      const {
        data: page,
        error: pageError,
      } =
        await supabase
          .from(
            "knowledge_pages"
          )
          .insert({
            user_id: user.id,

            knowledge_url_id:
              knowledgeUrlId,

            page_url:
              cleanUrl,

            title:
              crawledPage.title,

            content:
              crawledPage.content,

            page_type:
              pageType,
          })
          .select()
          .single();

      if (pageError) {
        console.error(
          "PAGE ERROR:",
          pageError
        );

        continue;
      }

      console.log(
        "Page saved:",
        page.id
      );

      // --------------------------------
      // CREATE CHUNKS
      // --------------------------------

      /*
       * Product pages stay as ONE chunk.
       *
       * Other pages are split into
       * 1200-character chunks.
       */

      const chunks =
        pageType === "product"
          ? [
              crawledPage.content,
            ]
          : splitText(
              crawledPage.content
            );

      console.log(
        "Chunks generated:",
        chunks.length
      );

      // --------------------------------
      // SAVE CHUNKS
      // --------------------------------

      const chunkRows =
        chunks.map(
          (chunk) => ({
            user_id:
              user.id,

            knowledge_page_id:
              page.id,

            source_url:
              cleanUrl,

            content:
              chunk,
          })
        );

      const {
        data: createdChunks,
        error: chunkError,
      } =
        await supabase
          .from(
            "knowledge_chunks"
          )
          .insert(chunkRows)
          .select();

      if (chunkError) {
        console.error(
          "CHUNK ERROR:",
          chunkError
        );

        continue;
      }

      if (!createdChunks) {
        console.error(
          "No chunks were created."
        );

        continue;
      }

      console.log(
        "Chunks created:",
        createdChunks.length
      );

      totalChunks +=
        createdChunks.length;

      // --------------------------------
      // CREATE EMBEDDINGS
      // --------------------------------

      console.log(
        `Creating ${createdChunks.length} embeddings...`
      );

      const embeddingStart =
        Date.now();

      const embeddings =
        await createEmbeddings(
          createdChunks.map(
            (chunk) =>
              chunk.content
          ),
          3
        );

      const embeddingDuration =
        (Date.now() -
          embeddingStart) /
        1000;

      totalEmbeddingSeconds +=
        embeddingDuration;

      console.log(
        `EMBEDDINGS TOOK: ${embeddingDuration.toFixed(
          2
        )} seconds`
      );

      // --------------------------------
      // SAVE EMBEDDINGS
      // --------------------------------

      for (
        let i = 0;
        i < createdChunks.length;
        i++
      ) {
        const chunk =
          createdChunks[i];

        const embedding =
          embeddings[i];

        const {
          error:
            embeddingError,
        } =
          await supabase
            .from(
              "knowledge_chunks"
            )
            .update({
              embedding,
            })
            .eq(
              "id",
              chunk.id
            );

        if (embeddingError) {
          console.error(
            "Embedding database error:",
            embeddingError
          );
        }
      }

      // --------------------------------
      // PAGE TIMING
      // --------------------------------

      const pageDuration =
        (Date.now() -
          pageStart) /
        1000;

      totalPageProcessingSeconds +=
        pageDuration;

      console.log(
        `PAGE ${completedPages}/${pages.length} TOOK: ${pageDuration.toFixed(
          2
        )} seconds`
      );

      console.log(
        `Page ${completedPages}/${pages.length} completed.`
      );
    }

    // --------------------------------
    // MARK KNOWLEDGE URL COMPLETED
    // --------------------------------

    await supabase
      .from("knowledge_urls")
      .update({
        status: "completed",
      })
      .eq(
        "id",
        knowledgeUrlId
      );

    // --------------------------------
    // MARK CRAWL JOB COMPLETED
    // --------------------------------

    await supabase
      .from("crawl_jobs")
      .update({
        status: "completed",

        pages_completed:
          completedPages,

        finished_at:
          new Date().toISOString(),

        current_url: null,
      })
      .eq(
        "id",
        crawlJobId
      );

    // --------------------------------
    // CLOSE PLAYWRIGHT
    // --------------------------------

    await closeBrowser();

    // --------------------------------
    // FINAL TIMING
    // --------------------------------

    const totalDuration =
      (Date.now() -
        requestStart) /
      1000;

    console.log(
      "================================="
    );

    console.log(
      "WEBSITE CRAWL COMPLETED"
    );

    console.log(
      "================================="
    );

    console.log(
      `Total time: ${totalDuration.toFixed(
        2
      )} seconds`
    );

    console.log(
      `Total time: ${(
        totalDuration / 60
      ).toFixed(2)} minutes`
    );

    console.log(
      `Website crawling: ${crawlDuration.toFixed(
        2
      )} seconds`
    );

    console.log(
      `AI classification: ${totalClassificationSeconds.toFixed(
        2
      )} seconds`
    );

    console.log(
      `Embeddings: ${totalEmbeddingSeconds.toFixed(
        2
      )} seconds`
    );

    console.log(
      `Page processing: ${totalPageProcessingSeconds.toFixed(
        2
      )} seconds`
    );

    console.log(
      `Pages: ${pages.length}`
    );

    console.log(
      `Chunks: ${totalChunks}`
    );

    console.log(
      "================================="
    );

    return NextResponse.json({
      success: true,

      message:
        "Website crawled, AI classified, chunked and embedded successfully.",

      pagesProcessed:
        pages.length,

      chunksCreated:
        totalChunks,

      durationSeconds:
        totalDuration,
    });
  } catch (error: any) {
    console.error(
      "================================="
    );

    console.error(
      "CRAWLER ERROR:",
      error
    );

    console.error(
      "================================="
    );

    await closeBrowser();

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Crawler failed",
      },
      {
        status: 500,
      }
    );
  }
}