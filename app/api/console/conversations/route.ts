import { NextResponse } from "next/server";
import { authenticateUser, getAdminClient } from "@/lib/supabase/serverAuth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const search = searchParams.get("search") || "";

    // 1. Authenticate user cryptographically
    const auth = await authenticateUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required to access support console.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = auth.user.id;
    const adminClient = getAdminClient();

    // 2. Fetch conversations for this merchant profile
    let query = adminClient
      .from("conversations")
      .select(
        `
          id,
          profile_id,
          user_id,
          visitor_session_id,
          customer_name,
          customer_email,
          assigned_to,
          status,
          last_message,
          handover_requested_at,
          handover_reason,
          taken_over_at,
          taken_over_by,
          created_at,
          updated_at
        `
      )
      .or(`profile_id.eq.${userId},user_id.eq.${userId}`)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: conversations, error } = await query;

    if (error) {
      console.error("CONSOLE CONVERSATIONS ERROR:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const rows = conversations || [];

    // Calculate real-time counts
    const waitingCount = rows.filter(
      (c) => c.status === "waiting_for_human" || c.assigned_to === "waiting_for_human"
    ).length;

    const activeCount = rows.filter(
      (c) => c.status === "human_active" || (c.assigned_to && c.assigned_to !== "ai" && c.assigned_to !== "waiting_for_human" && c.status !== "resolved")
    ).length;

    const resolvedCount = rows.filter((c) => c.status === "resolved").length;

    // Apply filtering
    let filtered = rows;
    if (filter === "waiting") {
      filtered = rows.filter(
        (c) => c.status === "waiting_for_human" || c.assigned_to === "waiting_for_human"
      );
    } else if (filter === "active") {
      filtered = rows.filter(
        (c) => c.status === "human_active" || (c.assigned_to && c.assigned_to !== "ai" && c.assigned_to !== "waiting_for_human" && c.status !== "resolved")
      );
    } else if (filter === "resolved") {
      filtered = rows.filter((c) => c.status === "resolved");
    } else if (filter === "mine") {
      filtered = rows.filter((c) => c.assigned_to === userId);
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
          (c.customer_email && c.customer_email.toLowerCase().includes(q)) ||
          (c.last_message && c.last_message.toLowerCase().includes(q)) ||
          (c.visitor_session_id && c.visitor_session_id.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      conversations: filtered,
      waitingCount,
      activeCount,
      resolvedCount,
      counts: {
        total: rows.length,
        waiting: waitingCount,
        active: activeCount,
        resolved: resolvedCount,
      },
    });
  } catch (err: any) {
    console.error("GET CONSOLE CONVERSATIONS EXCEPTION:", err);
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

