import { NextResponse } from "next/server";
import { authenticateUser, getAdminClient } from "@/lib/supabase/serverAuth";

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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { content, message: rawMessage } = body || {};
    const text = String(content || rawMessage || "").trim();

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty", code: "EMPTY_MESSAGE" },
        { status: 400 }
      );
    }

    // 1. Authenticate staff user cryptographically
    const auth = await authenticateUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required to send messages as staff.", code: "UNAUTHORIZED" },
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

    // 2. Verify conversation ownership (multi-tenant check)
    const { data: conv, error: convErr } = await adminClient
      .from("conversations")
      .select("id, profile_id, user_id, status, assigned_to")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return NextResponse.json(
        { success: false, error: "Conversation not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (conv.profile_id !== userId && conv.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized tenant access to this conversation.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();

    // 3. Insert human staff message
    const { data: insertedMsg, error: insertErr } = await adminClient
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        sender: "human",
        role: "assistant",
        content: text,
        created_at: nowIso,
      })
      .select("id, conversation_id, sender, role, content, created_at")
      .single();

    if (insertErr || !insertedMsg) {
      console.error("MESSAGE INSERT ERROR:", insertErr);
      return NextResponse.json(
        { success: false, error: insertErr?.message || "Failed to insert message" },
        { status: 500 }
      );
    }

    // 4. Touch conversation updated_at and last_message
    await adminClient
      .from("conversations")
      .update({
        last_message: text.slice(0, 300),
        updated_at: nowIso,
        status: conv.status === "waiting_for_human" ? "human_active" : conv.status,
        assigned_to: conv.assigned_to === "waiting_for_human" ? userId : conv.assigned_to,
      })
      .eq("id", conversationId);

    // 5. Broadcast to Supabase Realtime for instant delivery to customer widget
    try {
      const payload = {
        id: insertedMsg.id,
        conversation_id: conversationId,
        sender: "human",
        role: "assistant",
        content: text,
        created_at: nowIso,
        agentName,
      };

      await Promise.allSettled([
        adminClient.channel(`widget-conversation-${conversationId}`).send({
          type: "broadcast",
          event: "new_message",
          payload,
        }),
        adminClient.channel(`chat-conv-${conversationId}`).send({
          type: "broadcast",
          event: "new_message",
          payload,
        }),
      ]);
    } catch (realtimeErr) {
      console.warn("Realtime broadcast warning on message send:", realtimeErr);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: String(insertedMsg.id),
        conversationId,
        sender: "human",
        role: "assistant",
        content: text,
        timestamp: nowIso,
        agentName,
      },
    });
  } catch (err: any) {
    console.error("STAFF MESSAGE API EXCEPTION:", err);
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

