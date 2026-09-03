"use client";

import MessageBubble, { ChatMessage } from "./MessageBubble";
import MessageInput from "./MessageInput";
import {
  Bot,
  Circle,
  UserRound,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface Props {
  customerName: string;
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isHuman?: boolean;
  isResolved?: boolean;
  actionLoading?: boolean;
  onTakeOver?: () => void;
  onReturnToAI?: () => void;
  onResolve?: () => void;
  onReopen?: () => void;
}

export default function ChatWindow({
  customerName,
  messages,
  onSend,
  isHuman = false,
  isResolved = false,
  actionLoading = false,
  onTakeOver,
  onReturnToAI,
  onResolve,
  onReopen,
}: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-theme bg-card shadow-xs transition-colors">
      {/* =================================================
          HEADER
      ================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme bg-card px-4 py-2.5">
        {/* CUSTOMER */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-bold text-white shadow-xs">
            {customerName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
              {customerName}
            </h2>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Circle
                size={8}
                className="fill-emerald-500 text-emerald-500"
              />
              Online
            </div>
          </div>
        </div>

        {/* =================================================
            AI / HUMAN STATUS & CONTROLS
        ================================================= */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isResolved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <CheckCircle2 size={13} />
              Resolved
            </span>
          ) : isHuman ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-950/60 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-300">
              <UserRound size={13} />
              Human Handling
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Bot size={13} />
              AI Handling
            </span>
          )}

          {/* Action buttons */}
          {!isResolved && isHuman && onReturnToAI && (
            <button
              type="button"
              onClick={onReturnToAI}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 transition-all active:scale-95 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Bot size={13} />
              Return to AI
            </button>
          )}

          {!isResolved && !isHuman && onTakeOver && (
            <button
              type="button"
              onClick={onTakeOver}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-2.5 py-1 text-xs font-medium text-white shadow-xs transition-all active:scale-95 hover:brightness-105 disabled:opacity-50"
            >
              <UserRound size={13} />
              Take Over
            </button>
          )}

          {isResolved && onReopen && (
            <button
              type="button"
              onClick={onReopen}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-theme bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-all active:scale-95 hover:bg-hover disabled:opacity-50"
            >
              <RotateCcw size={13} />
              Reopen
            </button>
          )}

          {!isResolved && onResolve && (
            <button
              type="button"
              onClick={onResolve}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-theme bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-all active:scale-95 hover:bg-hover disabled:opacity-50"
            >
              <CheckCircle2 size={13} />
              Resolve
            </button>
          )}
        </div>
      </div>

      {/* =================================================
          MESSAGES
      ================================================= */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3.5 sm:p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground">
              No messages yet.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
            />
          ))
        )}
      </div>

      {/* =================================================
          INPUT
      ================================================= */}
      <MessageInput onSend={onSend} />
    </div>
  );
}