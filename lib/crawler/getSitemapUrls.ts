import * as cheerio from "cheerio";
import { normalizeUrl, isSameDomain } from "./normalizeUrl";

const MAX_SITEMAP_URLS = 1000;
const MAX_SITEMAP_DEPTH = 3;

function isXmlUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith(".xml");
  } catch {
    return false;
  }
}

/**
 * Discovers and collects webpage URLs from sitemap.xml and sitemap indexes.
 * Prioritizes product and collection sitemaps.
 */
export async function getSitemapUrls(
  websiteUrl: string,
  extraSitemapUrls: string[] = []
): Promise<string[]> {
  const rootSitemapUrl = new URL("/sitemap.xml", websiteUrl).href;
  const initialSitemaps = [rootSitemapUrl, ...extraSitemapUrls];

  const pageUrls = new Set<string>();
  const visitedSitemaps = new Set<string>();

  async function processSitemap(currentSitemapUrl: string, depth = 0): Promise<void> {
    if (depth > MAX_SITEMAP_DEPTH) return;
    if (pageUrls.size >= MAX_SITEMAP_URLS) return;
    if (visitedSitemaps.has(currentSitemapUrl)) return;

    visitedSitemaps.add(currentSitemapUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(currentSitemapUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SalesPilotBot/1.0; +https://salespilot.ai)",
          Accept: "application/xml,text/xml,*/*",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) return;

      const xml = await response.text();
      if (!xml.trim()) return;

      const $ = cheerio.load(xml, { xmlMode: true });

      // 1. Check for Sitemap Index (<sitemap><loc>...)
      const sitemapEntries = $("sitemap > loc");
      if (sitemapEntries.length > 0) {
        const childSitemaps: string[] = [];

        sitemapEntries.each((_, el) => {
          const val = $(el).text().trim();
          if (!val) return;
          const normalized = normalizeUrl(val);
          if (normalized) childSitemaps.push(normalized);
        });

        // Prioritize pages, policies, and collections before bulk product sitemaps
        childSitemaps.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          function scoreSitemap(s: string) {
            if (s.includes("page") || s.includes("info") || s.includes("contact") || s.includes("policy") || s.includes("support")) return 100;
            if (s.includes("collection") || s.includes("category")) return 80;
            if (s.includes("blog") || s.includes("article") || s.includes("news")) return 60;
            if (s.includes("product")) return 40;
            return 20;
          }
          return scoreSitemap(bLower) - scoreSitemap(aLower);
        });

        for (const child of childSitemaps) {
          if (pageUrls.size >= MAX_SITEMAP_URLS) break;
          await processSitemap(child, depth + 1);
        }
        return;
      }

      // 2. Check for URL entries (<url><loc>...)
      const urlEntries = $("url > loc");
      if (urlEntries.length > 0) {
        urlEntries.each((_, el) => {
          if (pageUrls.size >= MAX_SITEMAP_URLS) return false;
          const val = $(el).text().trim();
          if (!val) return;
          const normalized = normalizeUrl(val);
          if (!normalized) return;
          if (!isSameDomain(normalized, websiteUrl)) return;
          if (isXmlUrl(normalized)) return;

          pageUrls.add(normalized);
        });
        return;
      }

      // 3. Fallback <loc> handling
      const locations = $("loc");
      for (let i = 0; i < locations.length; i++) {
        if (pageUrls.size >= MAX_SITEMAP_URLS) break;
        const val = $(locations[i]).text().trim();
        if (!val) continue;
        const normalized = normalizeUrl(val);
        if (!normalized) continue;

        if (isXmlUrl(normalized)) {
          await processSitemap(normalized, depth + 1);
        } else if (isSameDomain(normalized, websiteUrl)) {
          pageUrls.add(normalized);
        }
      }
    } catch {
      // Gracefully continue on broken sitemap links
    }
  }

  for (const sitemap of initialSitemaps) {
    if (pageUrls.size >= MAX_SITEMAP_URLS) break;
    await processSitemap(sitemap, 0);
  }

  const urls = Array.from(pageUrls);

  // Sort by priority (products > collections > shop > others)
  urls.sort((a, b) => {
    const getPriority = (u: string) => {
      const lower = u.toLowerCase();
      if (lower.includes("/products/")) return 100;
      if (lower.includes("/product/")) return 90;
      if (lower.includes("/shop/")) return 80;
      if (lower.includes("/collections/")) return 70;
      if (lower.includes("/category/")) return 60;
      return 10;
    };
    return getPriority(b) - getPriority(a);
  });

  return urls;
}