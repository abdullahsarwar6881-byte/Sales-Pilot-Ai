import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Keep the raw body exactly as received.
    const rawBody = await request.text();

    console.log("=================================");
    console.log("SAFE PAY WEBHOOK RECEIVED");
    console.log("=================================");

    console.log("Headers:", {
      signature: request.headers.get("x-sfpy-signature"),
      timestamp: request.headers.get("x-sfpy-timestamp"),
      eventType: request.headers.get("x-sfpy-event-type"),
      eventId: request.headers.get("x-sfpy-event-id"),
    });

    console.log("Raw body:", rawBody);

    let payload: unknown = null;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.log(
        "Webhook body was not valid JSON."
      );
    }

    console.log(
      "Parsed payload:",
      payload
    );

    // IMPORTANT:
    // We return 200 for this initial testing
    // endpoint so Safepay knows the endpoint
    // is reachable.
    //
    // Subscription activation will be added
    // after we confirm the actual payload.

    return NextResponse.json({
      success: true,
      received: true,
    });
  } catch (error: unknown) {
    console.error(
      "Safepay webhook error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}