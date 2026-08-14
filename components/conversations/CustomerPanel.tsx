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
  onTakeOver,
  onReturnToAI,
  onResolve,
  onReopen,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* =================================================
          CUSTOMER HEADER
      ================================================= */}

      <div className="flex flex-col items-center">

        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-3xl font-bold text-white">
          {customerName.charAt(0).toUpperCase()}
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-900">
          {customerName}
        </h2>

        <span className="mt-2 rounded-full bg-emerald-100 px-4 py-1 text-sm font-medium text-emerald-700">
          ● Online
        </span>

      </div>

      {/* =================================================
          CUSTOMER INFORMATION
      ================================================= */}

      <div className="mt-8 space-y-5">

        <InfoRow
          icon={<Mail size={18} />}
          title="Email"
          value="visitor@example.com"
        />

        <InfoRow
          icon={<Globe size={18} />}
          title="Country"
          value="Pakistan"
        />

        <InfoRow
          icon={<Monitor size={18} />}
          title="Browser"
          value="Google Chrome"
        />

        <InfoRow
          icon={<FileText size={18} />}
          title="Current Page"
          value="/products"
        />

      </div>

      {/* =================================================
          KNOWLEDGE USED
      ================================================= */}

      <div className="mt-8 rounded-2xl bg-slate-50 p-4">

        <div className="flex items-center gap-2">

          <Brain
            size={18}
            className="text-indigo-600"
          />

          <h3 className="font-semibold text-slate-900">
            Knowledge Used
          </h3>

        </div>

        <div className="mt-4 space-y-2">

          <span className="block rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
            Shipping Policy
          </span>

          <span className="block rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
            Return Policy
          </span>

          <span className="block rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
            Product FAQ
          </span>

        </div>

      </div>

      {/* =================================================
          AI CONFIDENCE
      ================================================= */}

      <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">

        <div className="flex items-center justify-between">

          <span className="font-medium text-slate-700">
            AI Confidence
          </span>

          <span className="text-lg font-bold text-indigo-600">
            98%
          </span>

        </div>

      </div>

      {/* =================================================
          CONVERSATION STATUS
      ================================================= */}

      <div className="mt-8">

        {isResolved ? (

          <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">

            <CheckCircle2 size={17} />

            Conversation Resolved

          </div>

        ) : isAI ? (

          <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-700">

            <Bot size={17} />

            AI is handling this conversation

          </div>

        ) : (

          <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-indigo-100 px-4 py-3 text-sm font-medium text-indigo-700">

            <UserRound size={17} />

            You are handling this conversation

          </div>

        )}

      </div>

      {/* =================================================
          MAIN ACTION
      ================================================= */}

      {!isResolved && isAI && (
        <button
          type="button"
          onClick={onTakeOver}
          disabled={actionLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 py-3 font-semibold text-white shadow-sm transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >

          <UserRound size={18} />

          {actionLoading
            ? "Taking Over..."
            : "Take Over Conversation"}

        </button>
      )}

      {/* =================================================
          HUMAN CONTROLS
      ================================================= */}

      {!isResolved && !isAI && (
        <div className="mt-2 space-y-3">

          <button
            type="button"
            onClick={onReturnToAI}
            disabled={actionLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <Bot size={18} />

            {actionLoading
              ? "Returning..."
              : "Return to AI"}

          </button>

          <button
            type="button"
            onClick={onResolve}
            disabled={actionLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <CheckCircle2 size={18} />

            {actionLoading
              ? "Resolving..."
              : "Resolve Conversation"}

          </button>

        </div>
      )}

      {/* =================================================
          REOPEN
      ================================================= */}

      {isResolved && (
        <button
          type="button"
          onClick={onReopen}
          disabled={actionLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >

          <RotateCcw size={18} />

          {actionLoading
            ? "Reopening..."
            : "Reopen Conversation"}

        </button>
      )}

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
    <div className="flex items-center gap-4">

      <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
        {icon}
      </div>

      <div>

        <p className="text-sm text-slate-500">
          {title}
        </p>

        <p className="font-semibold text-slate-900">
          {value}
        </p>

      </div>

    </div>
  );
}