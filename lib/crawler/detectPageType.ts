export function detectPageType(
  url: string,
  title: string
): string {

  const path =
    url.toLowerCase();

  const pageTitle =
    title.toLowerCase();

  // Ecommerce

  if (
    path.includes("/products") ||
    path.includes("/product")
  ) {
    return "product";
  }

  if (
    path.includes("/collections") ||
    path.includes("/collection")
  ) {
    return "collection";
  }

  // Customer Support

  if (
    path.includes("/faq") ||
    pageTitle.includes("faq")
  ) {
    return "faq";
  }

  if (
    path.includes("shipping")
  ) {
    return "shipping";
  }

  if (
    path.includes("return")
  ) {
    return "returns";
  }

  if (
    path.includes("refund")
  ) {
    return "refund";
  }

  // Business

  if (
    path.includes("/pricing")
  ) {
    return "pricing";
  }

  if (
    path.includes("/contact")
  ) {
    return "contact";
  }

  if (
    path.includes("/about")
  ) {
    return "about";
  }

  // Documentation

  if (
    path.includes("/docs")
  ) {
    return "documentation";
  }

  if (
    path.includes("/guide")
  ) {
    return "guide";
  }

  if (
    path.includes("/learn")
  ) {
    return "tutorial";
  }

  if (
    path.includes("/api")
  ) {
    return "api";
  }

  // Blog

  if (
    path.includes("/blog")
  ) {
    return "blog";
  }

  // Default

  return "page";
}