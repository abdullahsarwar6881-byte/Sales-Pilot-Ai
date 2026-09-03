"use client";

import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";

export interface ChatMessage {
  id: string;
  sender: "ai" | "customer";
  message: string;
  time: string;
}

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({
  message,
}: Props) {
  const isAI = message.sender === "ai";

  return (
    <div
      className={`flex ${
        isAI ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className={`flex max-w-[85%] sm:max-w-[80%] gap-2.5 ${
          isAI ? "" : "flex-row-reverse"
        }`}
      >
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-xs ${
            isAI
              ? "bg-gradient-to-br from-indigo-600 to-violet-600"
              : "bg-slate-700 dark:bg-slate-600"
          }`}
        >
          {isAI ? (
            <Bot size={14} />
          ) : (
            <User size={14} />
          )}
        </div>

        <div>
          <div
            className={`rounded-2xl px-3.5 py-2 text-xs sm:text-sm shadow-xs transition-colors ${
              isAI
                ? "bg-card border border-theme text-card-foreground"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
            }`}
          >
            <p className="leading-relaxed whitespace-pre-wrap">
              {message.message}
            </p>
          </div>

          <p
            className={`mt-1 text-[10px] text-muted-foreground ${
              isAI
                ? "text-left"
                : "text-right"
            }`}
          >
            {message.time}
          </p>
        </div>
      </div>
    </div>
  );
}