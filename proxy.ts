import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // --------------------------------------------------
  // Shopify API routes
  // --------------------------------------------------
  // Shopify embedded-app requests use Shopify App Bridge
  // authentication instead of the Supabase browser session.
  //
  // Do not run the Supabase auth middleware on these routes.
  // --------------------------------------------------

  if (pathname.startsWith("/api/shopify")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const searchParams = request.nextUrl.searchParams;
  const referer = request.headers.get("referer") || "";
  const secFetchDest = request.headers.get("sec-fetch-dest");

  const isEmbedded =
    searchParams.has("embedded") ||
    searchParams.has("host") ||
    searchParams.has("shop") ||
    secFetchDest === "iframe" ||
    referer.includes("embedded=1") ||
    referer.includes("host=") ||
    referer.includes("shop=") ||
    referer.includes("admin.shopify.com") ||
    referer.includes(".myshopify.com");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, isEmbedded ? {
              ...options,
              sameSite: "none",
              secure: true,
            } : options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedRoutes = [
    "/dashboard",
    "/chat",
    "/knowledge",
    "/settings",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  console.log("[PROXY]", {
    pathname,
    shopPresent: searchParams.has("shop"),
    hostPresent: searchParams.has("host"),
    embedded: isEmbedded,
    supabaseSessionExists: Boolean(user),
    isProtectedRoute,
  });

  if (isProtectedRoute && !user) {
    if (!isEmbedded) {
      const loginUrl = new URL("/login", request.url);
      const urlParams = new URLSearchParams(request.nextUrl.search);
      if (pathname && pathname.startsWith("/dashboard") && pathname !== "/dashboard") {
        urlParams.set("redirect", pathname);
      }
      loginUrl.search = urlParams.toString();
      console.log("[PROXY] decision: REDIRECT_LOGIN", loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/login" && user) {
    const redirectParam = searchParams.get("redirect");
    const targetPath =
      redirectParam && redirectParam.startsWith("/dashboard")
        ? redirectParam
        : "/dashboard";
    const destUrl = new URL(targetPath, request.url);
    const urlParams = new URLSearchParams(request.nextUrl.search);
    urlParams.delete("redirect");
    destUrl.search = urlParams.toString();
    console.log("[PROXY] decision: REDIRECT_DASHBOARD", destUrl.toString());
    return NextResponse.redirect(destUrl);
  }

  console.log("[PROXY] decision: PASS");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};