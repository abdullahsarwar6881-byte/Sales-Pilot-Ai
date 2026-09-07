import { NextResponse } from "next/server";
import { authenticateUser, createUserClient, getAdminClient } from "@/lib/supabase/serverAuth";
import { createEmbeddings } from "@/lib/ai/embeddings";
import { crawlWebsiteDetailed, type CrawledPage } from "@/lib/crawler/crawlWebsite";
import { normalizeUrl } from "@/lib/crawler/normalizeUrl";
import { upsertProductVisualIndex } from "@/lib/products/visualIndex";

// =====================================================
// CONFIGURATION
// =====================================================

const DEFAULT_MAX_PAGES = 500;
const HARD_MAX_PAGES = 1000;
const MAX_CHUNKS_PER_PAGE = 50;
const DB_PAGE_BATCH_SIZE = 25;
const DB_CHUNK_BATCH_SIZE = 100;
const EMBEDDING_CONCURRENCY = 4;

function splitText(text: string, size = 1200): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.slice(0, MAX_CHUNKS_PER_PAGE);
}

// =====================================================
// POST /api/crawl
// =====================================================

export async function POST(req: Request) {
  const requestStart = performance.now();

  let crawlJobId: string | null = null;
  let knowledgeUrlId: string | null = null;
  const adminClient = getAdminClient();

  try {
    const body = await req.json();
    const {
      url,
      knowledgeUrlId: requestKnowledgeUrlId,
      crawlJobId: requestCrawlJobId,
      maxPages: requestMaxPages,
      concurrency: requestConcurrency,
    } = body;

    if (!url) {
      return NextResponse.json(
        { error: "Missing website URL" },
        { status: 400 }
      );
    }

    const normalizedTargetUrl = normalizeUrl(url);
    if (!normalizedTargetUrl) {
      return NextResponse.json(
        { error: "Invalid website URL format" },
        { status: 400 }
      );
    }

    // Authenticate server-side
    const auth = await authenticateUser(req);
    const user = auth?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = auth.token ? createUserClient(auth.token) : adminClient;

    // Check for recent genuinely active crawl job for this user to prevent duplicates
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: existingActiveJobs } = await adminClient
      .from("crawl_jobs")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "discovering", "crawling", "processing"])
      .gte("created_at", thirtyMinutesAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingActiveJobs && existingActiveJobs.length > 0) {
      const activeJob = existingActiveJobs[0];
      if (!requestCrawlJobId || requestCrawlJobId !== activeJob.id) {
        console.log(`[CRAWL API] User ${user.id} has active crawl job ${activeJob.id}`);
        return NextResponse.json({
          success: true,
          activeJob,
          message: "A crawl is already in progress for this account.",
        });
      }
    }

    crawlJobId = requestCrawlJobId || null;
    knowledgeUrlId = requestKnowledgeUrlId || null;

    // If crawlJobId wasn't passed, create one using guaranteed schema
    if (!crawlJobId) {
      const { data: newJob, error: newJobErr } = await adminClient
        .from("crawl_jobs")
        .insert({
          user_id: user.id,
          url: normalizedTargetUrl,
          status: "pending",
          total_pages: DEFAULT_MAX_PAGES,
          pages_completed: 0,
          estimated_seconds: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (newJobErr || !newJob) {
        console.error("[CRAWL API] Job creation error:", {
          message: newJobErr?.message,
          code: newJobErr?.code,
        });
        throw new Error(newJobErr?.message || "Failed to create crawl job");
      }
      crawlJobId = newJob.id;
    }

    // Ensure knowledge_urls record exists
    if (!knowledgeUrlId) {
      const { data: kUrl } = await adminClient
        .from("knowledge_urls")
        .insert({
          user_id: user.id,
          url: normalizedTargetUrl,
          status: "scanning",
        })
        .select()
        .single();

      if (kUrl) {
        knowledgeUrlId = kUrl.id;
      }
    }

    // Determine max pages
    const parsedMaxPages = Number(requestMaxPages);
    const crawlMaxPages = Number.isFinite(parsedMaxPages) && parsedMaxPages > 0
      ? Math.min(Math.floor(parsedMaxPages), HARD_MAX_PAGES)
      : DEFAULT_MAX_PAGES;

    const parsedConcurrency = Number(requestConcurrency);
    const crawlConcurrency = Number.isFinite(parsedConcurrency) && parsedConcurrency > 0
      ? Math.min(Math.floor(parsedConcurrency), 25)
      : undefined;

    console.log(`[CRAWL API] Starting crawl for ${normalizedTargetUrl} (Job: ${crawlJobId}, User: ${user.id}, MaxPages: ${crawlMaxPages})`);

    // Update job to "discovering"
    await adminClient
      .from("crawl_jobs")
      .update({
        started_at: new Date().toISOString(),
        status: "discovering",
        url: normalizedTargetUrl,
        total_pages: 0,
        pages_completed: 0,
        estimated_seconds: 0,
        current_url: normalizedTargetUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", crawlJobId);

    // Track progress throttle and smoothed moving average ETA
    let lastProgressUpdate = 0;
    const progressThrottleMs = 1000;
    const crawlStartTime = performance.now();
    let smoothedRemainingSec: number | null = null;
    let recentTimings: number[] = [];
    let lastProcessedCount = 0;
    let lastTimestamp = crawlStartTime;

    // -------------------------------------------------
    // 1. CONCURRENT CRAWL
    // -------------------------------------------------
    const crawlResult = await crawlWebsiteDetailed(normalizedTargetUrl, {
      maxPages: crawlMaxPages,
      concurrency: crawlConcurrency,
      onProgress: async (progress) => {
        const now = performance.now();
        const elapsedSec = (now - crawlStartTime) / 1000;

        // Calculate timing window for recent pages
        if (progress.crawled > lastProcessedCount) {
          const deltaPages = progress.crawled - lastProcessedCount;
          const deltaSec = (now - lastTimestamp) / 1000;
          const rateForDelta = deltaSec / Math.max(deltaPages, 1);
          recentTimings.push(rateForDelta);
          if (recentTimings.length > 8) recentTimings.shift();

          lastProcessedCount = progress.crawled;
          lastTimestamp = now;
        }

        if (now - lastProgressUpdate > progressThrottleMs && crawlJobId) {
          lastProgressUpdate = now;

          const totalDiscovered = Math.max(progress.discovered, 1);
          const totalTarget = Math.min(totalDiscovered, crawlMaxPages);
          const currentCrawled = progress.crawled;

          // Compute smoothed ETA
          if (currentCrawled >= 2 && elapsedSec > 1) {
            const overallRate = elapsedSec / currentCrawled;
            const recentAvgRate = recentTimings.length > 0
              ? recentTimings.reduce((a, b) => a + b, 0) / recentTimings.length
              : overallRate;

            const weightedRate = 0.7 * recentAvgRate + 0.3 * overallRate;
            const remainingPages = Math.max(0, totalTarget - currentCrawled);
            const rawRemainingSec = Math.round(remainingPages * weightedRate);

            if (smoothedRemainingSec === null) {
              smoothedRemainingSec = rawRemainingSec;
            } else {
              smoothedRemainingSec = Math.round(0.6 * smoothedRemainingSec + 0.4 * rawRemainingSec);
            }
          }

          const currentStatus = progress.phase === "discovering" ? "discovering" : "crawling";
          const currentDisplayUrl = progress.currentPageTitle
            ? `${progress.currentPageTitle} (${progress.currentUrl || ""})`
            : progress.currentUrl || null;

          await adminClient
            .from("crawl_jobs")
            .update({
              status: currentStatus,
              total_pages: totalDiscovered,
              pages_completed: currentCrawled,
              current_url: currentDisplayUrl,
              estimated_seconds: smoothedRemainingSec !== null ? Math.max(0, smoothedRemainingSec) : 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", crawlJobId);
        }
      },
    });

    const pages = crawlResult.pages;
    const crawlDurationSec = crawlResult.metrics.durationSeconds;

    console.log(`[CRAWL API] Crawl complete: ${pages.length} pages found in ${crawlDurationSec}s`);

    // Update job status to "processing"
    await adminClient
      .from("crawl_jobs")
      .update({
        status: "processing",
        total_pages: pages.length,
        pages_completed: pages.length,
        estimated_seconds: 5,
        current_url: "Generating AI embeddings & semantic index...",
        updated_at: new Date().toISOString(),
      })
      .eq("id", crawlJobId);

    // -------------------------------------------------
    // 2. BATCH DEDUPLICATION & PAGE PERSISTENCE
    // -------------------------------------------------
    const dbWriteStart = performance.now();

    // Clean up existing page records in batches of 100 URLs to allow fresh updates
    const allNormalizedUrls = pages.map((p) => normalizeUrl(p.url) || p.url);

    for (let i = 0; i < allNormalizedUrls.length; i += 100) {
      const batchUrls = allNormalizedUrls.slice(i, i + 100);
      const { data: existing } = await supabase
        .from("knowledge_pages")
        .select("id, page_url")
        .eq("user_id", user.id)
        .in("page_url", batchUrls);

      if (existing && existing.length > 0) {
        const existingIds = existing.map((r: any) => r.id);
        await supabase.from("knowledge_chunks").delete().in("knowledge_page_id", existingIds);
        await supabase.from("knowledge_pages").delete().in("id", existingIds);
      }
    }

    // Filter out in-run duplicates and empty pages
    const newPagesToInsert: Array<{
      originalPage: CrawledPage;
      cleanUrl: string;
      pageType: string;
    }> = [];

    let skippedDuplicates = 0;
    const seenInRun = new Set<string>();

    for (const crawledPage of pages) {
      const cleanUrl = normalizeUrl(crawledPage.url) || crawledPage.url;
      if (!cleanUrl || seenInRun.has(cleanUrl)) {
        skippedDuplicates++;
        continue;
      }
      seenInRun.add(cleanUrl);

      const content = crawledPage.content?.trim();
      if (!content || content.length < 20) {
        continue;
      }

      newPagesToInsert.push({
        originalPage: crawledPage,
        cleanUrl,
        pageType: crawledPage.pageType || "page",
      });
    }

    console.log(`[CRAWL API] Inserting ${newPagesToInsert.length} updated pages (${skippedDuplicates} in-run duplicates skipped)`);

    // Bulk insert knowledge_pages in batches of DB_PAGE_BATCH_SIZE (25)
    const insertedPages: Array<{
      id: string;
      cleanUrl: string;
      pageType: string;
      content: string;
      originalPage: CrawledPage;
    }> = [];

    for (let i = 0; i < newPagesToInsert.length; i += DB_PAGE_BATCH_SIZE) {
      const batch = newPagesToInsert.slice(i, i + DB_PAGE_BATCH_SIZE);
      const pageRows = batch.map((item) => ({
        user_id: user.id,
        knowledge_url_id: knowledgeUrlId,
        page_url: item.cleanUrl,
        title: item.originalPage.title || item.cleanUrl,
        content: item.originalPage.content,
        page_type: item.pageType,
      }));

      const { data: createdPages, error: pageError } = await supabase
        .from("knowledge_pages")
        .insert(pageRows)
        .select();

      if (pageError || !createdPages) {
        console.error("[CRAWL API] Page batch insert error:", {
          message: pageError?.message,
          code: pageError?.code,
        });
        continue;
      }

      for (let j = 0; j < createdPages.length; j++) {
        insertedPages.push({
          id: createdPages[j].id,
          cleanUrl: batch[j].cleanUrl,
          pageType: batch[j].pageType,
          content: batch[j].originalPage.content,
          originalPage: batch[j].originalPage,
        });
      }

      // Best-effort visual indexing for product pages
      for (const pageItem of batch) {
        if (pageItem.pageType === "product" && pageItem.originalPage.images && pageItem.originalPage.images.length > 0) {
          upsertProductVisualIndex(
            supabase,
            {
              id: pageItem.cleanUrl,
              user_id: user.id,
              productUrl: pageItem.cleanUrl,
              page_url: pageItem.cleanUrl,
              title: pageItem.originalPage.title || "",
              images: pageItem.originalPage.images,
              sku: pageItem.originalPage.productData?.sku || undefined,
            },
            {
              userId: user.id,
              source: "crawler",
            }
          ).catch(() => {});
        }
      }
    }

    // -------------------------------------------------
    // 3. BATCH CHUNKING & CHUNK PERSISTENCE
    // -------------------------------------------------
    const allChunkRows: Array<{
      user_id: string;
      knowledge_page_id: string;
      source_url: string;
      content: string;
    }> = [];

    for (const page of insertedPages) {
      const textChunks = page.pageType === "product" ? [page.content] : splitText(page.content);
      for (const chunk of textChunks) {
        if (chunk.trim().length > 10) {
          allChunkRows.push({
            user_id: user.id,
            knowledge_page_id: page.id,
            source_url: page.cleanUrl,
            content: chunk,
          });
        }
      }
    }

    console.log(`[CRAWL API] Inserting ${allChunkRows.length} chunks in bulk`);

    const createdChunks: Array<{ id: string; content: string }> = [];

    for (let i = 0; i < allChunkRows.length; i += DB_CHUNK_BATCH_SIZE) {
      const batch = allChunkRows.slice(i, i + DB_CHUNK_BATCH_SIZE);
      const { data: chunkData, error: chunkError } = await supabase
        .from("knowledge_chunks")
        .insert(batch)
        .select("id, content");

      if (chunkError || !chunkData) {
        console.error("[CRAWL API] Chunk batch insert error:", {
          message: chunkError?.message,
          code: chunkError?.code,
        });
        continue;
      }

      createdChunks.push(...chunkData);
    }

    const dbWriteSec = (performance.now() - dbWriteStart) / 1000;
    console.log(`[CRAWL API] Database writes complete: ${insertedPages.length} pages, ${createdChunks.length} chunks in ${dbWriteSec.toFixed(2)}s`);

    // -------------------------------------------------
    // 4. BATCHED OPENAI EMBEDDINGS PIPELINE
    // -------------------------------------------------
    const embeddingStart = performance.now();
    let embeddingsGenerated = 0;

    if (createdChunks.length > 0) {
      console.log(`[CRAWL API] Generating embeddings for ${createdChunks.length} chunks using batched pipeline...`);

      try {
        const chunkTexts = createdChunks.map((c) => c.content);
        const embeddings = await createEmbeddings(chunkTexts, EMBEDDING_CONCURRENCY);

        // Bulk update embeddings in Supabase
        const updatePromises: Promise<any>[] = [];

        for (let i = 0; i < createdChunks.length; i++) {
          const emb = embeddings[i];
          if (!emb || emb.length === 0) continue;

          updatePromises.push(
            Promise.resolve(
              supabase
                .from("knowledge_chunks")
                .update({ embedding: emb })
                .eq("id", createdChunks[i].id)
            )
          );

          if (updatePromises.length >= 25) {
            await Promise.all(updatePromises.splice(0, updatePromises.length));
          }
        }

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }

        embeddingsGenerated = embeddings.filter(Boolean).length;
      } catch (embErr: any) {
        console.error("[CRAWL API] Batch embedding generation error (pages still preserved):", {
          message: embErr?.message,
        });
      }
    }

    const embeddingSec = (performance.now() - embeddingStart) / 1000;
    console.log(`[CRAWL API] Embeddings complete: ${embeddingsGenerated} created in ${embeddingSec.toFixed(2)}s`);

    // -------------------------------------------------
    // 5. FINALIZE STATUS
    // -------------------------------------------------
    if (knowledgeUrlId) {
      await adminClient
        .from("knowledge_urls")
        .update({ status: "completed" })
        .eq("id", knowledgeUrlId);
    }

    const totalDurationSec = (performance.now() - requestStart) / 1000;

    await adminClient
      .from("crawl_jobs")
      .update({
        status: "completed",
        pages_completed: insertedPages.length,
        total_pages: insertedPages.length,
        estimated_seconds: 0,
        finished_at: new Date().toISOString(),
        current_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", crawlJobId);

    console.log(`[CRAWL API] Total crawl job finished in ${totalDurationSec.toFixed(2)}s (${(totalDurationSec / 60).toFixed(2)}m)`);

    return NextResponse.json({
      success: true,
      message: "Website crawled, parsed, chunked, and embedded successfully.",
      pagesDiscovered: crawlResult.metrics.discoveredCount,
      pagesProcessed: insertedPages.length,
      pagesSkipped: skippedDuplicates,
      maxPages: crawlMaxPages,
      chunksCreated: createdChunks.length,
      embeddingsCreated: embeddingsGenerated,
      durationSeconds: Number(totalDurationSec.toFixed(2)),
      crawlDurationSeconds: Number(crawlDurationSec.toFixed(2)),
      dbDurationSeconds: Number(dbWriteSec.toFixed(2)),
      embeddingDurationSeconds: Number(embeddingSec.toFixed(2)),
      pagesPerSecond: crawlResult.metrics.pagesPerSecond,
    });
  } catch (error: any) {
    console.error("[CRAWL API] Fatal crawler error:", {
      message: error?.message,
    });

    try {
      if (crawlJobId) {
        await adminClient
          .from("crawl_jobs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            current_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", crawlJobId);
      }

      if (knowledgeUrlId) {
        await adminClient
          .from("knowledge_urls")
          .update({ status: "failed" })
          .eq("id", knowledgeUrlId);
      }
    } catch {}

    return NextResponse.json(
      { error: error?.message || "Crawler failed" },
      { status: 500 }
    );
  }
}