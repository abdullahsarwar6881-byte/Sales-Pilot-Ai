import { headers } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient, SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthenticatedUser {
  user: User;
  token?: string;
}

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Creates a Supabase client scoped to the authenticated user's JWT.
 * Enforces Row Level Security (RLS) under that user's identity.
 */
export function createUserClient(token: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

/**
 * Authenticates an incoming request by cryptographically verifying:
 * 1. Authorization: Bearer <Supabase JWT>
 * 2. Next.js Server Cookie session (for direct browser/SSR context)
 *
 * NEVER trusts client-provided x-staff-user-id, body.userId, or arbitrary headers.
 */
export async function authenticateUser(
  request?: Request
): Promise<AuthenticatedUser | null> {
  // 1. Check Authorization Bearer token header
  let authHeader: string | null = null;

  if (request) {
    authHeader = request.headers.get("authorization");
  } else {
    try {
      const headerList = await headers();
      authHeader = headerList.get("authorization");
    } catch {
      // ignore
    }
  }

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice("bearer ".length).trim();
    if (token) {
      const admin = getAdminClient();
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data?.user) {
        return {
          user: data.user,
          token,
        };
      }
    }
  }

  // 2. Fallback to server cookies if available (direct browser / SSR)
  try {
    const serverSupabase = await createServerClient();
    const { data: authData, error } = await serverSupabase.auth.getUser();
    if (!error && authData?.user) {
      return {
        user: authData.user,
      };
    }
  } catch {
    // Cookie session unavailable
  }

  return null;
}
