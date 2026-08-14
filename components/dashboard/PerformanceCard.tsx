"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Sparkles,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";

export default function PerformanceCard() {
  const supabase = createClient();

  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  const [accuracy, setAccuracy] = useState(0);
  const [resolved, setResolved] = useState(0);
  const [replyTime, setReplyTime] = useState(0);

  // ----------------------------------------
  // MOUNT
  // ----------------------------------------

  useEffect(() => {
    setMounted(true);
  }, []);

  // ----------------------------------------
  // LOAD PERFORMANCE
  // ----------------------------------------

  useEffect(() => {
    loadPerformance();
  }, []);

  async function loadPerformance() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("ai_usage")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "Failed to load AI performance:",
        error
      );

      return;
    }

    if (data) {
      setAccuracy(
        Number(data.accuracy ?? 0)
      );

      setResolved(
        Number(data.resolved_count ?? 0)
      );

      setReplyTime(
        Number(data.avg_reply_time ?? 0)
      );
    }
  }

  // ----------------------------------------
  // THEME
  // ----------------------------------------

  const isDark =
    mounted && resolvedTheme === "dark";

  // ----------------------------------------
  // COLORS
  // ----------------------------------------

  const cardClass = isDark
    ? `
      border-slate-800
      bg-slate-900
      text-slate-100
      shadow-black/20
    `
    : `
      border-slate-200
      bg-white
      text-slate-900
      shadow-sm
    `;

  const labelClass = isDark
    ? "text-slate-400"
    : "text-slate-500";

  const headingClass = isDark
    ? "text-white"
    : "text-slate-900";

  const numberClass = isDark
    ? "text-white"
    : "text-slate-900";

  const statBoxClass = isDark
    ? "bg-slate-950"
    : "bg-slate-50";

  const progressBackgroundClass = isDark
    ? "bg-slate-800"
    : "bg-slate-100";

  const insightClass = isDark
    ? `
      border-indigo-900/50
      bg-indigo-950/40
    `
    : `
      border-indigo-100
      bg-indigo-50
    `;

  const insightTitleClass = isDark
    ? "text-indigo-100"
    : "text-indigo-900";

  const insightTextClass = isDark
    ? "text-indigo-200"
    : "text-indigo-700";

  // ----------------------------------------
  // RENDER
  // ----------------------------------------

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`
        rounded-3xl
        border
        p-6
        shadow-sm
        transition-all
        duration-300

        ${cardClass}
      `}
    >
      {/* -------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------- */}

      <div className="flex items-start justify-between">
        <div>
          <p
            className={`
              text-sm
              font-medium
              ${labelClass}
            `}
          >
            AI Performance
          </p>

          <h2
            className={`
              mt-3
              text-4xl
              font-bold
              tracking-tight
              ${headingClass}
            `}
          >
            {accuracy}%
          </h2>

          <p
            className="
              mt-2
              text-sm
              font-medium
              text-emerald-600
              dark:text-emerald-400
            "
          >
            AI performance score
          </p>
        </div>

        {/* AI ICON */}

        <div
          className="
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            bg-gradient-to-br
            from-violet-500
            to-indigo-600
            text-white
            shadow-lg
            shadow-indigo-500/20
          "
        >
          <Bot size={28} />
        </div>
      </div>

      {/* -------------------------------- */}
      {/* AI ACCURACY */}
      {/* -------------------------------- */}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p
            className={`
              text-sm
              font-medium
              ${labelClass}
            `}
          >
            AI Accuracy
          </p>

          <p
            className={`
              text-sm
              font-bold
              ${numberClass}
            `}
          >
            {accuracy}%
          </p>
        </div>

        {/* Progress background */}

        <div
          className={`
            mt-3
            h-2
            w-full
            overflow-hidden
            rounded-full
            ${progressBackgroundClass}
          `}
        >
          <div
            className="
              h-full
              rounded-full
              bg-gradient-to-r
              from-violet-600
              to-indigo-500
              transition-all
              duration-500
            "
            style={{
              width: `${Math.min(
                Math.max(accuracy, 0),
                100
              )}%`,
            }}
          />
        </div>
      </div>

      {/* -------------------------------- */}
      {/* STATISTICS */}
      {/* -------------------------------- */}

      <div className="mt-7 grid grid-cols-2 gap-4">
        {/* RESOLVED */}

        <div
          className={`
            rounded-2xl
            p-5
            transition-colors
            duration-300
            ${statBoxClass}
          `}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2
              size={21}
              className="
                text-emerald-500
                dark:text-emerald-400
              "
            />

            <p
              className={`
                text-sm
                font-medium
                ${labelClass}
              `}
            >
              Resolved
            </p>
          </div>

          <p
            className={`
              mt-4
              text-3xl
              font-bold
              ${numberClass}
            `}
          >
            {resolved}
          </p>
        </div>

        {/* AVG REPLY */}

        <div
          className={`
            rounded-2xl
            p-5
            transition-colors
            duration-300
            ${statBoxClass}
          `}
        >
          <div className="flex items-center gap-3">
            <Clock3
              size={21}
              className="
                text-amber-500
                dark:text-amber-400
              "
            />

            <p
              className={`
                text-sm
                font-medium
                ${labelClass}
              `}
            >
              Avg Reply
            </p>
          </div>

          <p
            className={`
              mt-4
              text-3xl
              font-bold
              ${numberClass}
            `}
          >
            {replyTime}s
          </p>
        </div>
      </div>

      {/* -------------------------------- */}
      {/* AI INSIGHT */}
      {/* -------------------------------- */}

      <div
        className={`
          mt-6
          rounded-2xl
          border
          p-5
          transition-colors
          duration-300
          ${insightClass}
        `}
      >
        <div className="flex items-start gap-3">
          <Sparkles
            size={20}
            className={`
              mt-0.5
              shrink-0
              ${
                isDark
                  ? "text-indigo-400"
                  : "text-indigo-600"
              }
            `}
          />

          <div>
            <h3
              className={`
                font-semibold
                ${insightTitleClass}
              `}
            >
              AI Insight
            </h3>

            <p
              className={`
                mt-2
                text-sm
                leading-6
                ${insightTextClass}
              `}
            >
              Your AI performance is calculated
              from real usage data.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}