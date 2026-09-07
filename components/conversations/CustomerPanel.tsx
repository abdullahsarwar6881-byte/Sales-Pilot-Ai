"use client";

import { useState } from "react";
import {
  Mail,
  Globe,
  Monitor,
  FileText,
  MapPin,
  Calendar,
  Clock,
  Brain,
  UserRound,
  Bot,
  CheckCircle2,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface Props {
  customerName: string;
  isAI: boolean;
  isResolved: boolean;
  actionLoading?: boolean;
  customerEmail?: string;
  location?: string;
  firstSeen?: string;
  lastActivity?: string;
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
  location,
  firstSeen,
  lastActivity,
  onTakeOver,
  onReturnToAI,
  onResolve,
  onReopen,
}: Props) {
  const [knowledgeOpen, setKnowledgeOpen] = useState(true);
  const initial = customerName.charAt(0).toUpperCase() || "W";

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] shadow-xs flex flex-col h-full min-h-0 overflow-hidden transition-colors">
      {/* 1. Header: Customer Details */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-white/5">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
          Customer Details
        </h2>

        {/* Avatar & Name Summary */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5B3DF5] text-sm font-black text-white shadow-xs">
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {customerName}
            </h3>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active Session</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {/* INFO ROWS */}
        <div className="space-y-3">
          <InfoRow
            icon={<Mail size={14} />}
            title="EMAIL"
            value={customerEmail || "Anonymous visitor"}
          />

          <InfoRow
            icon={<Globe size={14} />}
            title="CHANNEL"
            value="Online Storefront"
          />

          <InfoRow
            icon={<Monitor size={14} />}
            title="DEVICE"
            value="Web Browser"
          />

          <InfoRow
            icon={<FileText size={14} />}
            title="SESSION STATUS"
            value={isResolved ? "Resolved" : "Live conversation"}
          />

          <InfoRow
            icon={<MapPin size={14} />}
            title="LOCATION"
            value={location || "—"}
          />

          <InfoRow
            icon={<Calendar size={14} />}
            title="FIRST SEEN"
            value={firstSeen || "—"}
          />

          <InfoRow
            icon={<Clock size={14} />}
            title="LAST ACTIVITY"
            value={lastActivity || "Just now"}
          />
        </div>

        {/* KNOWLEDGE USED SECTION */}
        <div className="rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/80 dark:border-purple-900/30 p-3.5 transition-all">
          <button
            type="button"
            onClick={() => setKnowledgeOpen(!knowledgeOpen)}
            className="flex w-full items-center justify-between text-xs font-bold text-slate-900 dark:text-white select-none"
          >
            <div className="flex items-center gap-1.5">
              <Brain size={15} className="text-[#5B3DF5] dark:text-[#9B7CFC]" />
              <span>Knowledge Used</span>
            </div>
            {knowledgeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {knowledgeOpen && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-white dark:bg-[#181b24] border border-purple-200/60 dark:border-purple-800/40 px-2 py-0.5 text-[10px] font-bold text-[#5B3DF5] dark:text-[#9B7CFC] shadow-2xs">
                ⚙ Products
              </span>
              <span className="rounded-lg bg-white dark:bg-[#181b24] border border-purple-200/60 dark:border-purple-800/40 px-2 py-0.5 text-[10px] font-bold text-[#5B3DF5] dark:text-[#9B7CFC] shadow-2xs">
                Pricing
              </span>
              <span className="rounded-lg bg-white dark:bg-[#181b24] border border-purple-200/60 dark:border-purple-800/40 px-2 py-0.5 text-[10px] font-bold text-[#5B3DF5] dark:text-[#9B7CFC] shadow-2xs">
                Contact Information
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Fixed Actions Footer */}
      <div className="shrink-0 p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 space-y-2">
        {isResolved ? (
          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 dark:bg-white/10 px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400">
            <CheckCircle2 size={14} />
            <span>Conversation Resolved</span>
          </div>
        ) : isAI ? (
          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
            <Bot size={14} />
            <span>AI Handling</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 px-3 py-2.5 text-xs font-bold text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40">
            <UserRound size={14} />
            <span>Human Handling</span>
          </div>
        )}

        {!isResolved && isAI && (
          <button
            type="button"
            onClick={onTakeOver}
            disabled={actionLoading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <UserRound size={14} />
            <span>{actionLoading ? "Taking Over..." : "Take Over Conversation"}</span>
          </button>
        )}

        {!isResolved && !isAI && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onReturnToAI}
              disabled={actionLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 py-2 text-xs font-bold text-[#5B3DF5] dark:text-[#9B7CFC] transition-all active:scale-95 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Bot size={14} />
              <span>{actionLoading ? "Returning..." : "Return to AI"}</span>
            </button>

            <button
              type="button"
              onClick={onResolve}
              disabled={actionLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              <span>{actionLoading ? "Resolving..." : "Resolve Conversation"}</span>
            </button>
          </div>
        )}

        {isResolved && (
          <button
            type="button"
            onClick={onReopen}
            disabled={actionLoading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            <span>{actionLoading ? "Reopening..." : "Reopen Conversation"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

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
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
          {title}
        </p>

        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
          {value}
        </p>
      </div>
    </div>
  );
}