"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let initialCheckComplete = false;

    function redirectToLogin() {
      if (typeof window === "undefined") return;
      const currentPath = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);

      if (
        currentPath &&
        currentPath.startsWith("/dashboard") &&
        currentPath !== "/dashboard"
      ) {
        urlParams.set("redirect", currentPath);
      }

      const searchStr = urlParams.toString();
      const target = searchStr ? `/login?${searchStr}` : "/login";
      router.replace(target);
    }

    async function checkInitialSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        console.log("[AUTHGUARD] initial session", {
          sessionExists: Boolean(session),
          userExists: Boolean(session?.user),
          error: error?.message ?? null,
          pathname: window.location.pathname,
        });

        initialCheckComplete = true;

        if (session) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          redirectToLogin();
        }
      } catch (error) {
        if (!mounted) return;

        console.log("[AUTHGUARD] session check failed", {
          message: error instanceof Error ? error.message : "Unknown error",
        });

        initialCheckComplete = true;
        setIsAuthenticated(false);
        redirectToLogin();
      }
    }

    checkInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.log("[AUTHGUARD] auth event", {
        event,
        sessionExists: Boolean(session),
        initialCheckComplete,
      });

      if (session) {
        setIsAuthenticated(true);
        return;
      }

      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        redirectToLogin();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-muted-foreground">
            Authenticating session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-muted-foreground">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}