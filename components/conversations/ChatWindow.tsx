"use client";

import { useEffect, useRef } from "react";
import MessageBubble, { ChatMessage } from "./MessageBubble";
import MessageInput from "./MessageInput";
import {
  Bot,
  Circle,
  UserRound,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";

interface Props {
  conversationId?: string;
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
  onBack?: () => void;
}

export default function ChatWindow({
  conversationId,
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
  onBack,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevConvoIdRef = useRef(conversationId);
  const prevLengthRef = useRef(messages.length);

  // Track if user is scrolled near bottom
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Considered near bottom if within 80px of bottom
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    if (!scrollContainerRef.current) return;
    const { scrollHeight, clientHeight } = scrollContainerRef.current;
    if (behavior === "smooth") {
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: "smooth",
      });
    } else {
      scrollContainerRef.current.scrollTop = scrollHeight;
    }
  };

  // When conversation ID or customer changes, force instant scroll to bottom
  useEffect(() => {
    if (prevConvoIdRef.current !== conversationId) {
      prevConvoIdRef.current = conversationId;
      isNearBottomRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      });
    }
  }, [conversationId]);

  // When messages update: if initial load or user is at bottom, scroll down
  useEffect(() => {
    const isInitialLoad = prevLengthRef.current === 0 && messages.length > 0;
    const isMessageAdded = messages.length > prevLengthRef.current;
    prevLengthRef.current = messages.length;

    if (isInitialLoad) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      });
    } else if (isMessageAdded && isNearBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] shadow-xs transition-colors">
      {/* =================================================
          FIXED CHAT HEADER
      ================================================= */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#12151d] px-4 py-3">
        {/* CUSTOMER INFO */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Back to inbox"
              className="lg:hidden flex items-center justify-center h-8 w-8 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#5B3DF5] text-xs font-black text-white shadow-xs">
            {customerName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {customerName}
            </h2>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <Circle
                size={7}
                className="fill-emerald-500 text-emerald-500"
              />
              <span>Online</span>
            </div>
          </div>
        </div>

        {/* =================================================
            AI / HUMAN STATUS & ACTION CONTROLS
        ================================================= */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isResolved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              <CheckCircle2 size={13} />
              <span>Resolved</span>
            </span>
          ) : isHuman ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-950/60 px-2.5 py-1 text-xs font-bold text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40">
              <UserRound size={13} />
              <span>Human Handling</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              <Bot size={13} />
              <span>AI Handling</span>
            </span>
          )}

          {/* Action buttons */}
          {!isResolved && isHuman && onReturnToAI && (
            <button
              type="button"
              onClick={onReturnToAI}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 text-xs font-bold text-[#5B3DF5] dark:text-[#9B7CFC] transition-all active:scale-95 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Bot size={13} />
              <span>Return to AI</span>
            </button>
          )}

          {!isResolved && !isHuman && onTakeOver && (
            <button
              type="button"
              onClick={onTakeOver}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-xs transition-all active:scale-95 hover:brightness-105 disabled:opacity-50"
            >
              <UserRound size={13} />
              <span>Take Over</span>
            </button>
          )}

          {isResolved && onReopen && (
            <button
              type="button"
              onClick={onReopen}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <RotateCcw size={13} />
              <span>Reopen</span>
            </button>
          )}

          {!isResolved && onResolve && (
            <button
              type="button"
              onClick={onResolve}
              disabled={actionLoading}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 size={13} />
              <span>Resolve</span>
            </button>
          )}
        </div>
      </div>

      {/* =================================================
          SCROLLABLE MESSAGE HISTORY (Internal Scroll)
      ================================================= */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 space-y-3.5 overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-[#0c0e14]/60 p-4 sm:p-5"
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
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
          FIXED COMPOSER FOOTER
      ================================================= */}
      <div className="shrink-0">
        <MessageInput onSend={onSend} />
      </div>
    </div>
  );
}