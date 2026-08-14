"use client";

import { Bot, User, Clock3 } from "lucide-react";
import { motion } from "framer-motion";

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  ai: boolean;
  online: boolean;
}

interface Props {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}

export default function ConversationItem({
  conversation,
  active,
  onClick,
}: Props) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        active
          ? "border-indigo-500 bg-indigo-50 shadow-md"
          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between">

        <div className="flex items-center gap-3">

          <div className="relative">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
              {conversation.name.charAt(0)}
            </div>

            {conversation.online && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            )}

          </div>

          <div>

            <h3 className="font-semibold text-slate-900">
              {conversation.name}
            </h3>

            <p className="mt-1 line-clamp-1 text-sm text-slate-500">
              {conversation.lastMessage}
            </p>

          </div>

        </div>

        <div className="flex flex-col items-end gap-2">

          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock3 size={12} />
            {conversation.time}
          </div>

          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              conversation.ai
                ? "bg-emerald-100 text-emerald-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {conversation.ai ? (
              <>
                <Bot size={12} />
                AI
              </>
            ) : (
              <>
                <User size={12} />
                Human
              </>
            )}
          </span>

          {conversation.unread > 0 && (
            <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-600 px-2 text-xs font-bold text-white">
              {conversation.unread}
            </div>
          )}

        </div>

      </div>
    </motion.button>
  );
}