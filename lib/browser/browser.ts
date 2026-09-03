import { chromium } from "playwright";

let browser: Awaited<
  ReturnType<typeof chromium.launch>
> | null = null;

async function getBrowser() {
  if (!browser) {
    console.log("Launching Playwright Chromium...");

    browser = await chromium.launch({
      headless: true,
    });

    console.log(
      "Playwright Chromium launched successfully."
    );
  }

  return browser;
}

export async function getRenderedHTML(
  url: string
) {
  const browser = await getBrowser();

  const page = await browser.newPage({
    viewport: {
      width: 1280,
      height: 900,
    },

    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  });

  try {
    console.log(
      "Opening page:",
      url
    );

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log(
      "Page navigation completed:",
      url
    );

    if (response) {
      console.log(
        "HTTP status:",
        response.status()
      );
    }

    // Give JavaScript-rendered content
    // a little time to appear.
    await page.waitForTimeout(1500);

    // We intentionally DO NOT use:
    //
    // await page.waitForLoadState("load")
    //
    // because ecommerce websites can have
    // images, analytics, ads, tracking scripts,
    // etc. that delay the load event.

    const html =
      await page.content();

    console.log(
      "HTML extracted successfully:",
      url,
      "Length:",
      html.length
    );

    return html;
  } catch (error) {
    console.error(
      "================================="
    );

    console.error(
      "PLAYWRIGHT PAGE ERROR"
    );

    console.error(
      "URL:",
      url
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );

    throw error;
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browser) {
    console.log(
      "Closing Playwright browser..."
    );

    await browser.close();

    browser = null;

    console.log(
      "Playwright browser closed."
    );
  }
}