import { NextResponse } from "next/server";
import { authenticateUser, getAdminClient } from "@/lib/supabase/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await authenticateUser(req);
    const user = auth?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();

    // Check for active crawl job first
    const { data: activeJobs, error: activeErr } = await admin
      .from("crawl_jobs")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "discovering", "crawling", "processing"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (activeErr) {
      console.error("[CRAWL STATUS API] Active job query error:", activeErr);
    }

    if (activeJobs && activeJobs.length > 0) {
      return NextResponse.json({
        job: activeJobs[0],
        isActive: true,
      });
    }

    // Otherwise return latest completed/failed job if available
    const { data: latestJobs, error: latestErr } = await admin
      .from("crawl_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (latestErr) {
      console.error("[CRAWL STATUS API] Latest job query error:", latestErr);
    }

    return NextResponse.json({
      job: latestJobs && latestJobs.length > 0 ? latestJobs[0] : null,
      isActive: false,
    });
  } catch (err: any) {
    console.error("[CRAWL STATUS API] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

