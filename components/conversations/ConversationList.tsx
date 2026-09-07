"use client";

import { Search } from "lucide-react";
import ConversationItem, {
  Conversation,
} from "./ConversationItem";
import EmptyState from "./EmptyState";

interface Props {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  totalCount?: number;
}

const filterOptions = ["All", "Open", "Resolved", "AI", "Human"];

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  totalCount,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] shadow-xs flex flex-col h-full min-h-0 overflow-hidden transition-colors">
      {/* 1. Header: Inbox Title and Count Pill */}
      <div className="shrink-0 px-3.5 sm:px-4 pt-3.5 sm:pt-4 pb-2.5 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
          Inbox
        </h2>

        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 rounded-full">
          {totalCount && totalCount > conversations.length
            ? `${conversations.length} of ${totalCount}`
            : conversations.length}
        </span>
      </div>

      {/* 2. Embedded Search Input */}
      <div className="shrink-0 px-3.5 sm:px-4 pb-2.5">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all focus:border-[#5B3DF5] focus:ring-2 focus:ring-[#5B3DF5]/15"
          />
        </div>
      </div>

      {/* 3. Embedded Filter Tabs (Strictly NO Horizontal Scroll) */}
      <div className="shrink-0 px-3.5 sm:px-4 pb-3 flex items-center justify-between gap-1 overflow-hidden border-b border-slate-100 dark:border-white/5">
        {filterOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onFilterChange(opt)}
            className={`flex-1 min-w-0 py-1 px-1 sm:px-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-center transition-all truncate ${
              filter === opt
                ? "bg-[#5B3DF5] text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* 4. Independent Scrollable Conversation List (Vertical Only) */}
      <div className="flex-1 min-h-0 space-y-1.5 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3">
        {conversations.length === 0 ? (
          <EmptyState />
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === activeId}
              onClick={() => onSelect(conversation.id)}
            />
          ))
        )}

        {hasMore && onLoadMore && (
          <div className="pt-2 pb-1 text-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-all disabled:opacity-50"
            >
              {loadingMore ? "Loading more..." : "Load More Conversations"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}