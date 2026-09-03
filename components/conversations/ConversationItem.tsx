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
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-2.5 text-left transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        active
          ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-foreground shadow-xs ring-1 ring-indigo-500/30"
          : "border-theme bg-card hover:bg-hover text-foreground/90 active:bg-slate-100 dark:active:bg-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-xs">
              {conversation.name.charAt(0).toUpperCase()}
            </div>

            {conversation.online && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
              {conversation.name}
            </h3>

            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {conversation.lastMessage || "No messages yet"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock3 size={10} />
            {conversation.time}
          </div>

          <div className="flex items-center gap-1">
            <span
              className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                conversation.ai
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                  : "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300"
              }`}
            >
              {conversation.ai ? (
                <>
                  <Bot size={10} />
                  AI
                </>
              ) : (
                <>
                  <User size={10} />
                  Human
                </>
              )}
            </span>

            {conversation.unread > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                {conversation.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}