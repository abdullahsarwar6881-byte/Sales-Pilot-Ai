"use client";

import { Bot, User } from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: "ai" | "customer" | "human" | string;
  role?: string;
  message: string;
  time: string;
}

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({
  message,
}: Props) {
  const isAI = message.sender === "ai" || message.role === "assistant";
  const isHuman = message.sender === "human";

  return (
    <div
      className={`flex w-full ${
        isAI ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className={`flex max-w-[88%] sm:max-w-[80%] md:max-w-[75%] gap-2.5 items-start ${
          isAI ? "" : "flex-row-reverse"
        }`}
      >
        {/* Avatar */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs ${
            isAI
              ? "bg-[#5B3DF5]"
              : isHuman
              ? "bg-gradient-to-br from-orange-500 to-amber-600"
              : "bg-slate-800 dark:bg-slate-700 rounded-full"
          }`}
        >
          {isAI ? (
            <Bot size={15} />
          ) : (
            <User size={15} />
          )}
        </div>

        {/* Message Content & Info */}
        <div className="min-w-0 flex-1">
          {/* Author Name */}
          <div
            className={`flex items-center gap-1.5 mb-1 px-1 ${
              isAI ? "justify-start" : "justify-end"
            }`}
          >
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
              {isAI ? "AI Assistant" : isHuman ? "Staff Member" : "Customer"}
            </span>
          </div>

          {/* Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-2xs transition-colors break-words ${
              isAI
                ? "bg-white dark:bg-[#181b24] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-slate-100 leading-relaxed"
                : isHuman
                ? "bg-orange-500 text-white leading-relaxed"
                : "bg-[#5B3DF5] text-white leading-relaxed font-medium"
            }`}
          >
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.message}
            </p>
          </div>

          {/* Timestamp */}
          <p
            className={`mt-1 text-[10px] text-slate-400 dark:text-slate-500 px-1 font-medium ${
              isAI ? "text-left" : "text-right"
            }`}
          >
            {message.time}
          </p>
        </div>
      </div>
    </div>
  );
}