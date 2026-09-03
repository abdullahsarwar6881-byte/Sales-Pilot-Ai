import { NextRequest, NextResponse } from "next/server";
import {
  resolveMerchantFromWidget,
  isOriginAllowed,
  getCorsHeaders,
} from "@/lib/security/widgetAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// =====================================================
// OPTIONS PREFLIGHT HANDLER
// =====================================================

export async function OPTIONS(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const widgetId = searchParams.get("widgetId") || searchParams.get("profileId");

  const originHeader =
    request.headers.get("origin") || request.headers.get("referer");

  // If no widgetId provided in preflight query, allow standard preflight with origin echo if safe
  if (!widgetId) {
    const isDev = process.env.NODE_ENV !== "production";
    const originToEcho = originHeader || (isDev ? "*" : null);
    if (!originToEcho) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(originToEcho, "GET, OPTIONS"),
    });
  }

  const resolved = await resolveMerchantFromWidget(widgetId);
  if (!resolved) {
    return new NextResponse(null, { status: 404 });
  }

  const { allowed, originToEcho } = isOriginAllowed(
    originHeader,
    resolved.allowedDomains
  );

  if (!allowed || !originToEcho) {
    return NextResponse.json(
      { error: "Origin not authorized." },
      { status: 403 }
    );
  }

  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(originToEcho, "GET, OPTIONS"),
  });
}

// =====================================================
// GET WIDGET CONFIGURATION
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const widgetId =
      searchParams.get("widgetId") ||
      searchParams.get("widget_public_id") ||
      searchParams.get("profileId");

    if (!widgetId) {
      return NextResponse.json(
        { error: "widgetId parameter is required." },
        { status: 400 }
      );
    }

    // 1. Resolve merchant tenant account and registered domains
    const resolved = await resolveMerchantFromWidget(widgetId);

    if (!resolved) {
      return NextResponse.json(
        { error: "Widget not found." },
        { status: 404 }
      );
    }

    // 2. Validate Origin / Referer against registered store domains
    const originHeader =
      request.headers.get("origin") || request.headers.get("referer");

    const { allowed, originToEcho } = isOriginAllowed(
      originHeader,
      resolved.allowedDomains
    );

    if (!allowed || !originToEcho) {
      return NextResponse.json(
        { error: "Origin not authorized for this widget." },
        { status: 403 }
      );
    }

    const corsHeaders = getCorsHeaders(originToEcho, "GET, OPTIONS");

    // 3. Return ONLY safe, public widget settings
    return NextResponse.json(
      {
        widgetId: resolved.widgetPublicId,
        ...resolved.settings,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error: unknown) {
    console.error("WIDGET CONFIG API ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load widget configuration." },
      { status: 500 }
    );
  }
}