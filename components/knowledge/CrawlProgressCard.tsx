"use client";

import React from "react";
import {
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  AlertTriangle,
  X,
  RotateCw,
} from "lucide-react";

export interface CrawlJobRecord {
  id: string;
  user_id: string;
  url?: string;
  website_url?: string;
  status: "pending" | "discovering" | "crawling" | "processing" | "completed" | "failed" | "cancelled" | string;
  total_pages?: number;
  crawled_pages?: number;
  pages_completed?: number;
  completed_pages?: number;
  failed_pages?: number;
  progress_percent?: number;
  started_at?: string;
  completed_at?: string;
  finished_at?: string;
  last_activity_at?: string;
  estimated_total_seconds?: number;
  estimated_seconds?: number;
  elapsed_seconds?: number;
  remaining_seconds?: number | null;
  current_url?: string | null;
  current_page_title?: string | null;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  job: CrawlJobRecord;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function formatETA(
  remainingSeconds: number | null | undefined,
  status: string,
  progressPercent: number
): string {
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  if (status === "discovering") return "Discovering pages...";
  if (
    status === "processing" ||
    progressPercent >= 95 ||
    (remainingSeconds !== null && remainingSeconds !== undefined && remainingSeconds <= 3)
  ) {
    return "Almost finished...";
  }
  if (remainingSeconds === null || remainingSeconds === undefined) {
    return "Calculating ETA...";
  }

  if (remainingSeconds < 10) return "~10 sec";
  if (remainingSeconds < 60) return `~${remainingSeconds} sec`;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (minutes < 60) {
    return seconds > 0 ? `~${minutes} min ${seconds} sec` : `~${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `~${hours} hr ${remainingMins} min`;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "Just started";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function CrawlProgressCard({ job, onDismiss, onRetry }: Props) {
  const targetUrl = job.website_url || job.url || "";
  const status = job.status || "pending";
  const isActive = ["pending", "discovering", "crawling", "processing"].includes(status);
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  const totalPages = Math.max(job.total_pages || 0, 0);
  const crawledPages = job.crawled_pages ?? job.pages_completed ?? 0;
  const failedPages = job.failed_pages || 0;

  const progressPercent =
    isCompleted
      ? 100
      : isFailed
      ? Math.min(100, Math.round((crawledPages / Math.max(totalPages, 1)) * 95))
      : status === "processing"
      ? 96
      : status === "discovering"
      ? Math.min(10, Math.max(2, totalPages > 0 ? 5 : 2))
      : Math.min(95, Math.max(2, Math.round((crawledPages / Math.max(totalPages, 1)) * 95)));

  const remainingSeconds =
    job.remaining_seconds !== undefined ? job.remaining_seconds : job.estimated_seconds;

  const startedTime = job.started_at ? new Date(job.started_at).getTime() : 0;
  const elapsedSeconds =
    job.elapsed_seconds ??
    (startedTime > 0 ? Math.max(0, Math.floor((Date.now() - startedTime) / 1000)) : 0);

  const etaDisplay = formatETA(remainingSeconds, status, progressPercent);
  const elapsedDisplay = formatDuration(elapsedSeconds);

  // Derive human status title
  let statusTitle = "Website Crawling";
  let statusSubtitle = "Crawling your website and learning its content...";
  let badgeColor = "border-indigo-500/30 bg-indigo-500/10 text-indigo-400";

  if (status === "pending") {
    statusTitle = "Preparing Website Crawl";
    statusSubtitle = "Initializing crawler and establishing connection...";
    badgeColor = "border-amber-500/30 bg-amber-500/10 text-amber-400";
  } else if (status === "discovering") {
    statusTitle = "Discovering Website Pages";
    statusSubtitle = `Analyzing sitemaps and site structure (${totalPages > 0 ? totalPages + " pages found" : "scanning..."})`;
    badgeColor = "border-indigo-500/30 bg-indigo-500/10 text-indigo-400";
  } else if (status === "processing") {
    statusTitle = "Processing Knowledge Base";
    statusSubtitle = "Generating semantic embeddings & visual index...";
    badgeColor = "border-purple-500/30 bg-purple-500/10 text-purple-400";
  } else if (isCompleted) {
    statusTitle = "Website Synced Successfully";
    statusSubtitle = `${crawledPages} pages indexed into your AI knowledge base.`;
    badgeColor = "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  } else if (isFailed) {
    statusTitle = "Website Sync Failed";
    statusSubtitle = job.error_message || "An error occurred while crawling this website.";
    badgeColor = "border-rose-500/30 bg-rose-500/10 text-rose-400";
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-theme bg-card p-6 shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            {isActive ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {statusTitle}
              </h3>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>
                {isActive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
                {status.toUpperCase()}
              </span>
            </div>
            {targetUrl && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Globe className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-md">{targetUrl}</span>
              </p>
            )}
          </div>
        </div>

        {/* Dismiss / Actions */}
        <div className="flex items-center gap-2">
          {isFailed && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-hover"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & Percentage */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">{statusSubtitle}</span>
          <span className="font-semibold text-foreground">{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isCompleted
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : isFailed
                ? "bg-gradient-to-r from-rose-500 to-red-600"
                : "bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500"
            }`}
            style={{ width: `${Math.max(3, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Pages Progress */}
        <div className="rounded-xl border border-theme bg-surface/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-indigo-400" />
            <span>Pages Indexed</span>
          </div>
          <div className="mt-1.5 text-sm font-semibold text-foreground">
            {status === "discovering" ? (
              <span>{totalPages} found</span>
            ) : totalPages > 0 ? (
              <span>{crawledPages} / {totalPages}</span>
            ) : (
              <span>{crawledPages} pages</span>
            )}
          </div>
        </div>

        {/* ETA */}
        <div className="rounded-xl border border-theme bg-surface/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-purple-400" />
            <span>Estimated Time</span>
          </div>
          <div className="mt-1.5 text-sm font-semibold text-foreground truncate" title={etaDisplay}>
            {etaDisplay}
          </div>
        </div>

        {/* Elapsed Time */}
        <div className="rounded-xl border border-theme bg-surface/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Elapsed Time</span>
          </div>
          <div className="mt-1.5 text-sm font-semibold text-foreground">
            {elapsedDisplay}
          </div>
        </div>

        {/* Failed Pages */}
        <div className="rounded-xl border border-theme bg-surface/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <AlertTriangle className={`h-3.5 w-3.5 ${failedPages > 0 ? "text-amber-400" : "text-muted-foreground"}`} />
            <span>Failed Pages</span>
          </div>
          <div className={`mt-1.5 text-sm font-semibold ${failedPages > 0 ? "text-amber-400" : "text-foreground"}`}>
            {failedPages}
          </div>
        </div>
      </div>

      {/* Current Page Live Stream Indicator */}
      {isActive && (job.current_url || job.current_page_title) && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-theme/60 bg-surface/30 px-3.5 py-2.5 text-xs">
          <div className="h-2 w-2 shrink-0 animate-ping rounded-full bg-indigo-500" />
          <span className="shrink-0 font-medium text-muted-foreground">Active Page:</span>
          <span className="truncate font-mono text-foreground">
            {job.current_page_title ? `${job.current_page_title} (${job.current_url || ""})` : job.current_url}
          </span>
        </div>
      )}

      {/* Completed State Helper */}
      {isCompleted && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-400">
          ✓ Website synced successfully! You can now ask questions about your store products, policies, and pages in chat.
        </div>
      )}

      {/* Error State Details */}
      {isFailed && job.error_message && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-400">
          <p className="font-semibold">Error details:</p>
          <p className="mt-1">{job.error_message}</p>
        </div>
      )}
    </div>
  );
}

