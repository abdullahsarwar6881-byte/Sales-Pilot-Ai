"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    console.log("Update response:", { data, error });

    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage("✅ Password updated successfully. You can now log in.");
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={updatePassword}
        className="w-full max-w-md rounded-2xl border border-theme bg-card p-8 shadow-xl"
      >
        <h1 className="mb-2 text-center text-3xl font-bold text-foreground">
          Create New Password
        </h1>

        <p className="mb-6 text-center text-sm text-muted-foreground">
          Enter a new secure password for your account
        </p>

        <label className="mb-1 block text-xs font-semibold text-foreground">
          New Password
        </label>
        <input
          type="password"
          placeholder="••••••••"
          className="mb-6 w-full rounded-xl border border-theme bg-input p-3 text-foreground placeholder:text-muted-foreground outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 p-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        {message && (
          <div className="mt-4 rounded-xl border border-theme bg-surface-elevated p-3 text-center text-sm text-foreground">
            {message}
          </div>
        )}
      </form>
    </div>
  );
}