"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PerformanceCard() {
  const supabase = createClient();

  const [accuracy, setAccuracy] = useState(0);
  const [resolved, setResolved] = useState(0);
  const [replyTime, setReplyTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, []);

  async function loadPerformance() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // 1. Check ai_usage table
      const { data: usage } = await supabase
        .from("ai_usage")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2. Also check conversations table for exact counts
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, status, assigned_to, response_time")
        .or(`profile_id.eq.${user.id},user_id.eq.${user.id}`);

      const totalConvs = conversations?.length || 0;
      const resolvedConvs =
        conversations?.filter(
          (c) => c.status === "resolved" || (c.assigned_to === "ai" && c.status === "open")
        ).length || 0;

      if (usage) {
        setAccuracy(Number(usage.accuracy ?? 0));
        setResolved(Number(usage.resolved_count ?? resolvedConvs));
        setReplyTime(Number(usage.avg_reply_time ?? 0));
      } else if (totalConvs > 0) {
        // Real calculate from conversations if ai_usage not generated yet
        const rate = Math.round((resolvedConvs / totalConvs) * 100);
        setAccuracy(rate);
        setResolved(resolvedConvs);
        setReplyTime(1);
      } else {
        setAccuracy(0);
        setResolved(0);
        setReplyTime(0);
      }
    } catch (error) {
      console.error("Failed to load AI performance:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] p-6 sm:p-7 shadow-2xs transition-colors flex flex-col justify-between h-full"
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            AI Performance
          </p>

          <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {accuracy}%
          </h2>

          <p className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            AI performance score
          </p>
        </div>

        {/* AI Robot Icon Container */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5B3DF5] text-white shadow-md shadow-[#5B3DF5]/20 shrink-0">
          <Bot size={24} />
        </div>
      </div>

      {/* AI Accuracy Row */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100/80 dark:border-white/5 pt-3.5">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
          AI Accuracy
        </p>
        <p className="text-xs font-black text-slate-900 dark:text-white">
          {accuracy}%
        </p>
      </div>

      {/* Two Statistics Boxes */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-3.5">
        {/* Resolved Box */}
        <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/5 p-3.5 sm:p-4 transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Resolved</span>
          </div>

          <p className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">
            {resolved}
          </p>
        </div>

        {/* Avg Reply Box */}
        <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/5 p-3.5 sm:p-4 transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Clock size={14} className="text-amber-500 shrink-0" />
            <span>Avg Reply</span>
          </div>

          <p className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">
            {replyTime}s
          </p>
        </div>
      </div>
    </motion.div>
  );
}