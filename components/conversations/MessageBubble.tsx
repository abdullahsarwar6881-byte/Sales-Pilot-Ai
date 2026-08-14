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
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className={`flex ${
        isAI ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className={`flex max-w-[75%] gap-3 ${
          isAI ? "" : "flex-row-reverse"
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
            isAI
              ? "bg-gradient-to-br from-indigo-600 to-violet-600"
              : "bg-slate-800"
          }`}
        >
          {isAI ? (
            <Bot size={18} />
          ) : (
            <User size={18} />
          )}
        </div>

        <div>
          <div
            className={`rounded-3xl px-5 py-4 shadow-sm ${
              isAI
                ? "bg-white border border-slate-200 text-slate-900"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
            }`}
          >
            <p className="leading-7">
              {message.message}
            </p>
          </div>

          <p
            className={`mt-2 text-xs text-slate-400 ${
              isAI
                ? "text-left"
                : "text-right"
            }`}
          >
            {message.time}
          </p>
        </div>
      </div>
    </motion.div>
  );
}