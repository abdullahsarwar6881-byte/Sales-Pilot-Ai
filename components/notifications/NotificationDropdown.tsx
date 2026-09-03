"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bell,
  MessageSquare,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export interface AppNotification {
  id: string;
  type:
    | "human_support"
    | "new_conversation"
    | "crawl_completed"
    | "document_processed"
    | "quota_warning"
    | "system";
  title: string;
  description: string;
  timestamp: string;
  link?: string;
  read: boolean;
}

const STORAGE_KEY = "salespilot_read_notifications_v1";

export default function NotificationDropdown() {
  const supabase = createClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load read state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setReadIds(new Set(parsed));
        }
      }
    } catch (e) {
      console.error("Failed to load read notifications", e);
    }
  }, []);

  // Save read state to localStorage
  const persistReadIds = useCallback((newSet: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
    } catch (e) {
      console.error("Failed to persist read notifications", e);
    }
  }, []);

  // Fetch real notifications from database
  const loadNotifications = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const items: AppNotification[] = [];

      // 1. Fetch recent conversations needing human support or recent chats
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, customer_name, assigned_to, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (Array.isArray(convs)) {
        for (const c of convs) {
          const name = c.customer_name || "Customer";
          if (c.assigned_to !== "ai" || c.status === "human_support") {
            items.push({
              id: `conv-human-${c.id}`,
              type: "human_support",
              title: "Customer requested human assistance",
              description: `${name} is waiting for human agent support.`,
              timestamp: formatTimestamp(c.created_at),
              link: `/dashboard/conversations`,
              read: readIds.has(`conv-human-${c.id}`),
            });
          } else {
            items.push({
              id: `conv-new-${c.id}`,
              type: "new_conversation",
              title: "New customer conversation",
              description: `${name} started a new conversation with Sales Pilot AI.`,
              timestamp: formatTimestamp(c.created_at),
              link: `/dashboard/conversations`,
              read: readIds.has(`conv-new-${c.id}`),
            });
          }
        }
      }

      // 2. Fetch crawl job completions
      const { data: crawls } = await supabase
        .from("crawl_jobs")
        .select("id, status, urls_crawled, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (Array.isArray(crawls)) {
        for (const j of crawls) {
          if (j.status === "completed") {
            items.push({
              id: `crawl-${j.id}`,
              type: "crawl_completed",
              title: "Website knowledge sync completed",
              description: `Successfully indexed ${j.urls_crawled || 0} pages from your store.`,
              timestamp: formatTimestamp(j.created_at),
              link: `/dashboard/knowledge`,
              read: readIds.has(`crawl-${j.id}`),
            });
          }
        }
      }

      // 3. Fetch knowledge documents
      const { data: docs } = await supabase
        .from("knowledge_documents")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (Array.isArray(docs)) {
        for (const d of docs) {
          items.push({
            id: `doc-${d.id}`,
            type: "document_processed",
            title: "Knowledge document indexed",
            description: `Document "${d.name}" is now active in AI memory.`,
            timestamp: formatTimestamp(d.created_at),
            link: `/dashboard/knowledge`,
            read: readIds.has(`doc-${d.id}`),
          });
        }
      }

      // 4. Check subscription conversation quota
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, conversations_used, conversation_limit")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sub && sub.conversation_limit > 0) {
        const usageRatio = sub.conversations_used / sub.conversation_limit;
        if (usageRatio >= 0.8) {
          const pct = Math.round(usageRatio * 100);
          items.push({
            id: `quota-warning-${sub.plan}-${pct}`,
            type: "quota_warning",
            title: "Usage quota notice",
            description: `You have used ${pct}% of your monthly conversation allowance.`,
            timestamp: "Today",
            link: `/dashboard/billing`,
            read: readIds.has(`quota-warning-${sub.plan}-${pct}`),
          });
        }
      }

      // Sort by read status (unread first) then slice to top 15
      items.sort((a, b) => {
        if (a.read === b.read) return 0;
        return a.read ? 1 : -1;
      });

      setNotifications(items.slice(0, 15));
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, readIds]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Click outside and Escape key to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Actions
  const markAsRead = (id: string) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    persistReadIds(updated);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    const updated = new Set(readIds);
    notifications.forEach((n) => updated.add(n.id));
    setReadIds(updated);
    persistReadIds(updated);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        title="Notifications"
        className="
          relative
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          border
          border-theme
          bg-input
          text-foreground
          transition-all
          duration-150
          hover:bg-hover
          active:scale-95
          active:bg-slate-200/70
          dark:active:bg-slate-700/70
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-indigo-500
        "
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span
            className="
              absolute
              -right-1
              -top-1
              flex
              h-5
              min-w-[20px]
              items-center
              justify-center
              rounded-full
              bg-rose-500
              px-1
              text-[11px]
              font-bold
              text-white
              shadow-sm
            "
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Notifications Panel"
          className="
            absolute
            right-0
            mt-3
            w-80
            sm:w-96
            rounded-2xl
            border
            border-theme
            bg-card
            text-card-foreground
            shadow-2xl
            transition-colors
            z-50
            overflow-hidden
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-theme px-4 py-3 bg-muted/40">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/70 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="
                  flex
                  items-center
                  gap-1
                  text-xs
                  font-medium
                  text-indigo-600
                  dark:text-indigo-400
                  hover:text-indigo-700
                  dark:hover:text-indigo-300
                  transition
                  active:scale-95
                "
              >
                <Check size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-theme/60">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                Loading updates...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bell size={18} />
                </div>
                <p className="text-sm font-medium text-foreground">
                  No notifications
                </p>
                <p className="mt-1 text-xs">
                  You're completely caught up with your store activity.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    markAsRead(item.id);
                    if (item.link) {
                      setOpen(false);
                      router.push(item.link);
                    }
                  }}
                  className={`
                    group
                    relative
                    flex
                    items-start
                    gap-3
                    p-3.5
                    cursor-pointer
                    transition-colors
                    hover:bg-hover
                    active:bg-slate-100/80
                    dark:active:bg-slate-800/80
                    ${
                      !item.read
                        ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                        : "bg-transparent"
                    }
                  `}
                >
                  {/* Unread indicator dot */}
                  {!item.read && (
                    <span className="absolute left-1.5 top-5 h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  )}

                  {/* Icon */}
                  <div className="shrink-0 mt-0.5 ml-1">{getIcon(item.type)}</div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-semibold line-clamp-1 ${
                          !item.read
                            ? "text-foreground font-bold"
                            : "text-foreground/90"
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {item.timestamp}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-theme p-2.5 text-center bg-muted/20">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/conversations");
              }}
              className="
                inline-flex
                items-center
                gap-1.5
                text-xs
                font-medium
                text-indigo-600
                dark:text-indigo-400
                hover:underline
                active:scale-95
              "
            >
              View conversation inbox
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getIcon(type: AppNotification["type"]) {
  switch (type) {
    case "human_support":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
          <UserCheck size={14} />
        </div>
      );
    case "new_conversation":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <MessageSquare size={14} />
        </div>
      );
    case "crawl_completed":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 size={14} />
        </div>
      );
    case "document_processed":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
          <FileText size={14} />
        </div>
      );
    case "quota_warning":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
          <AlertTriangle size={14} />
        </div>
      );
    default:
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Sparkles size={14} />
        </div>
      );
  }
}

function formatTimestamp(isoString: string): string {
  if (!isoString) return "Recently";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

