"use client";

import React from "react";
import { Globe, Loader2, Sparkles } from "lucide-react";
import CrawlProgressCard, { type CrawlJobRecord } from "./CrawlProgressCard";

interface Props {
  url: string;
  setUrl: (value: string) => void;
  syncing: boolean;
  syncMessage: string;
  onGenerate: () => void;
  activeJob?: CrawlJobRecord | null;
  onDismissJob?: () => void;
  onRetryJob?: () => void;
}

export default function WebsiteCard({
  url,
  setUrl,
  syncing,
  syncMessage,
  onGenerate,
  activeJob,
  onDismissJob,
  onRetryJob,
}: Props) {
  const isCrawlActive =
    syncing ||
    (activeJob?.status &&
      ["pending", "discovering", "crawling", "processing"].includes(
        activeJob.status
      ));

  return (
    <div className="mt-6 rounded-2xl border border-theme bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
          <Globe className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Sync Website
          </h2>
          <p className="text-xs text-muted-foreground">
            Connect your website and let AI learn your products, policies and pages.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isCrawlActive && url.trim()) {
            onGenerate();
          }
        }}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <input
            type="url"
            className="w-full rounded-xl border border-theme bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="https://yourwebsite.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isCrawlActive}
            required
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99] shrink-0"
          disabled={isCrawlActive || !url.trim()}
        >
          {isCrawlActive ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Crawling...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Sync Website</span>
            </>
          )}
        </button>
      </form>

      {syncMessage && !activeJob && (
        <p className="mt-3 text-xs text-muted-foreground">
          {syncMessage}
        </p>
      )}

      {/* Persistent Crawl Progress Card */}
      {activeJob && (
        <CrawlProgressCard
          job={activeJob}
          onDismiss={onDismissJob}
          onRetry={onRetryJob}
        />
      )}
    </div>
  );
}