import * as cheerio from "cheerio";

export async function getSitemapUrls(
  websiteUrl: string
) {
  try {
    const sitemapUrl =
      new URL("/sitemap.xml", websiteUrl).href;

    console.log(
      "Checking sitemap:",
      sitemapUrl
    );

    const response = await fetch(sitemapUrl);

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();

    const $ = cheerio.load(xml, {
      xmlMode: true,
    });

    const urls: string[] = [];

    $("loc").each((_, element) => {
      const url = $(element).text().trim();

      if (url) {
        urls.push(url);
      }
    });

    console.log(
      "Sitemap URLs found:",
      urls.length
    );

    return urls;
  } catch (error) {
    console.log(
      "No sitemap found."
    );

    return [];
  }
}