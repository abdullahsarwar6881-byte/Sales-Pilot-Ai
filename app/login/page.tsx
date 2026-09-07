"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  MessageSquare,
  ShoppingCart,
  Users,
  BarChart3,
  Star,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");

  function getReturnUrl() {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get("redirect");
    urlParams.delete("redirect");
    const remainingSearch = urlParams.toString();

    const target =
      redirectPath && redirectPath.startsWith("/dashboard")
        ? redirectPath
        : "/dashboard";

    return remainingSearch ? `${target}?${remainingSearch}` : target;
  }

  // Check if session is already active or if oauth error is present on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("error") === "oauth") {
      setMessage("Google sign-in could not be completed. Please try again.");
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const returnUrl = getReturnUrl();
        router.replace(returnUrl);
      }
    });
  }, [supabase, router]);

  async function handleGoogleLogin() {
    if (googleLoading || loading) return;

    setGoogleLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("[LOGIN] Google sign-in failed:", error.message);
        setMessage(error.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error("[LOGIN] Unexpected error during Google login:", err);
      setMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during Google sign-in."
      );
      setGoogleLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (loading || googleLoading) return;

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("[LOGIN] sign-in failed:", error.message);
        setMessage(error.message);
        setLoading(false);
        return;
      }

      console.log("[LOGIN] sign-in successful", {
        sessionExists: Boolean(data.session),
        userExists: Boolean(data.user),
      });

      if (!data.session) {
        setMessage("Login succeeded, but the session could not be established.");
        setLoading(false);
        return;
      }

      const returnUrl = getReturnUrl();

      console.log("[LOGIN] redirecting", {
        destination: returnUrl,
      });

      router.replace(returnUrl);
    } catch (error) {
      console.error(
        "[LOGIN] unexpected error:",
        error instanceof Error ? error.message : "Unknown error"
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during login."
      );

      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#080a0f] text-slate-900 dark:text-slate-100 relative overflow-hidden flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-950 dark:selection:text-indigo-200 transition-colors duration-200">
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-100/40 dark:bg-purple-950/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-50/60 dark:bg-indigo-950/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-violet-50/40 dark:bg-violet-950/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#5B3DF5] flex items-center justify-center text-white font-black text-base shadow-xs group-hover:scale-105 transition-transform shrink-0">
            S
          </div>
          <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sales Pilot
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>&larr;</span>
          <span>Back to home</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center w-full">
          {/* Left Column: Marketing / Value Proposition */}
          <div className="lg:col-span-6 flex flex-col justify-center max-w-lg mx-auto lg:mx-0 order-2 lg:order-1">
            {/* Sparkle icon */}
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#5B3DF5] dark:text-[#9B7CFC]" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              The AI employee <br />
              <span className="text-slate-900 dark:text-white">for your business</span>
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
              Support customers, boost sales, and save time &mdash; all in one place.
            </p>

            {/* 4 Benefit points */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/70 text-[#5B3DF5] dark:text-[#9B7CFC] flex items-center justify-center shrink-0 border border-indigo-100/60 dark:border-indigo-800/40">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  Answer questions 24/7
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/70 text-[#5B3DF5] dark:text-[#9B7CFC] flex items-center justify-center shrink-0 border border-indigo-100/60 dark:border-indigo-800/40">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  Recommend products
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/70 text-[#5B3DF5] dark:text-[#9B7CFC] flex items-center justify-center shrink-0 border border-indigo-100/60 dark:border-indigo-800/40">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  Capture leads
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/70 text-[#5B3DF5] dark:text-[#9B7CFC] flex items-center justify-center shrink-0 border border-indigo-100/60 dark:border-indigo-800/40">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  Grow your business
                </span>
              </div>
            </div>

            {/* Testimonial card */}
            <div className="mt-8 p-5 rounded-2xl bg-white/90 dark:bg-[#12151d] border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-xs max-w-sm">
              <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                &ldquo;Easy to use and incredibly powerful. Sales Pilot feels like part of our team.&rdquo;
              </p>
              <div className="flex items-center gap-1 mt-2.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <div className="mt-2 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">Michael R.</span>
                <span className="text-slate-400 dark:text-slate-500 text-[11px] block font-medium">
                  DTC Brand Owner
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-6 flex justify-center order-1 lg:order-2">
            <div className="w-full max-w-[480px] bg-white dark:bg-[#12151d] rounded-3xl border border-slate-200/90 dark:border-white/10 p-8 sm:p-10 shadow-xl dark:shadow-2xl shadow-indigo-500/5 dark:shadow-indigo-950/40 relative">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Sign in to your Sales Pilot account
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || googleLoading}
                      required
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e14] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all focus:border-[#5B3DF5] focus:ring-3 focus:ring-[#5B3DF5]/15 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || googleLoading}
                      required
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e14] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all focus:border-[#5B3DF5] focus:ring-3 focus:ring-[#5B3DF5]/15 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Keep me signed in & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={keepSignedIn}
                      onChange={(e) => setKeepSignedIn(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-zinc-700 text-[#5B3DF5] focus:ring-[#5B3DF5]/20 accent-[#5B3DF5] bg-white dark:bg-zinc-800"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Keep me signed in
                    </span>
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[#5B3DF5] dark:text-[#9B7CFC] hover:text-[#4E2DE8] dark:hover:text-[#B49CFC] hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full mt-2 rounded-xl bg-gradient-to-r from-[#5B3DF5] to-[#7C5CFC] hover:from-[#4E2DE8] hover:to-[#6B4BE8] py-3.5 text-sm font-bold text-white shadow-md shadow-[#5B3DF5]/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* OR Separator */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-white/10" />
                </div>
                <div className="relative bg-white dark:bg-[#12151d] px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  OR
                </div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161a24] py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-[#1c212e] transition-all hover:border-slate-300 dark:hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
              >
                {googleLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin text-slate-700 dark:text-slate-300"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Connecting to Google...
                  </span>
                ) : (
                  <>
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Error Message */}
              {message && (
                <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/90 dark:bg-rose-950/40 p-3 text-center text-xs font-medium text-rose-700 dark:text-rose-300">
                  {message}
                </div>
              )}

              {/* Bottom footer toggle */}
              <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-bold text-[#5B3DF5] dark:text-[#9B7CFC] hover:text-[#4E2DE8] dark:hover:text-[#B49CFC] hover:underline"
                >
                  Create one
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Subtle Tagline & Decorative elements */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between text-[11px] font-bold tracking-wider text-slate-400/80 dark:text-slate-500 uppercase">
        <span>Smarter Support. Higher Sales.</span>
        <div className="hidden sm:grid grid-cols-4 gap-1 opacity-30 dark:opacity-20">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-[#5B3DF5]" />
          ))}
        </div>
      </footer>
    </div>
  );
}