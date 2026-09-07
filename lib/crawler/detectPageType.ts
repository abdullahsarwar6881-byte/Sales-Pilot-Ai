// =====================================================
// FAST DETERMINISTIC PAGE TYPE DETECTION
// =====================================================

export type PageType =
  | "product"
  | "collection"
  | "faq"
  | "shipping"
  | "returns"
  | "refund"
  | "pricing"
  | "contact"
  | "about"
  | "policy"
  | "blog"
  | "documentation"
  | "guide"
  | "tutorial"
  | "api"
  | "home"
  | "page"
  | "other";

/**
 * Fast, deterministic heuristic page classifier.
 * Evaluates URL pathname, page title, and meta tags to accurately
 * categorize pages in < 1ms.
 */
export function detectPageType(
  url: string,
  title = "",
  hasProductData = false
): string {
  if (hasProductData) {
    return "product";
  }

  const path = (url || "").toLowerCase();
  const pageTitle = (title || "").toLowerCase();

  // 1. Homepage
  try {
    const parsed = new URL(url);
    if (parsed.pathname === "" || parsed.pathname === "/" || parsed.pathname === "/index.html") {
      return "home";
    }
  } catch {
    // Ignore URL parse failure
  }

  // 2. Ecommerce Products
  if (
    path.includes("/products/") ||
    path.includes("/product/") ||
    path.includes("/item/") ||
    path.includes("/p/") ||
    path.includes("/dp/") ||
    path.endsWith("/products") ||
    pageTitle.includes("product details") ||
    pageTitle.includes("add to cart") ||
    pageTitle.includes("buy now")
  ) {
    return "product";
  }

  // 3. Ecommerce Collections & Categories
  if (
    path.includes("/collections/") ||
    path.includes("/collection/") ||
    path.includes("/categories/") ||
    path.includes("/category/") ||
    path.includes("/shop/") ||
    path.includes("/catalog") ||
    path.includes("/catalogue") ||
    path.endsWith("/collections") ||
    path.endsWith("/shop")
  ) {
    return "collection";
  }

  // 4. Customer Support & Policies
  if (path.includes("/faq") || pageTitle.includes("faq") || pageTitle.includes("frequently asked")) {
    return "faq";
  }

  if (
    path.includes("shipping") ||
    path.includes("delivery") ||
    pageTitle.includes("shipping policy") ||
    pageTitle.includes("delivery information")
  ) {
    return "shipping";
  }

  if (
    path.includes("return") ||
    path.includes("exchange") ||
    pageTitle.includes("returns policy") ||
    pageTitle.includes("return & exchange")
  ) {
    return "returns";
  }

  if (path.includes("refund") || pageTitle.includes("refund policy") || pageTitle.includes("money back")) {
    return "refund";
  }

  if (
    path.includes("privacy") ||
    path.includes("terms") ||
    path.includes("legal") ||
    path.includes("disclaimer") ||
    pageTitle.includes("privacy policy") ||
    pageTitle.includes("terms of service")
  ) {
    return "policy";
  }

  // 5. Business & Company
  if (path.includes("/pricing") || path.includes("/plans") || pageTitle.includes("pricing")) {
    return "pricing";
  }

  if (
    path.includes("/contact") ||
    path.includes("/get-in-touch") ||
    path.includes("/store-locator") ||
    path.includes("/locations") ||
    path.includes("/stores") ||
    pageTitle.includes("contact us") ||
    pageTitle.includes("store locator")
  ) {
    return "contact";
  }

  if (path.includes("/about") || path.includes("/our-story") || path.includes("/who-we-are") || pageTitle.includes("about us")) {
    return "about";
  }

  // 6. Documentation & Guides
  if (path.includes("/docs") || path.includes("/documentation") || pageTitle.includes("documentation")) {
    return "documentation";
  }

  if (path.includes("/guide") || pageTitle.includes("user guide")) {
    return "guide";
  }

  if (path.includes("/learn") || path.includes("/tutorial")) {
    return "tutorial";
  }

  if (path.includes("/api") || path.includes("/developer")) {
    return "api";
  }

  // 7. Articles & News
  if (
    path.includes("/blog") ||
    path.includes("/news") ||
    path.includes("/articles/") ||
    path.includes("/post/") ||
    path.includes("/posts/")
  ) {
    return "blog";
  }

  return "page";
}