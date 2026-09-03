/**
 * Sales Pilot — Public API Rate Limiter
 * 
 * Provides in-memory sliding-window rate limiting per (widget_id + IP)
 * to prevent automated abuse and quota exhaustion.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const expiryCutoff = now - windowMs;
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => ts > expiryCutoff);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Maximum allowed requests within window (default: 20) */
  maxRequests?: number;
  /** Sliding window duration in seconds (default: 60) */
  windowSeconds?: number;
  /** Maximum requests allowed in a rapid burst (default: 6 in 5s) */
  burstLimit?: number;
  /** Burst window duration in seconds (default: 5) */
  burstWindowSeconds?: number;
}

export interface RateLimitResult {
  isRateLimited: boolean;
  retryAfter: number;
  remaining: number;
  totalLimit: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const maxRequests = options.maxRequests ?? 20;
  const windowSeconds = options.windowSeconds ?? 60;
  const windowMs = windowSeconds * 1000;

  const burstLimit = options.burstLimit ?? 6;
  const burstWindowMs = (options.burstWindowSeconds ?? 5) * 1000;

  const now = Date.now();
  cleanupStaleEntries(windowMs);

  let record = rateLimitStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Filter out timestamps older than the sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > now - windowMs);

  // Check rapid burst limit
  const recentBurst = record.timestamps.filter((ts) => ts > now - burstWindowMs);
  if (recentBurst.length >= burstLimit) {
    const oldestInBurst = recentBurst[0];
    const retryAfter = Math.max(1, Math.ceil((oldestInBurst + burstWindowMs - now) / 1000));
    return {
      isRateLimited: true,
      retryAfter,
      remaining: 0,
      totalLimit: maxRequests,
    };
  }

  // Check sliding window limit
  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
    return {
      isRateLimited: true,
      retryAfter,
      remaining: 0,
      totalLimit: maxRequests,
    };
  }

  // Record this request
  record.timestamps.push(now);

  return {
    isRateLimited: false,
    retryAfter: 0,
    remaining: Math.max(0, maxRequests - record.timestamps.length),
    totalLimit: maxRequests,
  };
}

/**
 * Extracts the best client IP address from standard HTTP headers
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0].trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

/**
 * Resets rate limit for a specific identifier (useful for tests)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

