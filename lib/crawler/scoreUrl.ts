export function scoreUrl(url: string): number {
  const path = url.toLowerCase();

  let score = 50;

  // Essential business & customer support pages (highest priority to guarantee complete knowledge)
  if (path.includes("/contact")) score += 120;
  if (path.includes("/store-locator") || path.includes("/locations") || path.includes("/stores")) score += 115;
  if (path.includes("/faq") || path.includes("/help") || path.includes("/support")) score += 110;
  if (path.includes("/shipping") || path.includes("/delivery")) score += 110;
  if (path.includes("/returns") || path.includes("/refund") || path.includes("/exchange")) score += 110;
  if (path.includes("/payment") || path.includes("/pricing") || path.includes("/billing")) score += 105;
  if (path.includes("/about") || path.includes("/size-chart") || path.includes("/track-your-order")) score += 100;
  if (path.includes("/privacy") || path.includes("/terms") || path.includes("/disclaimer") || path.includes("/policy")) score += 95;

  // Ecommerce collections & products
  if (path.includes("/collections") || path.includes("/collection")) score += 90;
  if (path.includes("/products") || path.includes("/product")) score += 85;
  if (path.includes("/shop")) score += 80;

  // Documentation & Guides
  if (path.includes("/docs") || path.includes("/guide") || path.includes("/learn") || path.includes("/api")) score += 75;

  // Lower priority (blogs/news)
  if (path.includes("/blog") || path.includes("/blogs") || path.includes("/news") || path.includes("/articles")) score += 30;

  return score;
}