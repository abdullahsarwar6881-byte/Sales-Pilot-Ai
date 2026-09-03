import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEmbeddings } from "@/lib/ai/embeddings";
import { crawlWebsite } from "@/lib/crawler/crawlWebsite";
import { classifyContent } from "@/lib/ai/classifyContent";
import { detectPageType } from "@/lib/crawler/detectPageType";
import { closeBrowser } from "@/lib/browser/browser";
import { upsertProductVisualIndex } from "@/lib/products/visualIndex";

// =====================================================
// CONFIGURATION
// =====================================================

// Maximum number of pages Sales Pilot will process
// during one website crawl.
//
// Keep this here as the default product limit.
// The crawler itself should also enforce the limit.
const DEFAULT_MAX_PAGES = 60;

// Maximum chunks generated from one page.
// This protects the system from extremely large pages.
const MAX_CHUNKS_PER_PAGE = 50;

// =====================================================
// NORMALIZE URL
// =====================================================

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove fragments.
    parsed.hash = "";

    // Remove query parameters.
    //
    // This prevents URLs such as:
    //
    // /product?id=1
    // /product?id=2
    //
    // from becoming separate pages.
    parsed.search = "";

    let cleanUrl = parsed.toString();

    // Remove trailing slash.
    if (cleanUrl.endsWith("/")) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    // Remove .md when present.
    if (cleanUrl.endsWith(".md")) {
      cleanUrl = cleanUrl.replace(/\.md$/, "");
    }

    return cleanUrl;
  } catch {
    return url;
  }
}

// =====================================================
// SPLIT TEXT
// =====================================================

function splitText(
  text: string,
  size = 1200
): string[] {
  if (!text) {
    return [];
  }

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

  return chunks.slice(
    0,
    MAX_CHUNKS_PER_PAGE
  );
}

// =====================================================
// SAFE PAGE TYPE
// =====================================================

function normalizePageType(
  pageType: unknown
): string {
  if (
    typeof pageType !== "string" ||
    !pageType.trim()
  ) {
    return "other";
  }

  return pageType.trim().toLowerCase();
}

// =====================================================
// POST
// =====================================================

export async function POST(
  req: Request
) {
  const requestStart =
    Date.now();

  let crawlJobId: string | null =
    null;

  let knowledgeUrlId: string | null =
    null;

  try {
    // =================================================
    // REQUEST BODY
    // =================================================

    const body =
      await req.json();

    const {
      url,
      knowledgeUrlId:
        requestKnowledgeUrlId,
      crawlJobId:
        requestCrawlJobId,
      maxPages,
    } = body;

    crawlJobId =
      requestCrawlJobId ||
      null;

    knowledgeUrlId =
      requestKnowledgeUrlId ||
      null;

    // =================================================
    // VALIDATION
    // =================================================

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

    // =================================================
    // AUTHENTICATION
    // =================================================

    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    // =================================================
    // PAGE LIMIT
    // =================================================
    //
    // We allow a caller to request a lower limit,
    // but never allow more than 60 from this route.
    //
    // Example:
    //
    // maxPages: 20 → 20
    // maxPages: 60 → 60
    // maxPages: 500 → 60
    //
    // =================================================

    const requestedMaxPages =
      Number(maxPages);

    const crawlMaxPages =
      Number.isFinite(
        requestedMaxPages
      )
        ? Math.min(
            Math.max(
              Math.floor(
                requestedMaxPages
              ),
              1
            ),
            DEFAULT_MAX_PAGES
          )
        : DEFAULT_MAX_PAGES;

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
      "MAX PAGES:",
      crawlMaxPages
    );

    console.log(
      "USER:",
      user.id
    );

    console.log(
      "================================="
    );

    // =================================================
    // CRAWL WEBSITE
    // =================================================

    const crawlStart =
      Date.now();

    const pages =
      await crawlWebsite(
        url,
        {
          maxPages:
            crawlMaxPages,
        }
      );

    const crawlDuration =
      (Date.now() -
        crawlStart) /
      1000;

    // =================================================
    // SAFETY LIMIT
    // =================================================
    //
    // Even if the crawler accidentally returns more
    // pages, this route will never process more than
    // the configured maximum.
    //
    // =================================================

    const pagesToProcess =
      Array.isArray(pages)
        ? pages.slice(
            0,
            crawlMaxPages
          )
        : [];

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
      "Pages returned:",
      pages.length
    );

    console.log(
      "Pages to process:",
      pagesToProcess.length
    );

    console.log(
      "================================="
    );

    // =================================================
    // UPDATE CRAWL JOB
    // =================================================

    await supabase
      .from("crawl_jobs")
      .update({
        total_pages:
          pagesToProcess.length,

        pages_completed:
          0,

        started_at:
          new Date().toISOString(),

        current_url:
          null,

        status:
          "processing",
      })
      .eq(
        "id",
        crawlJobId
      );

    // =================================================
    // METRICS
    // =================================================

    let totalChunks = 0;

    let completedPages = 0;

    let totalEmbeddingSeconds =
      0;

    let totalClassificationSeconds =
      0;

    let totalPageProcessingSeconds =
      0;

    let skippedPages = 0;

    // =================================================
    // PROCESS EACH PAGE
    // =================================================

    for (
      const crawledPage of
        pagesToProcess
    ) {
      const pageStart =
        Date.now();

      completedPages++;

      // =================================================
      // BASIC PAGE VALIDATION
      // =================================================

      if (
        !crawledPage ||
        !crawledPage.url
      ) {
        skippedPages++;

        console.log(
          "Skipping invalid crawled page."
        );

        continue;
      }

      // =================================================
      // CLEAN URL
      // =================================================

      const cleanUrl =
        normalizeUrl(
          crawledPage.url
        );

      // =================================================
      // UPDATE PROGRESS
      // =================================================

      await supabase
        .from("crawl_jobs")
        .update({
          pages_completed:
            completedPages,

          current_url:
            cleanUrl,
        })
        .eq(
          "id",
          crawlJobId
        );

      console.log(
        "---------------------------------"
      );

      console.log(
        `PROCESSING PAGE ${completedPages}/${pagesToProcess.length}`
      );

      console.log(
        "URL:",
        cleanUrl
      );

      // =================================================
      // DUPLICATE PROTECTION
      // =================================================

      const {
        data:
          existingPage,
      } =
        await supabase
          .from(
            "knowledge_pages"
          )
          .select(
            "id"
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "page_url",
            cleanUrl
          )
          .maybeSingle();

      if (
        existingPage
      ) {
        skippedPages++;

        console.log(
          "Duplicate skipped:",
          cleanUrl
        );

        continue;
      }

      // =================================================
      // PAGE CONTENT VALIDATION
      // =================================================

      const pageContent =
        typeof crawledPage.content ===
        "string"
          ? crawledPage.content.trim()
          : "";

      if (!pageContent) {
        skippedPages++;

        console.log(
          "Empty page skipped:",
          cleanUrl
        );

        continue;
      }

      // =================================================
      // PAGE TYPE DETECTION
      // =================================================

      console.log(
        "Detecting page type..."
      );

      const classificationStart =
        Date.now();

      let pageType =
        normalizePageType(
          detectPageType(
            crawledPage.url,
            crawledPage.title
          )
        );

      // =================================================
      // AI CLASSIFICATION FALLBACK
      // =================================================

      if (
        pageType === "page"
      ) {
        console.log(
          "Fast detector could not determine page type."
        );

        console.log(
          "Using AI classifier..."
        );

        try {
          pageType =
            normalizePageType(
              await classifyContent(
                crawledPage.title,
                pageContent
              )
            );
        } catch (
          classificationError
        ) {
          console.error(
            "AI CLASSIFICATION ERROR:",
            classificationError
          );

          pageType =
            "other";
        }

        console.log(
          "AI Page Type:",
          pageType
        );
      } else {
        console.log(
          `Fast page type detected: ${pageType}`
        );
      }

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

      // =================================================
      // STRUCTURED PRODUCT INFORMATION
      // =================================================

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

      // =================================================
      // SAVE PAGE
      // =================================================

      const {
        data: page,
        error:
          pageError,
      } =
        await supabase
          .from(
            "knowledge_pages"
          )
          .insert({
            user_id:
              user.id,

            knowledge_url_id:
              knowledgeUrlId,

            page_url:
              cleanUrl,

            title:
              crawledPage.title ||
              cleanUrl,

            content:
              pageContent,

            page_type:
              pageType,
          })
          .select()
          .single();

      if (
        pageError ||
        !page
      ) {
        console.error(
          "PAGE ERROR:",
          pageError
        );

        skippedPages++;

        continue;
      }

      console.log(
        "Page saved:",
        page.id
      );

      // =================================================
      // PRODUCT PAGE VISUAL INDEX (best-effort)
      // =================================================
      if (
        pageType === "product" &&
        crawledPage.images &&
        crawledPage.images.length > 0
      ) {
        await upsertProductVisualIndex(
          supabase,
          {
            id: page.id,
            user_id: user.id,
            productUrl: cleanUrl,
            page_url: cleanUrl,
            title: crawledPage.title || "",
            images: crawledPage.images,
            sku: crawledPage.productData?.sku || undefined,
          },
          {
            userId: user.id,
            source: "crawler",
          }
        ).catch((e) => {
          console.error(
            "CRAWL PRODUCT VISUAL INDEX ERROR:",
            e?.message || e
          );
        });
      }

      // =================================================
      // CREATE CHUNKS
      // =================================================

      /*
       * Product pages stay as one chunk.
       *
       * Other pages are split into chunks.
       */

      const chunks =
        pageType ===
        "product"
          ? [
              pageContent,
            ]
          : splitText(
              pageContent
            );

      if (
        chunks.length ===
        0
      ) {
        console.log(
          "No chunks generated."
        );

        continue;
      }

      console.log(
        "Chunks generated:",
        chunks.length
      );

      // =================================================
      // SAVE CHUNKS
      // =================================================

      const chunkRows =
        chunks.map(
          (
            chunk
          ) => ({
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
        data:
          createdChunks,
        error:
          chunkError,
      } =
        await supabase
          .from(
            "knowledge_chunks"
          )
          .insert(
            chunkRows
          )
          .select();

      if (
        chunkError
      ) {
        console.error(
          "CHUNK ERROR:",
          chunkError
        );

        continue;
      }

      if (
        !createdChunks ||
        createdChunks.length ===
          0
      ) {
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

      // =================================================
      // CREATE EMBEDDINGS
      // =================================================

      console.log(
        `Creating ${createdChunks.length} embeddings...`
      );

      const embeddingStart =
        Date.now();

      let embeddings: any[] =
        [];

      try {
        embeddings =
          await createEmbeddings(
            createdChunks.map(
              (
                chunk
              ) =>
                chunk.content
            ),
            3
          );
      } catch (
        embeddingError
      ) {
        console.error(
          "EMBEDDING ERROR:",
          embeddingError
        );

        continue;
      }

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

      // =================================================
      // SAVE EMBEDDINGS
      // =================================================

      for (
        let i = 0;
        i <
        createdChunks.length;
        i++
      ) {
        const chunk =
          createdChunks[i];

        const embedding =
          embeddings[i];

        if (
          !embedding
        ) {
          console.error(
            "Missing embedding for chunk:",
            chunk.id
          );

          continue;
        }

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

        if (
          embeddingError
        ) {
          console.error(
            "Embedding database error:",
            embeddingError
          );
        }
      }

      // =================================================
      // PAGE TIMING
      // =================================================

      const pageDuration =
        (Date.now() -
          pageStart) /
        1000;

      totalPageProcessingSeconds +=
        pageDuration;

      console.log(
        `PAGE ${completedPages}/${pagesToProcess.length} TOOK: ${pageDuration.toFixed(
          2
        )} seconds`
      );

      console.log(
        `Page ${completedPages}/${pagesToProcess.length} completed.`
      );
    }

    // =================================================
    // MARK KNOWLEDGE URL COMPLETED
    // =================================================

    await supabase
      .from(
        "knowledge_urls"
      )
      .update({
        status:
          "completed",
      })
      .eq(
        "id",
        knowledgeUrlId
      );

    // =================================================
    // MARK CRAWL JOB COMPLETED
    // =================================================

    await supabase
      .from(
        "crawl_jobs"
      )
      .update({
        status:
          "completed",

        pages_completed:
          completedPages,

        finished_at:
          new Date().toISOString(),

        current_url:
          null,
      })
      .eq(
        "id",
        crawlJobId
      );

    // =================================================
    // CLOSE BROWSER
    // =================================================

    await closeBrowser();

    // =================================================
    // FINAL TIMING
    // =================================================

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
      `Pages discovered: ${pages.length}`
    );

    console.log(
      `Pages processed: ${completedPages}`
    );

    console.log(
      `Pages skipped: ${skippedPages}`
    );

    console.log(
      `Chunks: ${totalChunks}`
    );

    console.log(
      `Maximum allowed pages: ${crawlMaxPages}`
    );

    console.log(
      "================================="
    );

    return NextResponse.json({
      success:
        true,

      message:
        "Website crawled, classified, chunked and embedded successfully.",

      pagesDiscovered:
        pages.length,

      pagesProcessed:
        completedPages,

      pagesSkipped:
        skippedPages,

      maxPages:
        crawlMaxPages,

      chunksCreated:
        totalChunks,

      durationSeconds:
        Number(
          totalDuration.toFixed(
            2
          )
        ),
    });
  } catch (
    error: any
  ) {
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

    // =================================================
    // MARK JOB FAILED
    // =================================================

    try {
      if (
        crawlJobId
      ) {
        await (
          await createClient()
        )
          .from(
            "crawl_jobs"
          )
          .update({
            status:
              "failed",

            finished_at:
              new Date().toISOString(),

            current_url:
              null,
          })
          .eq(
            "id",
            crawlJobId
          );
      }

      if (
        knowledgeUrlId
      ) {
        await (
          await createClient()
        )
          .from(
            "knowledge_urls"
          )
          .update({
            status:
              "failed",
          })
          .eq(
            "id",
            knowledgeUrlId
          );
      }
    } catch (
      statusError
    ) {
      console.error(
        "FAILED TO UPDATE CRAWL STATUS:",
        statusError

      );
    }

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