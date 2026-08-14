"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import {
  Bot,
  Activity,
  Database,
  Zap,
  CheckCircle2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function AIStatusCard() {
  const supabase = createClient();

  const [responseTime, setResponseTime] = useState(0);
  const [aiReplies, setAiReplies] = useState(0);
  const [knowledge, setKnowledge] = useState(0);
  const [successRate, setSuccessRate] = useState(0);

  // ----------------------------------------
  // LOAD DATA
  // ----------------------------------------

  useEffect(() => {
    loadAIStatus();
  }, []);

  async function loadAIStatus() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // --------------------------------------
      // CONVERSATIONS
      // --------------------------------------

      const {
        data: conversations,
        error: conversationError,
      } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id);

      if (conversationError) {
        console.error(
          "Conversation loading error:",
          conversationError
        );
      }

      if (conversations) {
        // ------------------------------------
        // TODAY'S AI REPLIES
        // ------------------------------------

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const todayReplies = conversations.filter(
          (item) => {
            return (
              item.status === "ai" &&
              new Date(item.created_at) >= today
            );
          }
        ).length;

        setAiReplies(todayReplies);

        // ------------------------------------
        // RESPONSE TIME
        // ------------------------------------

        const totalResponseTime =
          conversations.reduce(
            (sum, item) =>
              sum +
              Number(
                item.response_time ?? 0
              ),
            0
          );

        const avgResponseTime =
          totalResponseTime /
          (conversations.length || 1);

        setResponseTime(
          Number(
            avgResponseTime.toFixed(1)
          )
        );

        // ------------------------------------
        // SUCCESS RATE
        // ------------------------------------

        const resolved =
          conversations.filter(
            (item) =>
              item.status === "ai"
          ).length;

        const rate =
          conversations.length > 0
            ? Math.round(
                (resolved /
                  conversations.length) *
                  100
              )
            : 0;

        setSuccessRate(rate);
      }

      // --------------------------------------
      // KNOWLEDGE
      // --------------------------------------

      const {
        count,
        error: knowledgeError,
      } = await supabase
        .from("knowledge_pages")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id);

      if (knowledgeError) {
        console.error(
          "Knowledge loading error:",
          knowledgeError
        );
      }

      setKnowledge(count ?? 0);
    } catch (error) {
      console.error(
        "AI status loading error:",
        error
      );
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{
        duration: 0.2,
      }}
      className="
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-6
        text-slate-900
        shadow-sm
        transition-colors
        duration-300

        dark:border-slate-800
        dark:bg-slate-900
        dark:text-slate-100
        dark:shadow-black/20
      "
    >
      {/* ====================================== */}
      {/* AI HEADER */}
      {/* ====================================== */}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">

          {/* AI ICON */}

          <div
            className="
              flex
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-gradient-to-br
              from-indigo-500
              to-violet-600
              text-white
              shadow-lg
              shadow-indigo-500/20
            "
          >
            <Bot size={24} />
          </div>

          {/* AI INFORMATION */}

          <div>
            <h2
              className="
                text-lg
                font-bold
                text-slate-900
                transition-colors
                duration-300

                dark:text-white
              "
            >
              Sales Pilot AI
            </h2>

            <p
              className="
                mt-1
                text-sm
                font-medium
                text-emerald-600

                dark:text-emerald-400
              "
            >
              ● Online &amp; Ready
            </p>
          </div>
        </div>

        {/* HEALTHY */}

        <span
          className="
            rounded-full
            bg-emerald-100
            px-4
            py-2
            text-sm
            font-semibold
            text-emerald-700
            transition-colors
            duration-300

            dark:bg-emerald-950/60
            dark:text-emerald-300
          "
        >
          Healthy
        </span>
      </div>

      {/* ====================================== */}
      {/* STATISTICS */}
      {/* ====================================== */}

      <div
        className="
          mt-7
          grid
          grid-cols-2
          gap-4
        "
      >

        {/* RESPONSE TIME */}

        <div
          className="
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            p-5
            transition-colors
            duration-300

            dark:border-slate-800
            dark:bg-slate-950
          "
        >
          <div className="flex items-start gap-3">

            <Activity
              size={20}
              className="
                mt-0.5
                shrink-0
                text-indigo-500

                dark:text-indigo-400
              "
            />

            <div>
              <p
                className="
                  text-sm
                  font-medium
                  text-slate-500

                  dark:text-slate-400
                "
              >
                Response
                <br />
                Time
              </p>

              <p
                className="
                  mt-4
                  text-3xl
                  font-bold
                  text-slate-900

                  dark:text-white
                "
              >
                {responseTime}s
              </p>
            </div>
          </div>
        </div>

        {/* AI REPLIES */}

        <div
          className="
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            p-5
            transition-colors
            duration-300

            dark:border-slate-800
            dark:bg-slate-950
          "
        >
          <div className="flex items-start gap-3">

            <Zap
              size={20}
              className="
                mt-0.5
                shrink-0
                text-amber-500

                dark:text-amber-400
              "
            />

            <div>
              <p
                className="
                  text-sm
                  font-medium
                  text-slate-500

                  dark:text-slate-400
                "
              >
                AI Replies
                <br />
                Today
              </p>

              <p
                className="
                  mt-4
                  text-3xl
                  font-bold
                  text-slate-900

                  dark:text-white
                "
              >
                {aiReplies}
              </p>
            </div>
          </div>
        </div>

        {/* KNOWLEDGE */}

        <div
          className="
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            p-5
            transition-colors
            duration-300

            dark:border-slate-800
            dark:bg-slate-950
          "
        >
          <div className="flex items-start gap-3">

            <Database
              size={20}
              className="
                mt-0.5
                shrink-0
                text-cyan-500

                dark:text-cyan-400
              "
            />

            <div>
              <p
                className="
                  text-sm
                  font-medium
                  text-slate-500

                  dark:text-slate-400
                "
              >
                Knowledge
              </p>

              <p
                className="
                  mt-4
                  text-3xl
                  font-bold
                  text-slate-900

                  dark:text-white
                "
              >
                {knowledge}
              </p>
            </div>
          </div>
        </div>

        {/* SUCCESS RATE */}

        <div
          className="
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            p-5
            transition-colors
            duration-300

            dark:border-slate-800
            dark:bg-slate-950
          "
        >
          <div className="flex items-start gap-3">

            <CheckCircle2
              size={20}
              className="
                mt-0.5
                shrink-0
                text-emerald-500

                dark:text-emerald-400
              "
            />

            <div>
              <p
                className="
                  text-sm
                  font-medium
                  text-slate-500

                  dark:text-slate-400
                "
              >
                Success
                <br />
                Rate
              </p>

              <p
                className="
                  mt-4
                  text-3xl
                  font-bold
                  text-slate-900

                  dark:text-white
                "
              >
                {successRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================== */}
      {/* AI STATUS */}
      {/* ====================================== */}

      <div
        className="
          mt-6
          rounded-2xl
          border
          border-indigo-100
          bg-indigo-50
          p-5
          transition-colors
          duration-300

          dark:border-indigo-900/50
          dark:bg-indigo-950/40
        "
      >
        <div className="flex items-start gap-3">

          <Bot
            size={20}
            className="
              mt-0.5
              shrink-0
              text-indigo-600

              dark:text-indigo-400
            "
          />

          <div>
            <h3
              className="
                font-semibold
                text-indigo-900

                dark:text-indigo-100
              "
            >
              AI Status
            </h3>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-indigo-700

                dark:text-indigo-200
              "
            >
              Your AI agent is online and
              responding using your
              knowledge base.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}