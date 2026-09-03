"use client";

import { MessageCircleMore } from "lucide-react";
import { motion } from "framer-motion";

export default function EmptyState() {
  return (
    <div
      className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-theme bg-card text-center p-6 transition-colors"
    >
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-3.5 text-white shadow-xs">
        <MessageCircleMore size={28} />
      </div>

      <h2 className="mt-3.5 text-base font-bold text-foreground">
        No Conversations Yet
      </h2>

      <p className="mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
        Customer conversations will automatically appear here once visitors start chatting with your AI assistant.
      </p>
    </div>
  );
}