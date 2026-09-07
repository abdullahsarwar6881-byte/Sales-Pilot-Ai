"use client";

import { useEffect, useState } from "react";
import { Bot, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

export default function AIStatusCard() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const search = searchParams?.toString();
  const conversationsHref = search ? `/dashboard/conversations?${search}` : "/dashboard/conversations";

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Verify if user has knowledge pages indexed
      const { count } = await supabase
        .from("knowledge_pages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      setIsOnline((count ?? 0) >= 0);
    } catch (err) {
      console.error("AI Status check error:", err);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] p-6 sm:p-7 shadow-2xs transition-colors h-full flex flex-col justify-between">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-slate-900 dark:text-white" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Sales Pilot AI
          </h3>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100/80 dark:border-emerald-800/40">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{isOnline ? "Online" : "Configuring"}</span>
        </div>
      </div>

      {/* Middle Interactive Status Message */}
      <div className="my-5 rounded-2xl border border-indigo-100/70 dark:border-purple-900/30 bg-indigo-50/40 dark:bg-purple-950/20 p-4 flex items-center gap-3.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/70 text-[#5B3DF5] dark:text-[#9B7CFC] shrink-0">
          <Bot size={22} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
            Your AI employee is ready to help!
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Keep growing your business. 🚀
          </p>
        </div>
      </div>

      {/* Action CTA Button */}
      <Link
        href={conversationsHref}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5B3DF5] to-[#7C5CFC] hover:from-[#4E2DE8] hover:to-[#6B4BE8] py-3.5 text-xs font-bold text-white shadow-sm shadow-[#5B3DF5]/20 transition-all duration-150 active:scale-[0.99]"
      >
        <span>Go to Conversations</span>
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}