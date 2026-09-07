import * as cheerio from "cheerio";
import { normalizeUrl, isSameDomain, shouldSkipUrl } from "./normalizeUrl";

// =====================================================
// TYPES
// =====================================================

export interface FetchedPageResult {
  url: string;
  finalUrl: string;
  status: number;
  title: string;
  content: string;
  metaDescription?: string;
  productData?: any;
  images: string[];
  links: string[];
  error?: string;
  durationMs: number;
}

export interface FetchPageOptions {
  timeoutMs?: number;
  maxRetries?: number;
  maxResponseBytes?: number;
  customFetch?: typeof fetch;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; SalesPilotBot/1.0; +https://salespilot.ai)";

// =====================================================
// PRODUCT JSON-LD FINDER
// =====================================================

function findProductJsonLd(value: any): any {
  if (!value) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProductJsonLd(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== "object") return null;

  const type = value["@type"];
  if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
    return value;
  }

  if (value["@graph"] && Array.isArray(value["@graph"])) {
    return findProductJsonLd(value["@graph"]);
  }

  for (const key of Object.keys(value)) {
    if (typeof value[key] === "object") {
      const found = findProductJsonLd(value[key]);
      if (found) return found;
    }
  }

  return null;
}

function cleanContent(text: string): string {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function addUniqueImage(images: string[], imageUrl: unknown, baseUrl: string): void {
  if (typeof imageUrl !== "string" || !imageUrl.trim()) return;
  try {
    const absolute = new URL(imageUrl.trim(), baseUrl).href;
    if (!images.includes(absolute)) {
      images.push(absolute);
    }
  } catch {
    // Ignore invalid image URL
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =====================================================
// HTTP FETCH PAGE WITH RETRIES
// =====================================================

/**
 * Fetches and parses a single web page via HTTP with bounded timeout,
 * exponential backoff retry for 429 / 5xx, redirect handling, and Cheerio DOM extraction.
 */
export async function fetchAndParsePage(
  targetUrl: string,
  options: FetchPageOptions = {}
): Promise<FetchedPageResult> {
  const start = performance.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const maxBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const fetchFn = options.customFetch ?? globalThis.fetch;

  let attempt = 0;
  let lastStatus = 0;
  let lastError = "";

  while (attempt <= maxRetries) {
    if (options.signal?.aborted) {
      return {
        url: targetUrl,
        finalUrl: targetUrl,
        status: 499,
        title: "",
        content: "",
        images: [],
        links: [],
        error: "Crawl aborted by user",
        durationMs: Math.round(performance.now() - start),
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Merge parent signal with internal timeout
    const abortHandler = () => controller.abort();
    if (options.signal) {
      options.signal.addEventListener("abort", abortHandler, { once: true });
    }

    try {
      const response = await fetchFn(targetUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
      });

      clearTimeout(timeoutId);
      if (options.signal) {
        options.signal.removeEventListener("abort", abortHandler);
      }

      lastStatus = response.status;
      const finalUrl = response.url || targetUrl;

      // Check for permanent failures (4xx except 429) -> do NOT retry
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return {
          url: targetUrl,
          finalUrl,
          status: response.status,
          title: "",
          content: "",
          images: [],
          links: [],
          error: `HTTP ${response.status}`,
          durationMs: Math.round(performance.now() - start),
        };
      }

      // Check for temporary failures (429 or 5xx) -> retry with backoff
      if (response.status === 429 || response.status >= 500) {
        lastError = `HTTP ${response.status}`;
        if (attempt < maxRetries) {
          const backoff = (attempt + 1) * 750;
          await sleep(backoff);
          attempt++;
          continue;
        }
        return {
          url: targetUrl,
          finalUrl,
          status: response.status,
          title: "",
          content: "",
          images: [],
          links: [],
          error: lastError,
          durationMs: Math.round(performance.now() - start),
        };
      }

      // Response OK (200, 304, etc.)
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml") && !contentType.includes("text/plain")) {
        return {
          url: targetUrl,
          finalUrl,
          status: response.status,
          title: "",
          content: "",
          images: [],
          links: [],
          error: `Ignored non-HTML content type: ${contentType}`,
          durationMs: Math.round(performance.now() - start),
        };
      }

      const html = await response.text();

      if (html.length > maxBytes) {
        return {
          url: targetUrl,
          finalUrl,
          status: response.status,
          title: "",
          content: "",
          images: [],
          links: [],
          error: `Response size exceeds limit (${html.length} bytes)`,
          durationMs: Math.round(performance.now() - start),
        };
      }

      // Parse HTML with Cheerio
      const $ = cheerio.load(html);

      const title =
        $("title").text().trim() ||
        $("h1").first().text().trim() ||
        $("meta[property='og:title']").attr("content")?.trim() ||
        "Untitled";

      const metaDescription =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        "";

      const ogImage = $('meta[property="og:image"]').attr("content") || "";

      // Structured Product Data (JSON-LD)
      let productData: any = null;
      $('script[type="application/ld+json"]').each((_, el) => {
        if (productData) return;
        try {
          const raw = $(el).html();
          if (!raw) return;
          const parsed = JSON.parse(raw);
          const found = findProductJsonLd(parsed);
          if (found) {
            productData = found;
          }
        } catch {
          // Ignore JSON-LD parse errors
        }
      });

      // Images
      const images: string[] = [];
      $("img").each((_, el) => {
        const src =
          $(el).attr("src") ||
          $(el).attr("data-src") ||
          $(el).attr("data-lazy-src") ||
          $(el).attr("data-original") ||
          $(el).attr("data-image");
        addUniqueImage(images, src, finalUrl);
      });
      addUniqueImage(images, ogImage, finalUrl);

      if (productData?.image) {
        const pImgs = Array.isArray(productData.image) ? productData.image : [productData.image];
        for (const img of pImgs) {
          if (typeof img === "string") addUniqueImage(images, img, finalUrl);
          else if (typeof img?.url === "string") addUniqueImage(images, img.url, finalUrl);
        }
      }

      // Discover internal links
      const links: string[] = [];
      const linkSet = new Set<string>();

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        const normalizedLink = normalizeUrl(href, finalUrl);
        if (!normalizedLink) return;
        if (!isSameDomain(targetUrl, normalizedLink)) return;
        if (shouldSkipUrl(normalizedLink)) return;

        if (!linkSet.has(normalizedLink)) {
          linkSet.add(normalizedLink);
          links.push(normalizedLink);
        }
      });

      // ---------------------------------------------------
      // Extract Contact Information Before Destructive DOM Cleanup
      // ---------------------------------------------------
      const contactEmails = new Set<string>();
      const contactPhones = new Set<string>();
      const contactWhatsApp = new Set<string>();
      const contactAddresses = new Set<string>();
      const contactOpeningHours = new Set<string>();

      // Mailto links
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr("href") || "";
        const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          contactEmails.add(email.toLowerCase());
        }
      });

      // Tel links
      $('a[href^="tel:"]').each((_, el) => {
        const href = $(el).attr("href") || "";
        const phone = href.replace(/^tel:/i, "").trim();
        if (phone && phone.length >= 7 && phone.length <= 20) {
          contactPhones.add(phone);
        }
      });

      // WhatsApp links
      $('a[href*="wa.me"], a[href*="whatsapp.com"], a[href^="whatsapp:"]').each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        const phoneMatch = href.match(/wa\.me\/(\+?\d+)/i) || href.match(/phone=(\+?\d+)/i);
        if (phoneMatch) {
          contactWhatsApp.add(phoneMatch[1].startsWith("+") ? phoneMatch[1] : `+${phoneMatch[1]}`);
        } else if (text && /[\d+]{8,}/.test(text)) {
          contactWhatsApp.add(text);
        }
      });

      // Extract from Footer, Contact sections, Store info, Forms, and Address elements
      $("footer, [class*='footer'], [class*='contact'], [class*='store-info'], [class*='store_info'], [class*='location'], address, form").each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();

        // Emails
        const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        for (const em of emailMatches) {
          if (!/\.(png|jpg|jpeg|gif|svg|webp|js|css)$/i.test(em)) {
            contactEmails.add(em.toLowerCase());
          }
        }

        // Phone numbers (Pakistani and International patterns)
        const phoneMatches = text.match(/(?:\+92[-.\s]?\d{3}[-.\s]?\d{7}|\+92[-.\s]?3\d{2}[-.\s]?\d{7}|03\d{2}[-.\s]?\d{7}|042[-.\s]?\d{7,8}|021[-.\s]?\d{7,8}|\+?\d{1,4}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4})/g) || [];
        for (const ph of phoneMatches) {
          const cleanPh = ph.trim();
          if (cleanPh.length >= 9 && cleanPh.length <= 20 && !/^\d{14,}$/.test(cleanPh)) {
            if (/whatsapp/i.test(text.slice(Math.max(0, text.indexOf(ph) - 25), text.indexOf(ph) + ph.length + 25))) {
              contactWhatsApp.add(cleanPh);
            } else {
              contactPhones.add(cleanPh);
            }
          }
        }

        // WhatsApp in text
        const waTextMatches = text.match(/whatsapp\s*:\s*([+\d\s-]+)/i);
        if (waTextMatches && waTextMatches[1]) {
          const wNum = waTextMatches[1].trim();
          if (wNum.length >= 8 && wNum.length <= 20) contactWhatsApp.add(wNum);
        }

        // Opening Hours in text
        const hoursMatch = text.match(/(?:working|opening)\s*hours\s*:\s*([^.\n|]{5,60})/i) ||
          text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)[^.\n|]{0,30})/i);
        if (hoursMatch) {
          contactOpeningHours.add(hoursMatch[0].trim());
        }

        // Addresses in text
        const addressMatch = text.match(/(?:building\s*#?\d+|plaza|floor|boulevard|block|road|street|market|commercial\s*zone)[^.\n]{10,120}(?:lahore|karachi|islamabad|rawalpindi|faisalabad|pakistan)/i);
        if (addressMatch) {
          contactAddresses.add(addressMatch[0].trim());
        }
      });

      const hasContactData = contactEmails.size > 0 || contactPhones.size > 0 || contactWhatsApp.size > 0 || contactAddresses.size > 0 || contactOpeningHours.size > 0;
      const lowerUrl = finalUrl.toLowerCase();
      const isContactOrInstitutional =
        lowerUrl.includes("/contact") ||
        lowerUrl.includes("/store-locator") ||
        lowerUrl.includes("/location") ||
        lowerUrl.includes("/stores") ||
        lowerUrl.includes("/about") ||
        lowerUrl.includes("/help") ||
        lowerUrl === targetUrl ||
        lowerUrl.endsWith(".pk/") ||
        lowerUrl.endsWith(".com/") ||
        lowerUrl.endsWith(".com.pk/");

      // Extract Main Content
      $("script, style, noscript, svg, header, footer, nav, aside, form, iframe").remove();

      let main = $("main").text().trim();
      if (!main) main = $("article").text().trim();
      if (!main) main = $('[role="main"]').text().trim();
      if (!main) main = $(".product, .product-single, .product-page").text().trim();
      if (!main) main = $("section").first().text().trim();
      if (!main) main = $("body").text().trim();

      let content = cleanContent(main);

      // Append structured contact block when contact data is present on relevant pages
      if (hasContactData && (isContactOrInstitutional || !productData)) {
        let contactBlock = "\n\n================ CONTACT INFORMATION ================";
        if (contactEmails.size > 0) contactBlock += `\nEmail: ${[...contactEmails].join(", ")}`;
        if (contactPhones.size > 0) contactBlock += `\nPhone: ${[...contactPhones].slice(0, 5).join(", ")}`;
        if (contactWhatsApp.size > 0) contactBlock += `\nWhatsApp: ${[...contactWhatsApp].join(", ")}`;
        if (contactAddresses.size > 0) contactBlock += `\nAddress: ${[...contactAddresses].slice(0, 3).join(" | ")}`;
        if (contactOpeningHours.size > 0) contactBlock += `\nOpening Hours: ${[...contactOpeningHours].join(", ")}`;
        contactBlock += "\n=====================================================\n";
        content += contactBlock;
      }

      // Append structured product info to content if available
      if (productData) {
        const brand = typeof productData.brand === "string" ? productData.brand : productData.brand?.name || "";
        const offers = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
        let availability = offers?.availability || "";
        availability = String(availability).replace("http://schema.org/", "").replace("https://schema.org/", "");

        content += `\n\n================ PRODUCT INFORMATION ================\nProduct Name: ${productData.name ?? ""}\nDescription: ${productData.description ?? metaDescription}\nBrand: ${brand}\nPrice: ${offers?.price ?? ""}\nCurrency: ${offers?.priceCurrency ?? ""}\nAvailability: ${availability}\nSKU: ${productData.sku ?? ""}\nCategory: ${productData.category ?? ""}\nProduct URL: ${productData.url ?? finalUrl}\n=====================================================\n`;
      } else if (metaDescription) {
        content += `\n\nMeta Description: ${metaDescription}\n`;
      }

      return {
        url: targetUrl,
        finalUrl,
        status: response.status,
        title,
        content,
        metaDescription,
        productData,
        images,
        links,
        durationMs: Math.round(performance.now() - start),
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (options.signal) {
        options.signal.removeEventListener("abort", abortHandler);
      }

      lastError = err?.name === "AbortError" ? "Request timed out" : err?.message || "Network error";

      if (attempt < maxRetries && !options.signal?.aborted) {
        const backoff = (attempt + 1) * 750;
        await sleep(backoff);
        attempt++;
        continue;
      }

      return {
        url: targetUrl,
        finalUrl: targetUrl,
        status: 0,
        title: "",
        content: "",
        images: [],
        links: [],
        error: lastError,
        durationMs: Math.round(performance.now() - start),
      };
    }
  }

  return {
    url: targetUrl,
    finalUrl: targetUrl,
    status: lastStatus,
    title: "",
    content: "",
    images: [],
    links: [],
    error: lastError || "Failed after retries",
    durationMs: Math.round(performance.now() - start),
  };
}

