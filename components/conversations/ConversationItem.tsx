"use client";

import { Bot, User } from "lucide-react";

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  ai: boolean;
  online: boolean;
  status?: string;
  customerEmail?: string | null;
  updatedAt?: string;
  createdAt?: string;
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
  const isResolved = conversation.status === "resolved";
  const initial = conversation.name.charAt(0).toUpperCase() || "W";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-3 text-left transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5] ${
        active
          ? "border-[#5B3DF5] bg-purple-50/70 dark:bg-purple-950/30 shadow-xs ring-1 ring-[#5B3DF5]/30"
          : "border-slate-100 dark:border-white/5 bg-white dark:bg-[#12151d] hover:bg-slate-50 dark:hover:bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2.5">
        {/* Left: Avatar + Name & Last Message */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B3DF5] text-xs font-black text-white shadow-xs">
              {initial}
            </div>

            {conversation.online && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#12151d] bg-emerald-500" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">
              {conversation.name}
            </h3>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              {conversation.lastMessage || "No messages yet"}
            </p>
          </div>
        </div>

        {/* Right: Timestamp & Status Badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {conversation.time}
          </span>

          <div>
            {isResolved ? (
              <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                Resolved
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  conversation.ai
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40"
                    : "bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800/40"
                }`}
              >
                {conversation.ai ? (
                  <>
                    <Bot size={11} />
                    <span>AI</span>
                  </>
                ) : (
                  <>
                    <User size={11} />
                    <span>Human</span>
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}