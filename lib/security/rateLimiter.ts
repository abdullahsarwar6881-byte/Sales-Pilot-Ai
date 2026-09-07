/**
 * Sales Pilot — Distributed Visitor Rate Limiter & Concurrency Lock
 *
 * Implements token bucket / fixed-window rate limiting backed by PostgreSQL
 * to ensure rate limits are strictly enforced across serverless instances.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitResult {
  allowed: boolean;
  status: number;
  error?: string;
  retryAfter?: number;
  remaining?: number;
}

const DEFAULT_LIMIT_PER_MINUTE = Number(process.env.VISITOR_RATE_LIMIT_PER_MINUTE || 10);
const DEFAULT_LIMIT_PER_HOUR = Number(process.env.VISITOR_RATE_LIMIT_PER_HOUR || 60);

/**
 * Normalizes an IP address from request headers
 */
export function extractClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return null;
}

/**
 * Checks visitor rate limits across both 1-minute and 1-hour windows.
 */
export async function checkVisitorRateLimit(
  supabaseAdmin: SupabaseClient,
  params: {
    merchantId: string;
    visitorSessionId: string;
    ip?: string | null;
  }
): Promise<RateLimitResult> {
  const { merchantId, visitorSessionId } = params;

  if (!merchantId || !visitorSessionId) {
    return {
      allowed: false,
      status: 400,
      error: "Invalid rate limit parameters.",
    };
  }

  // Sanitize key components
  const cleanMerchant = merchantId.trim().slice(0, 64);
  const cleanSession = visitorSessionId.trim().slice(0, 128);

  const minKey = `rl:min:${cleanMerchant}:${cleanSession}`;
  const hourKey = `rl:hr:${cleanMerchant}:${cleanSession}`;

  try {
    // 1. Check 1-minute limit (10 requests / 60 seconds)
    const { data: minData, error: minErr } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      {
        p_key: minKey,
        p_limit: DEFAULT_LIMIT_PER_MINUTE,
        p_window_seconds: 60,
      }
    );

    if (minErr) {
      console.error("RATE LIMIT MINUTE RPC ERROR:", minErr);
      // If rate limiter fails, allow request in fail-open mode for minor transient issues,
      // but log it clearly. Or if strict, fail-safe.
      return { allowed: true, status: 200, remaining: DEFAULT_LIMIT_PER_MINUTE };
    }

    if (minData && minData.allowed === false) {
      return {
        allowed: false,
        status: 429,
        error: "You're sending messages too quickly. Please wait a moment and try again.",
        retryAfter: minData.retry_after || 10,
        remaining: 0,
      };
    }

    // 2. Check 1-hour limit (60 requests / 3600 seconds)
    const { data: hrData, error: hrErr } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      {
        p_key: hourKey,
        p_limit: DEFAULT_LIMIT_PER_HOUR,
        p_window_seconds: 3600,
      }
    );

    if (hrErr) {
      console.error("RATE LIMIT HOUR RPC ERROR:", hrErr);
      return { allowed: true, status: 200, remaining: minData?.remaining ?? 1 };
    }

    if (hrData && hrData.allowed === false) {
      return {
        allowed: false,
        status: 429,
        error: "Hourly message limit reached. Please try again later.",
        retryAfter: hrData.retry_after || 60,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      status: 200,
      remaining: Math.min(minData?.remaining ?? 10, hrData?.remaining ?? 60),
    };
  } catch (error) {
    console.error("RATE LIMIT UNEXPECTED ERROR:", error);
    return { allowed: true, status: 200 };
  }
}

/**
 * Concurrency Lock: Prevents duplicate simultaneous AI processing
 * when a visitor clicks "Send" multiple times in quick succession.
 */
export async function acquireRequestLock(
  supabaseAdmin: SupabaseClient,
  sessionId: string,
  lockWindowSeconds = 25
): Promise<{ acquired: boolean; lockKey: string }> {
  const lockKey = `lock:session:${sessionId.trim().slice(0, 128)}`;

  try {
    const { data, error } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      {
        p_key: lockKey,
        p_limit: 1, // Only 1 in-flight allowed per window
        p_window_seconds: lockWindowSeconds,
      }
    );

    if (error) {
      console.error("LOCK ACQUIRE RPC ERROR:", error);
      return { acquired: true, lockKey }; // fail-open if lock table error
    }

    return {
      acquired: data?.allowed ?? true,
      lockKey,
    };
  } catch (error) {
    console.error("LOCK ACQUIRE ERROR:", error);
    return { acquired: true, lockKey };
  }
}

/**
 * Releases the concurrency lock once request processing completes.
 */
export async function releaseRequestLock(
  supabaseAdmin: SupabaseClient,
  lockKey: string
): Promise<void> {
  try {
    await supabaseAdmin
      .from("rate_limits")
      .delete()
      .eq("key", lockKey);
  } catch (error) {
    console.error("LOCK RELEASE ERROR:", error);
  }
}
