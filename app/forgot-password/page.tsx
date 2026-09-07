"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage(error.message);
      setIsSuccess(false);
    } else {
      setMessage("Password reset email sent. Check your inbox.");
      setIsSuccess(true);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#080a0f] text-slate-900 dark:text-slate-100 relative overflow-hidden flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-950 dark:selection:text-indigo-200 transition-colors duration-200">
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-100/40 dark:bg-purple-950/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-50/60 dark:bg-indigo-950/30 rounded-full blur-3xl pointer-events-none -z-10" />

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
          href="/login"
          className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>&larr;</span>
          <span>Back to login</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-md mx-auto px-4 py-8 flex-1 flex items-center justify-center">
        <div className="w-full bg-white dark:bg-[#12151d] rounded-3xl border border-slate-200/90 dark:border-white/10 p-8 sm:p-10 shadow-xl dark:shadow-2xl shadow-indigo-500/5 dark:shadow-indigo-950/40 relative">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Forgot Password
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Enter your email to receive a password reset link
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-5">
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
                  disabled={loading}
                  required
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e14] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all focus:border-[#5B3DF5] focus:ring-3 focus:ring-[#5B3DF5]/15 disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#5B3DF5] to-[#7C5CFC] hover:from-[#4E2DE8] hover:to-[#6B4BE8] py-3.5 text-sm font-bold text-white shadow-md shadow-[#5B3DF5]/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
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
                  Sending reset link...
                </span>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {message && (
              <div
                className={`mt-4 rounded-xl border p-3 text-center text-xs font-medium ${
                  isSuccess
                    ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                    : "border-rose-200 dark:border-rose-900/50 bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                }`}
              >
                {message}
              </div>
            )}

            <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-bold text-[#5B3DF5] dark:text-[#9B7CFC] hover:text-[#4E2DE8] dark:hover:text-[#B49CFC] hover:underline"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </main>

      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-center text-[11px] font-bold tracking-wider text-slate-400/80 dark:text-slate-500 uppercase">
        <span>Sales Pilot Authentication</span>
      </footer>
    </div>
  );
}