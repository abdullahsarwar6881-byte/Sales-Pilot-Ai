"use client";

import { useEffect, useState } from "react";
import { Bot, User, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

interface Conversation {
  id: string;
  customer_name: string;
  visitor_session_id?: string;
  message: string;
  status: string;
  assigned_to?: string;
  created_at: string;
  updated_at?: string;
}

export default function RecentConversations() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const search = searchParams?.toString();
  const conversationsHref = search ? `/dashboard/conversations?${search}` : "/dashboard/conversations";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("conversations")
        .select("id, customer_name, visitor_session_id, last_message, status, assigned_to, created_at, updated_at")
        .or(`profile_id.eq.${user.id},user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching recent conversations:", error);
      }

      if (data) {
        const formatted: Conversation[] = data.map((item: any) => ({
          id: String(item.id),
          customer_name: item.customer_name || (item.visitor_session_id ? `Visitor #${item.visitor_session_id.slice(0, 6)}` : "Website Visitor"),
          visitor_session_id: item.visitor_session_id,
          message: item.last_message || "Active chat session",
          status: item.status || "open",
          assigned_to: item.assigned_to,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        setConversations(formatted);
      }
    } catch (err) {
      console.error("Failed to load recent conversations:", err);
    } finally {
      setLoading(false);
    }
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] p-6 sm:p-7 shadow-xs transition-colors h-full flex flex-col justify-between">
      {/* Header Row */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Recent Conversations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Latest customer messages handled by your AI.
          </p>
        </div>

        <Link
          href={conversationsHref}
          className="text-xs font-bold text-[#5B3DF5] dark:text-[#9B7CFC] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>View all</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="space-y-3 py-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            No conversations yet. Customer chats will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {conversations.map((chat) => {
            const isAI = chat.assigned_to === "ai" || chat.status === "ai";
            const initial = chat.customer_name?.charAt(0)?.toUpperCase() || "W";

            return (
              <Link
                key={chat.id}
                href={conversationsHref}
                className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 p-3.5 sm:px-4 transition-all duration-150 hover:bg-slate-100/70 dark:hover:bg-white/10 hover:border-slate-200/80 dark:hover:border-white/10 gap-3 group"
              >
                {/* Left: Circular Avatar + Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5B3DF5] text-white font-black text-xs shadow-xs group-hover:scale-105 transition-transform">
                    {initial}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {chat.customer_name}
                    </h3>
                  </div>
                </div>

                {/* Right: Handler Badge + Timestamp */}
                <div className="text-right shrink-0 flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    {isAI ? (
                      <Bot className="text-emerald-500" size={13} />
                    ) : (
                      <User className="text-amber-500" size={13} />
                    )}

                    <span
                      className={`text-xs font-bold ${
                        isAI
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isAI ? "AI" : "Human"}
                    </span>
                  </div>

                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                    {timeAgo(chat.updated_at || chat.created_at)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}