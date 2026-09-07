import { NextResponse } from "next/server";
import { authenticateUser, getAdminClient } from "@/lib/supabase/serverAuth";
import { returnConversationToAI } from "@/lib/handover/handoverManager";

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
        { success: false, error: "Authentication required to return conversation to AI.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.user.id;
    const adminClient = getAdminClient();
    const result = await returnConversationToAI(adminClient, {
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
        status: "ai_active",
        assignedTo: "ai",
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
      console.warn("Realtime broadcast warning on return-to-ai:", realtimeErr);
    }

    return NextResponse.json({
      success: true,
      conversationId,
      status: "ai_active",
      assignedTo: "ai",
      conversation: {
        id: conversationId,
        status: "ai_active",
        assigned_to: "ai",
      },
    });
  } catch (err: any) {
    console.error("RETURN TO AI API EXCEPTION:", err);
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

