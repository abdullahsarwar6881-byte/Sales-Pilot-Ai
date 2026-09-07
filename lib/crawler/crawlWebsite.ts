import { normalizeUrl, isSameDomain, shouldSkipUrl } from "./normalizeUrl";
import { getRobotsRules, isAllowedByRobots, type RobotsRules } from "./robots";
import { getSitemapUrls } from "./getSitemapUrls";
import { scoreUrl } from "./scoreUrl";
import { detectPageType } from "./detectPageType";
import { fetchAndParsePage, type FetchedPageResult } from "./fetchPage";

// =====================================================
// TYPES
// =====================================================

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  pageType?: string;
  metaDescription?: string;
  productData?: any;
  images?: string[];
}

export interface CrawlProgress {
  phase?: "discovering" | "crawling";
  discovered: number;
  queued: number;
  crawling: number;
  crawled: number;
  successful: number;
  failed: number;
  skipped: number;
  elapsedSeconds: number;
  pagesPerSecond: number;
  currentUrl?: string;
  currentPageTitle?: string;
}

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  timeoutMs?: number;
  maxRetries?: number;
  customFetch?: typeof fetch;
  signal?: AbortSignal;
  onProgress?: (progress: CrawlProgress) => void;
  onPageCrawled?: (page: CrawledPage) => Promise<void> | void;
}

export interface CrawlMetrics {
  discoveredCount: number;
  crawledCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  durationSeconds: number;
  pagesPerSecond: number;
  discoverySeconds: number;
}

export interface CrawlWebsiteResult {
  pages: CrawledPage[];
  metrics: CrawlMetrics;
}

// =====================================================
// CONFIGURATION
// =====================================================

export const DEFAULT_CRAWL_CONCURRENCY = 15;
export const DEFAULT_MAX_PAGES = 500;
export const HARD_MAX_PAGES = 1000;
export const DEFAULT_MAX_DEPTH = 3;

interface QueueItem {
  url: string;
  depth: number;
  score: number;
}

// =====================================================
// CRAWL WEBSITE ENGINE
// =====================================================

/**
 * High-performance concurrent website crawler with bounded worker pool,
 * priority queue, sitemap discovery, robots.txt compliance, and incremental processing.
 */
export async function crawlWebsite(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<CrawledPage[]> {
  const result = await crawlWebsiteDetailed(startUrl, options);
  return result.pages;
}

export async function crawlWebsiteDetailed(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<CrawlWebsiteResult> {
  const crawlStart = performance.now();

  const requestedMaxPages = Number(options.maxPages);
  const maxPages = Number.isFinite(requestedMaxPages)
    ? Math.min(Math.max(Math.floor(requestedMaxPages), 1), HARD_MAX_PAGES)
    : DEFAULT_MAX_PAGES;

  const requestedMaxDepth = Number(options.maxDepth);
  const maxDepth = Number.isFinite(requestedMaxDepth)
    ? Math.min(Math.max(Math.floor(requestedMaxDepth), 0), 5)
    : DEFAULT_MAX_DEPTH;

  const envConcurrency = Number(process.env.CRAWL_CONCURRENCY);
  const concurrency =
    options.concurrency ??
    (Number.isFinite(envConcurrency) && envConcurrency > 0 ? envConcurrency : DEFAULT_CRAWL_CONCURRENCY);

  const normalizedStartUrl = normalizeUrl(startUrl);
  if (!normalizedStartUrl) {
    throw new Error("Invalid website start URL.");
  }

  // State Tracking
  const visited = new Set<string>();
  const queued = new Set<string>();
  const results: CrawledPage[] = [];

  const queue: QueueItem[] = [];

  let activeWorkers = 0;
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  function addToQueue(url: string, depth: number, robotsRules?: RobotsRules): boolean {
    const normalized = normalizeUrl(url, normalizedStartUrl);
    if (!normalized) return false;
    if (!isSameDomain(normalizedStartUrl, normalized)) return false;
    if (shouldSkipUrl(normalized)) return false;
    if (robotsRules && !isAllowedByRobots(normalized, robotsRules)) return false;
    if (visited.has(normalized) || queued.has(normalized)) return false;
    if (depth > maxDepth) return false;

    queued.add(normalized);
    queue.push({
      url: normalized,
      depth,
      score: scoreUrl(normalized),
    });
    return true;
  }

  // 1. Initial Start URL & Robots.txt
  const discoveryStart = performance.now();
  let robotsRules: RobotsRules | undefined;
  try {
    robotsRules = await getRobotsRules(normalizedStartUrl);
  } catch {
    // Continue if robots.txt check fails
  }

  addToQueue(normalizedStartUrl, 0, robotsRules);

  // 2. Discover Sitemap URLs
  try {
    const sitemapUrls = await getSitemapUrls(normalizedStartUrl, robotsRules?.sitemaps);
    for (const smUrl of sitemapUrls) {
      if (queue.length >= maxPages * 4) break;
      addToQueue(smUrl, 0, robotsRules);
    }
  } catch (err) {
    console.warn("Sitemap discovery failed:", err);
  }

  const discoverySeconds = (performance.now() - discoveryStart) / 1000;

  console.log(`[CRAWLER] Started crawl for ${normalizedStartUrl}`);
  console.log(`[CRAWLER] Concurrency: ${concurrency}, Max Pages: ${maxPages}, Initial Queue: ${queue.length}`);

  // Initial report during discovery
  if (options.onProgress) {
    options.onProgress({
      phase: "discovering",
      discovered: queued.size + visited.size,
      queued: queue.length,
      crawling: 0,
      crawled: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      elapsedSeconds: Number(((performance.now() - crawlStart) / 1000).toFixed(1)),
      pagesPerSecond: 0,
      currentUrl: normalizedStartUrl,
    });
  }

  // Sort queue by priority score
  function sortQueue() {
    queue.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.depth - b.depth;
    });
  }

  sortQueue();

  let lastActiveUrl: string | undefined = undefined;
  let lastActiveTitle: string | undefined = undefined;

  function reportProgress(activeUrl?: string, activeTitle?: string) {
    if (activeUrl) lastActiveUrl = activeUrl;
    if (activeTitle) lastActiveTitle = activeTitle;

    if (options.onProgress) {
      const elapsed = (performance.now() - crawlStart) / 1000;
      const totalProcessed = successCount + failedCount;
      const pagesPerSec = elapsed > 0 ? Number((totalProcessed / elapsed).toFixed(2)) : 0;

      options.onProgress({
        phase: "crawling",
        discovered: queued.size + visited.size,
        queued: queue.length,
        crawling: activeWorkers,
        crawled: totalProcessed,
        successful: successCount,
        failed: failedCount,
        skipped: skippedCount,
        elapsedSeconds: Number(elapsed.toFixed(1)),
        pagesPerSecond: pagesPerSec,
        currentUrl: lastActiveUrl,
        currentPageTitle: lastActiveTitle,
      });
    }
  }

  // Worker Loop
  async function worker(workerId: number): Promise<void> {
    while (true) {
      if (options.signal?.aborted) break;
      if (results.length >= maxPages) break;

      if (queue.length === 0) {
        if (activeWorkers === 0) {
          // No more active workers and queue is empty -> crawl finished
          break;
        }
        // Wait briefly for other workers to potentially discover new links
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      const item = queue.shift();
      if (!item) continue;

      queued.delete(item.url);

      if (visited.has(item.url)) continue;
      visited.add(item.url);

      activeWorkers++;
      reportProgress(item.url);

      try {
        const pageResult: FetchedPageResult = await fetchAndParsePage(item.url, {
          timeoutMs: options.timeoutMs,
          maxRetries: options.maxRetries,
          customFetch: options.customFetch,
          signal: options.signal,
        });

        if (pageResult.status >= 200 && pageResult.status < 400 && pageResult.content.length >= 40) {
          const pageType = detectPageType(item.url, pageResult.title, Boolean(pageResult.productData));

          const crawledPage: CrawledPage = {
            url: item.url,
            title: pageResult.title,
            content: pageResult.content,
            pageType,
            metaDescription: pageResult.metaDescription,
            productData: pageResult.productData,
            images: pageResult.images,
          };

          if (results.length < maxPages) {
            results.push(crawledPage);
            successCount++;
            reportProgress(item.url, pageResult.title);

            if (options.onPageCrawled) {
              try {
                await options.onPageCrawled(crawledPage);
              } catch (onPageErr) {
                console.error(`Error in onPageCrawled for ${item.url}:`, onPageErr);
              }
            }
          }

          // Discover Internal Links
          if (item.depth < maxDepth && results.length < maxPages) {
            let newlyAdded = 0;
            for (const link of pageResult.links) {
              if (queue.length >= maxPages * 5) break;
              if (addToQueue(link, item.depth + 1, robotsRules)) {
                newlyAdded++;
              }
            }
            if (newlyAdded > 0) {
              sortQueue();
            }
          }
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      } finally {
        activeWorkers--;
        reportProgress();
      }
    }
  }

  // Launch Bounded Worker Pool
  const workerCount = Math.min(concurrency, Math.max(1, queue.length));
  const workerPromises: Promise<void>[] = [];

  for (let i = 0; i < workerCount; i++) {
    workerPromises.push(worker(i + 1));
  }

  await Promise.all(workerPromises);

  const durationSeconds = (performance.now() - crawlStart) / 1000;
  const totalCrawled = successCount + failedCount;
  const pagesPerSec = durationSeconds > 0 ? Number((totalCrawled / durationSeconds).toFixed(2)) : 0;

  console.log(`[CRAWLER] Finished crawl in ${durationSeconds.toFixed(2)}s. Crawled: ${results.length} pages (${pagesPerSec} p/s)`);

  return {
    pages: results,
    metrics: {
      discoveredCount: visited.size + queued.size,
      crawledCount: totalCrawled,
      successCount,
      failedCount,
      skippedCount,
      durationSeconds: Number(durationSeconds.toFixed(2)),
      pagesPerSecond: pagesPerSec,
      discoverySeconds: Number(discoverySeconds.toFixed(2)),
    },
  };
}