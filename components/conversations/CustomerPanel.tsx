"use client";

import {
  Mail,
  Globe,
  Monitor,
  FileText,
  Brain,
  UserRound,
  Bot,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface Props {
  customerName: string;
  isAI: boolean;
  isResolved: boolean;
  actionLoading?: boolean;
  customerEmail?: string;
  onTakeOver: () => void;
  onReturnToAI: () => void;
  onResolve: () => void;
  onReopen: () => void;
}

export default function CustomerPanel({
  customerName,
  isAI,
  isResolved,
  actionLoading = false,
  customerEmail,
  onTakeOver,
  onReturnToAI,
  onResolve,
  onReopen,
}: Props) {
  return (
    <div className="rounded-2xl border border-theme bg-card p-3.5 sm:p-4 shadow-xs flex flex-col h-full overflow-y-auto transition-colors">
      {/* =================================================
          CUSTOMER HEADER
      ================================================= */}
      <div className="flex items-center gap-3 border-b border-theme pb-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-xs">
          {customerName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
            {customerName}
          </h2>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            ● Active Session
          </span>
        </div>
      </div>

      {/* =================================================
          CUSTOMER INFORMATION
      ================================================= */}
      <div className="mt-3 space-y-2.5">
        <InfoRow
          icon={<Mail size={14} />}
          title="Email"
          value={customerEmail || "website.visitor@store.com"}
        />

        <InfoRow
          icon={<Globe size={14} />}
          title="Channel"
          value="Online Storefront"
        />

        <InfoRow
          icon={<Monitor size={14} />}
          title="Device"
          value="Web Browser"
        />

        <InfoRow
          icon={<FileText size={14} />}
          title="Session Status"
          value={isResolved ? "Resolved" : "Live conversation"}
        />
      </div>

      {/* =================================================
          KNOWLEDGE USED
      ================================================= */}
      <div className="mt-3.5 rounded-xl bg-muted/40 border border-theme/60 p-3">
        <div className="flex items-center gap-1.5">
          <Brain
            size={15}
            className="text-indigo-600 dark:text-indigo-400"
          />
          <h3 className="text-xs font-semibold text-foreground">
            Knowledge Used
          </h3>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-card border border-theme px-2 py-1 text-[11px] text-foreground shadow-2xs">
            Product Catalog
          </span>
          <span className="rounded-lg bg-card border border-theme px-2 py-1 text-[11px] text-foreground shadow-2xs">
            Store Policies
          </span>
          <span className="rounded-lg bg-card border border-theme px-2 py-1 text-[11px] text-foreground shadow-2xs">
            AI Memory
          </span>
        </div>
      </div>

      {/* =================================================
          AI CONFIDENCE
      ================================================= */}
      <div className="mt-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            AI Match Confidence
          </span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            98% High
          </span>
        </div>
      </div>

      {/* =================================================
          CONVERSATION STATUS & ACTIONS
      ================================================= */}
      <div className="mt-3 pt-3 border-t border-theme">
        {isResolved ? (
          <div className="mb-2 flex items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
            <CheckCircle2 size={14} />
            Conversation Resolved
          </div>
        ) : isAI ? (
          <div className="mb-2 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Bot size={14} />
            AI Handling
          </div>
        ) : (
          <div className="mb-2 flex items-center justify-center gap-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 px-3 py-2 text-xs font-medium text-orange-700 dark:text-orange-300">
            <UserRound size={14} />
            Human Handling
          </div>
        )}

        {!isResolved && isAI && (
          <button
            type="button"
            onClick={onTakeOver}
            disabled={actionLoading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-2 text-xs font-semibold text-white shadow-xs transition-all active:scale-95 hover:brightness-105 disabled:opacity-50"
          >
            <UserRound size={14} />
            {actionLoading ? "Taking Over..." : "Take Over Conversation"}
          </button>
        )}

        {!isResolved && !isAI && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onReturnToAI}
              disabled={actionLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-all active:scale-95 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Bot size={14} />
              {actionLoading ? "Returning..." : "Return to AI"}
            </button>

            <button
              type="button"
              onClick={onResolve}
              disabled={actionLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-theme bg-card py-2 text-xs font-semibold text-foreground transition-all active:scale-95 hover:bg-hover disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              {actionLoading ? "Resolving..." : "Resolve Conversation"}
            </button>
          </div>
        )}

        {isResolved && (
          <button
            type="button"
            onClick={onReopen}
            disabled={actionLoading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-theme bg-card py-2 text-xs font-semibold text-foreground transition-all active:scale-95 hover:bg-hover disabled:opacity-50"
          >
            <RotateCcw size={14} />
            {actionLoading ? "Reopening..." : "Reopen Conversation"}
          </button>
        )}
      </div>
    </div>
  );
}

// =====================================================
// INFO ROW
// =====================================================

function InfoRow({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {title}
        </p>

        <p className="text-xs font-medium text-foreground truncate">
          {value}
        </p>
      </div>
    </div>
  );
}