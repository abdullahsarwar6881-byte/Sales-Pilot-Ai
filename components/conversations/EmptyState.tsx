"use client";

import { MessageCircleMore } from "lucide-react";
import { motion } from "framer-motion";

export default function EmptyState() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="flex h-[650px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center"
    >
      <div className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white shadow-lg">
        <MessageCircleMore size={42} />
      </div>

      <h2 className="mt-8 text-2xl font-bold text-slate-900">
        No Conversations Yet
      </h2>

      <p className="mt-3 max-w-sm text-slate-500">
        Customer conversations will automatically appear
        here once visitors start chatting with your AI
        assistant.
      </p>

      <button className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-105">
        View Documentation
      </button>
    </motion.div>
  );
}