export function scoreUrl(url: string): number {
  const path = url.toLowerCase();

  let score = 50;

  // Ecommerce
  if (path.includes("/products")) score += 100;
  if (path.includes("/product")) score += 100;

  if (path.includes("/collections")) score += 95;
  if (path.includes("/collection")) score += 95;

  if (path.includes("/shop")) score += 90;

  // Customer support
  if (path.includes("/faq")) score += 90;

  if (path.includes("/shipping")) score += 90;

  if (path.includes("/returns")) score += 90;

  if (path.includes("/refund")) score += 90;

  if (path.includes("/contact")) score += 80;

  if (path.includes("/pricing")) score += 80;

  if (path.includes("/about")) score += 70;

  // Documentation
  if (path.includes("/docs")) score += 80;

  if (path.includes("/guide")) score += 70;

  if (path.includes("/learn")) score += 70;

  if (path.includes("/api")) score += 60;

  // Lower priority
  if (path.includes("/blog")) score -= 20;

  if (path.includes("/news")) score -= 20;

  if (path.includes("/privacy")) score -= 50;

  if (path.includes("/terms")) score -= 50;

  return score;
}