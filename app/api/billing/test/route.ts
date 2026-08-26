import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    safepayConfigured: Boolean(
      process.env.SAFEPAY_SECRET_KEY
    ),
    environment:
      process.env.SAFEPAY_ENVIRONMENT || "not-set",
  });
}
