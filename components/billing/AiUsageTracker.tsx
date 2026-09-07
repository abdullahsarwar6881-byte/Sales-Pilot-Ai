import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Zap, Sparkles, Layers, DollarSign } from "lucide-react";

export interface AiUsageData {
  messagesUsed: number;
  messageLimit: number;
  responses: number;
  embeddings: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  periodStart: Date;
  periodEnd: Date;
  billingPeriod: string;
}

interface AiUsageTrackerProps {
  usage: AiUsageData;
}

export default function AiUsageTracker({ usage }: AiUsageTrackerProps) {
  const safeUsed = Math.max(0, usage.messagesUsed || 0);
  const safeLimit = Math.max(1, usage.messageLimit || 50);
  const percentage = Math.min(Math.round((safeUsed / safeLimit) * 100), 100);

  // Format dates for display
  const startDateStr = usage.periodStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endDateStr = usage.periodEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Warning thresholds
  const isApproaching = percentage >= 80 && percentage < 90;
  const isCritical = percentage >= 90 && percentage < 100;
  const isLimitReached = percentage >= 100;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-foreground">
              AI Usage & Cost Protection
            </h3>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Usage Period: {startDateStr} – {endDateStr}
          </p>
        </div>

        {/* Status Badge */}
        <div>
          {isLimitReached ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-950/60 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-3.5 w-3.5" />
              Limit Reached (100%)
            </span>
          ) : isCritical ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" />
              Warning: 90%+ Quota Used
            </span>
          ) : isApproaching ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-200/60">
              <AlertTriangle className="h-3.5 w-3.5" />
              Approaching Limit (80%+)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Usage Normal
            </span>
          )}
        </div>
      </div>

      {/* Threshold Warning Banner */}
      {isLimitReached ? (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-4 text-xs sm:text-sm text-red-800 dark:text-red-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Monthly AI conversation limit reached.</p>
            <p className="mt-0.5 opacity-90">
              To protect you from unexpected OpenAI costs, the AI chat widget has paused responding to new visitor inquiries. Upgrade your plan to instantly restore AI customer interactions.
            </p>
          </div>
        </div>
      ) : isCritical || isApproaching ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs sm:text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Approaching monthly message quota ({percentage}% used).</p>
            <p className="mt-0.5 opacity-90">
              You have {Math.max(0, safeLimit - safeUsed).toLocaleString()} AI messages remaining in this billing period.
            </p>
          </div>
        </div>
      ) : null}

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
          <span>AI Messages Consumption</span>
          <span>
            {safeUsed.toLocaleString()} / {safeLimit.toLocaleString()} ({percentage}%)
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isLimitReached
                ? "bg-red-500"
                : isCritical
                ? "bg-amber-500"
                : isApproaching
                ? "bg-amber-400"
                : "bg-indigo-600"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 pt-2">
        {/* Messages */}
        <div className="rounded-xl border border-border/80 bg-background/50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-indigo-500" />
            Messages Used
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {safeUsed.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            of {safeLimit.toLocaleString()} quota
          </p>
        </div>

        {/* Embeddings */}
        <div className="rounded-xl border border-border/80 bg-background/50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-sky-500" />
            Embeddings
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {(usage.embeddings || 0).toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Knowledge searches
          </p>
        </div>

        {/* Tokens */}
        <div className="rounded-xl border border-border/80 bg-background/50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            Tokens Processed
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {(usage.totalTokens || 0).toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Prompt + Completion
          </p>
        </div>

        {/* Cost */}
        <div className="rounded-xl border border-border/80 bg-background/50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            Estimated AI Cost
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            ${(usage.estimatedCost || 0).toFixed(4)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tracked OpenAI usage
          </p>
        </div>
      </div>
    </div>
  );
}
