import { NextResponse } from "next/server";
import { authenticateUser, getAdminClient } from "@/lib/supabase/serverAuth";
import { takeOverConversation } from "@/lib/handover/handoverManager";

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

    // 1. Authenticate staff user cryptographically
    const auth = await authenticateUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required to take over conversation.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.user.id;
    const agentName =
      auth.user.user_metadata?.full_name ||
      auth.user.user_metadata?.name ||
      auth.user.email?.split("@")[0] ||
      "Support Agent";

    const adminClient = getAdminClient();

    // 2. Perform atomic takeover with row-level locking
    const takeoverResult = await takeOverConversation(adminClient, {
      conversationId,
      userId,
      agentName,
    });

    if (!takeoverResult.success) {
      const statusCode =
        takeoverResult.code === "FORBIDDEN"
          ? 403
          : takeoverResult.code === "ALREADY_ASSIGNED"
          ? 409
          : takeoverResult.code === "NOT_FOUND"
          ? 404
          : 400;

      return NextResponse.json(takeoverResult, { status: statusCode });
    }

    // 3. Broadcast Realtime status update to customer widget
    try {
      const payload = {
        conversationId,
        status: "human_active",
        assignedTo: userId,
        agentName,
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
      console.warn("Realtime broadcast warning on takeover:", realtimeErr);
    }

    return NextResponse.json({
      success: true,
      conversationId,
      status: "human_active",
      assignedTo: userId,
      agentName,
      takenOverAt: new Date().toISOString(),
      conversation: {
        id: conversationId,
        status: "human_active",
        assigned_to: userId,
        taken_over_by: agentName,
      },
    });
  } catch (err: any) {
    console.error("TAKEOVER API EXCEPTION:", err);
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

