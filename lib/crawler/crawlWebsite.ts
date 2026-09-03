import * as cheerio from "cheerio";

import { getSitemapUrls } from "./getSitemapUrls";
import { scoreUrl } from "./scoreUrl";
import { getRenderedHTML } from "@/lib/browser/browser";

// =====================================================
// TYPES
// =====================================================

export type CrawledPage = {
  url: string;
  title: string;
  content: string;
  productData?: any;
  images?: string[];
};

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
}

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================
//
// Sales Pilot can crawl up to 60 pages per crawl.
//
// The API route can request a lower number:
//
// crawlWebsite(url, {
//   maxPages: 20
// })
//
// But never more than 60.
//

const DEFAULT_MAX_PAGES = 60;
const HARD_MAX_PAGES = 60;

const DEFAULT_MAX_DEPTH = 3;

// =====================================================
// URL NORMALIZATION
// =====================================================

function normalizeUrl(
  url: string
): string | null {
  try {
    const parsed =
      new URL(url);

    // Remove fragments.
    parsed.hash = "";

    // Remove tracking/query parameters.
    //
    // This prevents duplicate pages such as:
    //
    // /products/dress
    // /products/dress?utm_source=instagram
    //
    // from being crawled separately.
    parsed.search = "";

    // Remove trailing slash except homepage.
    if (
      parsed.pathname !== "/"
    ) {
      parsed.pathname =
        parsed.pathname.replace(
          /\/$/,
          ""
        );
    }

    return parsed.href;
  } catch {
    return null;
  }
}

// =====================================================
// SAME DOMAIN
// =====================================================

function isSameDomain(
  url1: string,
  url2: string
): boolean {
  try {
    const host1 =
      new URL(url1)
        .hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    const host2 =
      new URL(url2)
        .hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    return host1 === host2;
  } catch {
    return false;
  }
}

// =====================================================
// SKIP URL
// =====================================================

function shouldSkip(
  url: string
): boolean {
  const normalized =
    url.toLowerCase();

  const blockedPaths = [
    "/login",
    "/signin",
    "/sign-in",
    "/signup",
    "/sign-up",
    "/register",
    "/logout",

    "/cart",
    "/checkout",

    "/account",
    "/my-account",

    "/search",

    "/wishlist",

    "/compare",

    "/password",

    "/admin",

    "/wp-admin",

    "/wp-login",

    "/feed",

    "/rss",
  ];

  for (
    const path of blockedPaths
  ) {
    if (
      normalized.includes(path)
    ) {
      return true;
    }
  }

  const blockedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".ico",

    ".pdf",
    ".zip",
    ".rar",

    ".xml",
    ".json",

    ".mp3",
    ".mp4",
    ".avi",
    ".mov",

    ".css",
    ".js",
    ".map",

    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
  ];

  for (
    const extension of blockedExtensions
  ) {
    if (
      normalized.endsWith(
        extension
      )
    ) {
      return true;
    }
  }

  return false;
}

// =====================================================
// CLEAN CONTENT
// =====================================================

function cleanContent(
  text: string
): string {
  return String(text || "")
    .replace(
      /\s+/g,
      " "
    )
    .replace(
      /\n+/g,
      " "
    )
    .trim();
}

// =====================================================
// ADD UNIQUE IMAGE
// =====================================================

function addUniqueImage(
  images: string[],
  imageUrl: unknown,
  baseUrl: string
) {
  if (
    typeof imageUrl !==
      "string" ||
    !imageUrl.trim()
  ) {
    return;
  }

  try {
    const absoluteUrl =
      new URL(
        imageUrl.trim(),
        baseUrl
      ).href;

    if (
      !images.includes(
        absoluteUrl
      )
    ) {
      images.push(
        absoluteUrl
      );
    }
  } catch {
    // Ignore invalid image URL.
  }
}

// =====================================================
// FIND PRODUCT JSON-LD
// =====================================================

function findProductJsonLd(
  value: any
): any {
  if (!value) {
    return null;
  }

  if (
    Array.isArray(value)
  ) {
    for (
      const item of value
    ) {
      const found =
        findProductJsonLd(
          item
        );

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (
    typeof value !==
    "object"
  ) {
    return null;
  }

  const type =
    value["@type"];

  if (
    type === "Product" ||
    (
      Array.isArray(type) &&
      type.includes(
        "Product"
      )
    )
  ) {
    return value;
  }

  for (
    const key of Object.keys(
      value
    )
  ) {
    const found =
      findProductJsonLd(
        value[key]
      );

    if (found) {
      return found;
    }
  }

  return null;
}

// =====================================================
// FETCH PAGE
// =====================================================

async function fetchPage(
  url: string
) {
  // ---------------------------------------------------
  // RENDER PAGE
  // ---------------------------------------------------

  const html =
    await getRenderedHTML(
      url
    );

  const $ =
    cheerio.load(html);

  // ---------------------------------------------------
  // TITLE
  // ---------------------------------------------------

  const title =
    $("title")
      .text()
      .trim() ||
    $("h1")
      .first()
      .text()
      .trim() ||
    "Untitled";

  // ---------------------------------------------------
  // PRODUCT DATA
  // ---------------------------------------------------

  let productData:
    any = null;

  $(
    'script[type="application/ld+json"]'
  ).each(
    (
      _,
      element
    ) => {
      if (productData) {
        return;
      }

      try {
        const raw =
          $(element).html();

        if (!raw) {
          return;
        }

        const parsed =
          JSON.parse(raw);

        const found =
          findProductJsonLd(
            parsed
          );

        if (found) {
          productData =
            found;
        }
      } catch {
        // Invalid JSON-LD.
      }
    }
  );

  // ---------------------------------------------------
  // META
  // ---------------------------------------------------

  const metaDescription =
    $(
      'meta[name="description"]'
    ).attr(
      "content"
    ) ||
    $(
      'meta[property="og:description"]'
    ).attr(
      "content"
    ) ||
    "";

  const ogTitle =
    $(
      'meta[property="og:title"]'
    ).attr(
      "content"
    ) ||
    "";

  const ogImage =
    $(
      'meta[property="og:image"]'
    ).attr(
      "content"
    ) ||
    "";

  // ---------------------------------------------------
  // IMAGES
  // ---------------------------------------------------

  const images:
    string[] = [];

  $("img").each(
    (
      _,
      element
    ) => {
      const src =
        $(element).attr(
          "src"
        ) ||
        $(element).attr(
          "data-src"
        ) ||
        $(element).attr(
          "data-lazy-src"
        ) ||
        $(element).attr(
          "data-original"
        ) ||
        $(element).attr(
          "data-image"
        );

      addUniqueImage(
        images,
        src,
        url
      );
    }
  );

  // Add OG image.
  addUniqueImage(
    images,
    ogImage,
    url
  );

  // ---------------------------------------------------
  // PRODUCT IMAGES
  // ---------------------------------------------------

  if (
    productData?.image
  ) {
    const productImages =
      Array.isArray(
        productData.image
      )
        ? productData.image
        : [
            productData.image,
          ];

    for (
      const image of
        productImages
    ) {
      if (
        typeof image ===
        "string"
      ) {
        addUniqueImage(
          images,
          image,
          url
        );
      }
    }
  }

  // ---------------------------------------------------
  // REMOVE UNWANTED ELEMENTS
  // ---------------------------------------------------

  $(
    "script, style, noscript, svg, header, footer, nav, aside, form"
  ).remove();

  // ---------------------------------------------------
  // MAIN CONTENT
  // ---------------------------------------------------

  let main =
    $("main")
      .text()
      .trim();

  if (!main) {
    main =
      $("article")
        .text()
        .trim();
  }

  if (!main) {
    main =
      $(
        '[role="main"]'
      )
        .text()
        .trim();
  }

  if (!main) {
    main =
      $(".product")
        .text()
        .trim();
  }

  if (!main) {
    main =
      $(".product-page")
        .text()
        .trim();
  }

  if (!main) {
    main =
      $(
        ".product-single"
      )
        .text()
        .trim();
  }

  if (!main) {
    main =
      $("section")
        .first()
        .text()
        .trim();
  }

  if (!main) {
    main =
      $("body")
        .text()
        .trim();
  }

  let content =
    cleanContent(
      main
    );

  // ---------------------------------------------------
  // PRODUCT INFORMATION
  // ---------------------------------------------------

  if (
    productData
  ) {
    const brand =
      typeof productData.brand ===
      "string"
        ? productData.brand
        : productData.brand
            ?.name ||
          "";

    const offers =
      Array.isArray(
        productData.offers
      )
        ? productData.offers[0]
        : productData.offers;

    let availability =
      offers?.availability ||
      "";

    availability =
      String(
        availability
      )
        .replace(
          "http://schema.org/",
          ""
        )
        .replace(
          "https://schema.org/",
          ""
        );

    const productImageList =
      images.length > 0
        ? images.join(
            "\n"
          )
        : typeof productData.image ===
          "string"
        ? productData.image
        : "";

    content +=
      `

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

Images:
${productImageList}

Product URL:
${productData.url ?? url}

=====================================================
`;
  } else {
    content +=
      `

Meta Title:
${ogTitle}

Meta Description:
${metaDescription}

`;
  }

  // ---------------------------------------------------
  // COLLECT LINKS
  // ---------------------------------------------------

  const links:
    string[] = [];

  const linkSet =
    new Set<string>();

  $("a").each(
    (
      _,
      element
    ) => {
      const href =
        $(element).attr(
          "href"
        );

      if (!href) {
        return;
      }

      try {
        const absolute =
          new URL(
            href,
            url
          ).href;

        const normalized =
          normalizeUrl(
            absolute
          );

        if (
          !normalized
        ) {
          return;
        }

        if (
          !isSameDomain(
            url,
            normalized
          )
        ) {
          return;
        }

        if (
          shouldSkip(
            normalized
          )
        ) {
          return;
        }

        if (
          !linkSet.has(
            normalized
          )
        ) {
          linkSet.add(
            normalized
          );

          links.push(
            normalized
          );
        }
      } catch {
        // Ignore invalid links.
      }
    }
  );

  // ---------------------------------------------------
  // DEBUG
  // ---------------------------------------------------

  if (
    productData
  ) {
    console.log(
      "================================="
    );

    console.log(
      "PRODUCT DETECTED"
    );

    console.log(
      "Product:",
      productData.name
    );

    console.log(
      "Product URL:",
      productData.url ??
        url
    );

    console.log(
      "Product Images:",
      images.length
    );

    console.log(
      "Discovered links:",
      links.length
    );

    console.log(
      "================================="
    );
  }

  // ---------------------------------------------------
  // RETURN
  // ---------------------------------------------------

  return {
    title,

    content,

    links,

    productData,

    images,
  };
}

// =====================================================
// CRAWL WEBSITE
// =====================================================

export async function crawlWebsite(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<CrawledPage[]> {
  // ===================================================
  // CONFIGURATION
  // ===================================================

  const requestedMaxPages =
    Number(
      options.maxPages
    );

  const maxPages =
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
          HARD_MAX_PAGES
        )
      : DEFAULT_MAX_PAGES;

  const requestedMaxDepth =
    Number(
      options.maxDepth
    );

  const maxDepth =
    Number.isFinite(
      requestedMaxDepth
    )
      ? Math.min(
          Math.max(
            Math.floor(
              requestedMaxDepth
            ),
            0
          ),
          5
        )
      : DEFAULT_MAX_DEPTH;

  // ===================================================
  // NORMALIZE START URL
  // ===================================================

  const normalizedStartUrl =
    normalizeUrl(
      startUrl
    );

  if (
    !normalizedStartUrl
  ) {
    throw new Error(
      "Invalid website URL."
    );
  }

  // ===================================================
  // DATA STRUCTURES
  // ===================================================

  const visited =
    new Set<string>();

  const queued =
    new Set<string>();

  const results:
    CrawledPage[] = [];

  type QueueItem = {
    url: string;
    depth: number;
    score: number;
  };

  const queue:
    QueueItem[] = [];

  // ===================================================
  // ADD TO QUEUE
  // ===================================================

  function addToQueue(
    url: string,
    depth: number
  ) {
    const normalized =
      normalizeUrl(
        url
      );

    if (
      !normalized
    ) {
      return;
    }

    if (
      !isSameDomain(
        normalizedStartUrl,
        normalized
      )
    ) {
      return;
    }

    if (
      shouldSkip(
        normalized
      )
    ) {
      return;
    }

    if (
      visited.has(
        normalized
      )
    ) {
      return;
    }

    if (
      queued.has(
        normalized
      )
    ) {
      return;
    }

    if (
      depth > maxDepth
    ) {
      return;
    }

    queued.add(
      normalized
    );

    queue.push({
      url: normalized,

      depth,

      score:
        scoreUrl(
          normalized
        ),
    });
  }

  // ===================================================
  // START URL
  // ===================================================

  addToQueue(
    normalizedStartUrl,
    0
  );

  // ===================================================
  // SITEMAP
  // ===================================================

  try {
    const sitemapUrls =
      await getSitemapUrls(
        normalizedStartUrl
      );

    console.log(
      "SITEMAP URLS FOUND:",
      sitemapUrls.length
    );

    for (
      const sitemapUrl of
        sitemapUrls
    ) {
      if (
        queue.length >=
        maxPages * 5
      ) {
        break;
      }

      addToQueue(
        sitemapUrl,
        0
      );
    }
  } catch (
    sitemapError
  ) {
    console.log(
      "SITEMAP DISCOVERY FAILED:"
    );

    console.error(
      sitemapError
    );
  }

  console.log(
    "================================="
  );

  console.log(
    "STARTING WEBSITE CRAWLER"
  );

  console.log(
    "START URL:",
    normalizedStartUrl
  );

  console.log(
    "MAX PAGES:",
    maxPages
  );

  console.log(
    "MAX DEPTH:",
    maxDepth
  );

  console.log(
    "INITIAL QUEUE:",
    queue.length
  );

  console.log(
    "================================="
  );

  // ===================================================
  // CRAWL LOOP
  // ===================================================

  while (
    queue.length > 0 &&
    results.length <
      maxPages
  ) {
    // -------------------------------------------------
    // SORT BY PRIORITY
    // -------------------------------------------------

    queue.sort(
      (
        a,
        b
      ) => {
        // First prioritize URL score.
        if (
          b.score !==
          a.score
        ) {
          return (
            b.score -
            a.score
          );
        }

        // Then shallower pages.
        return (
          a.depth -
          b.depth
        );
      }
    );

    // -------------------------------------------------
    // GET NEXT PAGE
    // -------------------------------------------------

    const current =
      queue.shift();

    if (
      !current
    ) {
      break;
    }

    // -------------------------------------------------
    // REMOVE FROM QUEUED
    // -------------------------------------------------

    queued.delete(
      current.url
    );

    // -------------------------------------------------
    // NORMALIZE
    // -------------------------------------------------

    const normalized =
      normalizeUrl(
        current.url
      );

    if (
      !normalized
    ) {
      continue;
    }

    // -------------------------------------------------
    // DUPLICATE
    // -------------------------------------------------

    if (
      visited.has(
        normalized
      )
    ) {
      continue;
    }

    // -------------------------------------------------
    // DEPTH
    // -------------------------------------------------

    if (
      current.depth >
      maxDepth
    ) {
      continue;
    }

    // -------------------------------------------------
    // BLOCKED
    // -------------------------------------------------

    if (
      shouldSkip(
        normalized
      )
    ) {
      continue;
    }

    // -------------------------------------------------
    // MARK VISITED
    // -------------------------------------------------

    visited.add(
      normalized
    );

    // -------------------------------------------------
    // CRAWL
    // -------------------------------------------------

    try {
      console.log(
        "---------------------------------"
      );

      console.log(
        `CRAWLING ${results.length + 1}/${maxPages}`
      );

      console.log(
        "DEPTH:",
        current.depth
      );

      console.log(
        "URL:",
        normalized
      );

      const page =
        await fetchPage(
          normalized
        );

      // -------------------------------------------------
      // SAVE PAGE
      // -------------------------------------------------

      if (
        page.content &&
        page.content.length >
          100
      ) {
        results.push({
          url:
            normalized,

          title:
            page.title,

          content:
            page.content,

          productData:
            page.productData,

          images:
            page.images,
        });

        console.log(
          "SAVED:",
          page.title
        );

        console.log(
          "TOTAL SAVED:",
          results.length
        );
      } else {
        console.log(
          "PAGE CONTENT TOO SHORT — NOT SAVED"
        );
      }

      // -------------------------------------------------
      // DISCOVER LINKS
      // -------------------------------------------------

      if (
        current.depth <
        maxDepth
      ) {
        for (
          const link of
            page.links
        ) {
          // Stop adding an excessive number of
          // URLs to memory.
          if (
            queue.length >
            maxPages * 10
          ) {
            break;
          }

          addToQueue(
            link,
            current.depth +
              1
          );
        }
      }

      console.log(
        "QUEUE SIZE:",
        queue.length
      );
    } catch (
      error
    ) {
      console.log(
        "FAILED TO CRAWL:",
        normalized
      );

      console.error(
        error
      );
    }
  }

  // ===================================================
  // FINAL RESULT
  // ===================================================

  console.log(
    "================================="
  );

  console.log(
    "WEBSITE CRAWL FINISHED"
  );

  console.log(
    "================================="
  );

  console.log(
    "Pages crawled:",
    results.length
  );

  console.log(
    "Pages requested:",
    maxPages
  );

  console.log(
    "URLs visited:",
    visited.size
  );

  console.log(
    "URLs remaining in queue:",
    queue.length
  );

  console.log(
    "================================="
  );

  return results;
}