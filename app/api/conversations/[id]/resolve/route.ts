import { NextResponse } from "next/server";
import { authenticateUser, getAdminClient } from "@/lib/supabase/serverAuth";
import { resolveConversation } from "@/lib/handover/handoverManager";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = Number(id);

    if (!conversationId || isNaN(conversationId)) {
      return NextResponse.json(
        { success: false, error: "Invalid conversation ID", code: "INVALID_ID" },
        { status: 400 }
      );
    }

    const auth = await authenticateUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required to resolve conversation.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.user.id;
    const adminClient = getAdminClient();
    const result = await resolveConversation(adminClient, {
      conversationId,
      userId,
    });

    if (!result.success) {
      const statusCode = result.code === "FORBIDDEN" ? 403 : result.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(result, { status: statusCode });
    }

    // Broadcast Realtime status update
    try {
      const payload = {
        conversationId,
        status: "resolved",
      };

      await Promise.allSettled([
        adminClient.channel(`widget-conversation-${conversationId}`).send({
          type: "broadcast",
          event: "status_change",
          payload,
        }),
        adminClient.channel(`chat-conv-${conversationId}`).send({
          type: "broadcast",
          event: "status_change",
          payload,
        }),
      ]);
    } catch (realtimeErr) {
      console.warn("Realtime broadcast warning on resolve:", realtimeErr);
    }

    return NextResponse.json({
      success: true,
      conversationId,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      conversation: {
        id: conversationId,
        status: "resolved",
      },
    });
  } catch (err: any) {
    console.error("RESOLVE API EXCEPTION:", err);
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

