import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// Meta verifies your webhook with this GET request
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// Meta sends incoming WhatsApp messages here
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log(
      "WhatsApp Webhook:",
      JSON.stringify(body, null, 2)
    );

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}