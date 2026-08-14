import { chromium } from "playwright";

let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
    });
  }

  return browser;
}

export async function getRenderedHTML(url: string) {
  const browser = await getBrowser();

  const page = await browser.newPage({
    viewport: {
      width: 1280,
      height: 900,
    },
  });

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForLoadState("load");

    await page.waitForTimeout(800);

    return await page.content();

  } finally {

    await page.close();

  }
}

export async function closeBrowser() {

  if (browser) {

    await browser.close();

    browser = null;

  }

}