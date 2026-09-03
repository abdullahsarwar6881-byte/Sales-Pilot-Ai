import * as cheerio from "cheerio";

const MAX_SITEMAP_URLS = 500;
const MAX_SITEMAP_DEPTH = 3;

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);

    parsed.hash = "";

    return parsed.href;
  } catch {
    return null;
  }
}

function isXmlUrl(url: string) {
  try {
    const parsed = new URL(url);

    return parsed.pathname
      .toLowerCase()
      .endsWith(".xml");
  } catch {
    return false;
  }
}

function isSameDomain(
  url: string,
  websiteUrl: string
) {
  try {
    const urlHost = new URL(
      url
    ).hostname.replace(/^www\./, "");

    const websiteHost =
      new URL(
        websiteUrl
      ).hostname.replace(
        /^www\./,
        ""
      );

    return urlHost === websiteHost;
  } catch {
    return false;
  }
}

export async function getSitemapUrls(
  websiteUrl: string
) {
  const sitemapUrl = new URL(
    "/sitemap.xml",
    websiteUrl
  ).href;

  console.log(
    "================================="
  );

  console.log(
    "CHECKING WEBSITE SITEMAP"
  );

  console.log(
    "Root sitemap:",
    sitemapUrl
  );

  console.log(
    "================================="
  );

  const pageUrls =
    new Set<string>();

  const visitedSitemaps =
    new Set<string>();

  async function processSitemap(
    currentSitemapUrl: string,
    depth = 0
  ) {
    if (
      depth >
      MAX_SITEMAP_DEPTH
    ) {
      console.log(
        "Maximum sitemap depth reached:",
        currentSitemapUrl
      );

      return;
    }

    if (
      pageUrls.size >=
      MAX_SITEMAP_URLS
    ) {
      return;
    }

    if (
      visitedSitemaps.has(
        currentSitemapUrl
      )
    ) {
      return;
    }

    visitedSitemaps.add(
      currentSitemapUrl
    );

    try {
      console.log(
        "Reading sitemap:",
        currentSitemapUrl
      );

      const response =
        await fetch(
          currentSitemapUrl,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; SalesPilotBot/1.0)",
              Accept:
                "application/xml,text/xml,*/*",
            },
          }
        );

      console.log(
        "Sitemap HTTP status:",
        response.status
      );

      if (!response.ok) {
        console.log(
          "Could not read sitemap:",
          currentSitemapUrl
        );

        return;
      }

      const xml =
        await response.text();

      if (!xml.trim()) {
        console.log(
          "Empty sitemap:",
          currentSitemapUrl
        );

        return;
      }

      const $ = cheerio.load(
        xml,
        {
          xmlMode: true,
        }
      );

      // --------------------------------
      // SITEMAP INDEX
      // --------------------------------

      const sitemapEntries =
        $("sitemap > loc");

      if (
        sitemapEntries.length >
        0
      ) {
        console.log(
          "Sitemap index detected."
        );

        console.log(
          "Child sitemaps:",
          sitemapEntries.length
        );

        const childSitemaps: string[] =
          [];

        sitemapEntries.each(
          (_, element) => {
            const value =
              $(element)
                .text()
                .trim();

            if (!value) {
              return;
            }

            const normalized =
              normalizeUrl(value);

            if (
              normalized
            ) {
              childSitemaps.push(
                normalized
              );
            }
          }
        );

        // --------------------------------
        // PRIORITIZE PRODUCT SITEMAPS
        // --------------------------------

        childSitemaps.sort(
          (a, b) => {
            const aLower =
              a.toLowerCase();

            const bLower =
              b.toLowerCase();

            const aPriority =
              aLower.includes(
                "product"
              )
                ? 1
                : 0;

            const bPriority =
              bLower.includes(
                "product"
              )
                ? 1
                : 0;

            return (
              bPriority -
              aPriority
            );
          }
        );

        for (
          const childSitemap of
          childSitemaps
        ) {
          if (
            pageUrls.size >=
            MAX_SITEMAP_URLS
          ) {
            break;
          }

          await processSitemap(
            childSitemap,
            depth + 1
          );
        }

        return;
      }

      // --------------------------------
      // NORMAL URLSET SITEMAP
      // --------------------------------

      const urlEntries =
        $("url > loc");

      if (
        urlEntries.length >
        0
      ) {
        console.log(
          "URL sitemap detected."
        );

        console.log(
          "URLs in sitemap:",
          urlEntries.length
        );

        urlEntries.each(
          (_, element) => {
            if (
              pageUrls.size >=
              MAX_SITEMAP_URLS
            ) {
              return false;
            }

            const value =
              $(element)
                .text()
                .trim();

            if (!value) {
              return;
            }

            const normalized =
              normalizeUrl(value);

            if (!normalized) {
              return;
            }

            if (
              !isSameDomain(
                normalized,
                websiteUrl
              )
            ) {
              return;
            }

            // Never return another XML
            // sitemap as a webpage.
            if (
              isXmlUrl(
                normalized
              )
            ) {
              return;
            }

            pageUrls.add(
              normalized
            );
          }
        );

        console.log(
          "Total page URLs collected:",
          pageUrls.size
        );

        return;
      }

      // --------------------------------
      // FALLBACK LOC HANDLING
      // --------------------------------

      const locations =
        $("loc");

      if (
        locations.length >
        0
      ) {
        console.log(
          "Using sitemap fallback."
        );

        for (
          let i = 0;
          i <
          locations.length;
          i++
        ) {
          if (
            pageUrls.size >=
            MAX_SITEMAP_URLS
          ) {
            break;
          }

          const value =
            $(locations[i])
              .text()
              .trim();

          if (!value) {
            continue;
          }

          const normalized =
            normalizeUrl(value);

          if (!normalized) {
            continue;
          }

          if (
            isXmlUrl(
              normalized
            )
          ) {
            await processSitemap(
              normalized,
              depth + 1
            );

            continue;
          }

          if (
            isSameDomain(
              normalized,
              websiteUrl
            )
          ) {
            pageUrls.add(
              normalized
            );
          }
        }
      } else {
        console.log(
          "No sitemap URLs found in:",
          currentSitemapUrl
        );
      }
    } catch (error) {
      console.error(
        "================================="
      );

      console.error(
        "SITEMAP PROCESSING ERROR"
      );

      console.error(
        "Sitemap:",
        currentSitemapUrl
      );

      console.error(
        error
      );

      console.error(
        "================================="
      );
    }
  }

  // --------------------------------
  // START
  // --------------------------------

  await processSitemap(
    sitemapUrl
  );

  const urls =
    Array.from(pageUrls);

  // --------------------------------
  // PRIORITIZE PRODUCT URLS
  // --------------------------------

  urls.sort(
    (a, b) => {
      const getPriority = (
        url: string
      ) => {
        const lower =
          url.toLowerCase();

        if (
          lower.includes(
            "/products/"
          )
        ) {
          return 100;
        }

        if (
          lower.includes(
            "/product/"
          )
        ) {
          return 90;
        }

        if (
          lower.includes(
            "/shop/"
          )
        ) {
          return 80;
        }

        if (
          lower.includes(
            "/collections/"
          )
        ) {
          return 50;
        }

        if (
          lower.includes(
            "/category/"
          )
        ) {
          return 40;
        }

        return 10;
      };

      return (
        getPriority(b) -
        getPriority(a)
      );
    }
  );

  console.log(
    "================================="
  );

  console.log(
    "SITEMAP PROCESSING COMPLETED"
  );

  console.log(
    "Sitemaps visited:",
    visitedSitemaps.size
  );

  console.log(
    "Actual webpage URLs found:",
    urls.length
  );

  console.log(
    "First URLs:"
  );

  console.log(
    urls.slice(0, 10)
  );

  console.log(
    "================================="
  );

  return urls;
}