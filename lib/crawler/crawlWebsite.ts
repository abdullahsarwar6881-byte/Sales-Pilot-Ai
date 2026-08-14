import * as cheerio from "cheerio";
import { getSitemapUrls } from "./getSitemapUrls";
import { scoreUrl } from "./scoreUrl";
import { getRenderedHTML } from "@/lib/browser/browser";

type CrawledPage = {
  url: string;
  title: string;
  content: string;
  productData?: any;
};

const MAX_PAGES = 30;
const MAX_DEPTH = 2;

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);

    parsed.hash = "";
    parsed.search = "";

    if (parsed.pathname !== "/") {
      parsed.pathname = parsed.pathname.replace(/\/$/, "");
    }

    return parsed.href;
  } catch {
    return null;
  }
}

function isSameDomain(
  url1: string,
  url2: string
) {
  return (
    new URL(url1).hostname ===
    new URL(url2).hostname
  );
}

function shouldSkip(url: string) {
  const blocked = [
    "/login",
    "/signup",
    "/cart",
    "/checkout",
    "/account",
    "/search",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".svg",
    ".pdf",
    ".zip",
    ".xml",
  ];

  return blocked.some((item) =>
    url.toLowerCase().includes(item)
  );
}

function cleanContent(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

async function fetchPage(url: string) {
  // Render page with Playwright
  const html = await getRenderedHTML(url);

  const $ = cheerio.load(html);

  const title =
    $("title").text().trim() || "Untitled";

  let productData: any = null;

  // -----------------------------
  // Extract JSON-LD Product
  // -----------------------------

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();

      if (!raw) return;

      const parsed = JSON.parse(raw);

      const searchProduct = (obj: any): any => {
        if (!obj) return null;

        if (Array.isArray(obj)) {
          for (const item of obj) {
            const result = searchProduct(item);
            if (result) return result;
          }
        }

        if (typeof obj === "object") {
          if (
            obj["@type"] === "Product" ||
            (Array.isArray(obj["@type"]) &&
              obj["@type"].includes("Product"))
          ) {
            return obj;
          }

          for (const key in obj) {
            const result = searchProduct(obj[key]);

            if (result) return result;
          }
        }

        return null;
      };

      const found = searchProduct(parsed);

      if (found && !productData) {
        productData = found;
      }
    } catch {}
  });

  // -----------------------------
  // Remove unwanted HTML
  // -----------------------------

  $(
    "script,style,noscript,svg,header,footer,nav,aside,form"
  ).remove();

  // -----------------------------
  // Extract Main Content
  // -----------------------------

  let main = $("main").text();

  if (!main) {
    main = $("article").text();
  }

  if (!main) {
    main = $('[role="main"]').text();
  }

  if (!main) {
    main = $(".product").text();
  }

  if (!main) {
    main = $("section").first().text();
  }

  if (!main) {
    main = $("body").text();
  }

  let content = cleanContent(main);

  // -----------------------------
  // Meta Tags
  // -----------------------------

  const metaDescription =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const ogTitle =
    $('meta[property="og:title"]').attr("content") || "";

  const ogImage =
    $('meta[property="og:image"]').attr("content") || "";

  // -----------------------------
  // Structured Product Data
  // -----------------------------

  if (productData) {
    const brand =
      typeof productData.brand === "string"
        ? productData.brand
        : productData.brand?.name ?? "";

    const offers = Array.isArray(productData.offers)
      ? productData.offers[0]
      : productData.offers;

    const availability =
      offers?.availability
        ?.replace("http://schema.org/", "")
        ?.replace("https://schema.org/", "") ?? "";

    content += `

================ PRODUCT INFORMATION ================

Product Name:
${productData.name ?? ""}

Description:
${productData.description ?? metaDescription}

Brand:
${brand}

Price:
${offers?.price ?? ""}

Currency:
${offers?.priceCurrency ?? ""}

Availability:
${availability}

SKU:
${productData.sku ?? ""}

Category:
${productData.category ?? ""}

Rating:
${productData.aggregateRating?.ratingValue ?? ""}

Reviews:
${productData.aggregateRating?.reviewCount ?? ""}

Image:
${productData.image ?? ogImage}

Product URL:
${productData.url ?? url}

=====================================================
`;
  } else {
    content += `

Meta Title:
${ogTitle}

Meta Description:
${metaDescription}
`;
  }

  // -----------------------------
  // Collect Links
  // -----------------------------

  const links: string[] = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href");

    if (!href) return;

    try {
      const absolute = new URL(href, url).href;

      links.push(absolute);
    } catch {}
  });

  return {
    title,
    content,
    links,
    productData,
  };
}
export async function crawlWebsite(startUrl: string) {
  const visited = new Set<string>();

  const results: CrawledPage[] = [];

  const sitemapUrls =
    await getSitemapUrls(startUrl);

  const queue =
    sitemapUrls.length > 0
      ? sitemapUrls.map((url) => ({
          url,
          depth: 0,
        }))
      : [
          {
            url: startUrl,
            depth: 0,
          },
        ];

  console.log(
    "Initial queue size:",
    queue.length
  );

  while (
    queue.length > 0 &&
    results.length < MAX_PAGES
  ) {

    // Highest priority URLs first
    queue.sort(
      (a, b) =>
        scoreUrl(b.url) -
        scoreUrl(a.url)
    );

    const current = queue.shift();

    if (!current) {
      break;
    }

    const normalized =
      normalizeUrl(current.url);

    if (!normalized) {
      continue;
    }

    if (visited.has(normalized)) {
      continue;
    }

    if (
      current.depth >
      MAX_DEPTH
    ) {
      continue;
    }

    if (
      shouldSkip(normalized)
    ) {
      continue;
    }

    visited.add(normalized);

    try {

      console.log(
        "Crawling:",
        normalized
      );

      const page =
        await fetchPage(normalized);

      if (
        page.content &&
        page.content.length > 100
      ) {

        results.push({

          url: normalized,

          title: page.title,

          content: page.content,

          productData:
            page.productData,

        });

        console.log(
          "Saved:",
          page.title
        );

      }

      // Discover new pages
      for (const link of page.links) {

        if (
          !isSameDomain(
            startUrl,
            link
          )
        ) {
          continue;
        }

        const clean =
          normalizeUrl(link);

        if (!clean) {
          continue;
        }

        if (
          visited.has(clean)
        ) {
          continue;
        }

        if (
          shouldSkip(clean)
        ) {
          continue;
        }

        queue.push({
          url: clean,
          depth:
            current.depth + 1,
        });

      }

    } catch (error) {

      console.log(
        "Skipped:",
        normalized
      );

      console.error(error);

    }

  }

  console.log(
    "Total pages crawled:",
    results.length
  );

  return results;
}