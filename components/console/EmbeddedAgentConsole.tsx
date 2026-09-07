"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Headphones,
  Search,
  Bot,
  User,
  Send,
  Check,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  UserCheck,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

export interface ConsoleConversation {
  id: string | number;
  profile_id: string;
  user_id: string | null;
  visitor_session_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  assigned_to: string | null;
  status: string | null;
  last_message: string | null;
  handover_requested_at: string | null;
  handover_reason: string | null;
  taken_over_at: string | null;
  taken_over_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ConsoleMessage {
  id: string | number;
  conversation_id: string | number;
  sender: string;
  role?: string | null;
  content: string;
  created_at: string;
}

interface Props {
  initialUserId?: string;
  initialAgentName?: string;
  widgetId?: string;
  isEmbedded?: boolean;
}

export default function EmbeddedAgentConsole({
  initialUserId,
  initialAgentName = "Support Agent",
  widgetId,
  isEmbedded = false,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  // Staff identity state
  const [currentUserId, setCurrentUserId] = useState(initialUserId || "");
  const [agentName, setAgentName] = useState(initialAgentName);
  const [authLoading, setAuthLoading] = useState(!initialUserId);

  // Data & Selection state
  const [conversations, setConversations] = useState<ConsoleConversation[]>([]);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [counts, setCounts] = useState({ total: 0, waiting: 0, active: 0, resolved: 0 });

  // UI state
  const [filter, setFilter] = useState<"all" | "waiting" | "active" | "mine" | "resolved">("waiting");
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ----------------------------------------------------
  // 1. Resolve authenticated staff member
  // ----------------------------------------------------
  useEffect(() => {
    async function checkAuth() {
      if (initialUserId) {
        setCurrentUserId(initialUserId);
        setAuthLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getUser();
        if (data?.user?.id) {
          setCurrentUserId(data.user.id);
          const name =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            data.user.email?.split("@")[0] ||
            "Support Agent";
          setAgentName(name);
        } else {
          console.warn("No active staff session found in console.");
        }
      } catch (err) {
        console.error("Auth resolution error in console:", err);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAuth();
  }, [initialUserId, supabase]);

  // ----------------------------------------------------
  // 2. Fetch conversations
  // ----------------------------------------------------
  const fetchConversations = useCallback(
    async (silent = false) => {
      if (!currentUserId) return;
      if (!silent) setLoadingList(true);
      setErrorBanner("");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch(`/api/console/conversations?filter=all`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to load conversations (${res.status})`);
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
          if (data.counts) {
            setCounts(data.counts);
          }

          // Auto-select first conversation if none selected
          if (!activeId && data.conversations.length > 0) {
            setActiveId(data.conversations[0].id);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch console conversations:", err);
        setErrorBanner(err?.message || "Failed to load conversations.");
      } finally {
        if (!silent) setLoadingList(false);
      }
    },
    [currentUserId, agentName, activeId, supabase]
  );

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
    }
  }, [currentUserId, fetchConversations]);

  // ----------------------------------------------------
  // 3. Fetch messages for active conversation
  // ----------------------------------------------------
  const fetchActiveMessages = useCallback(async (convId: string | number) => {
    if (!convId) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("id, conversation_id, sender, role, content, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages((data || []) as ConsoleMessage[]);
    } catch (err) {
      console.error("Error loading conversation messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (activeId) {
      fetchActiveMessages(activeId);
    } else {
      setMessages([]);
    }
  }, [activeId, fetchActiveMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]);

  // ----------------------------------------------------
  // 4. Supabase Realtime Subscription for instantaneous sync
  // ----------------------------------------------------
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`console-staff-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
        },
        (payload) => {
          const newMsg = payload.new as ConsoleMessage;
          if (!newMsg || !newMsg.conversation_id) return;

          // If message belongs to currently active conversation
          if (String(newMsg.conversation_id) === String(activeId)) {
            setMessages((prev) => {
              if (prev.some((m) => String(m.id) === String(newMsg.id))) return prev;
              return [...prev, newMsg];
            });
          }

          // Update last message in list
          setConversations((prev) => {
            const index = prev.findIndex((c) => String(c.id) === String(newMsg.conversation_id));
            if (index < 0) return prev;
            const updated = {
              ...prev[index],
              last_message: newMsg.content,
              updated_at: newMsg.created_at,
            };
            const copy = [...prev];
            copy.splice(index, 1);
            return [updated, ...copy];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `profile_id=eq.${currentUserId}`,
        },
        (payload) => {
          const updatedConv = payload.new as ConsoleConversation;
          if (!updatedConv || !updatedConv.id) return;

          setConversations((prev) => {
            const idx = prev.findIndex((c) => String(c.id) === String(updatedConv.id));
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...updatedConv };
              return copy;
            }
            return [updatedConv, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeId, supabase]);

  // ----------------------------------------------------
  // 5. Actions: Take Over, Return to AI, Resolve
  // ----------------------------------------------------
  const activeConversation = useMemo(
    () => conversations.find((c) => String(c.id) === String(activeId)) || null,
    [conversations, activeId]
  );

  async function handleTakeOver() {
    if (!activeId || actionLoading) return;
    setActionLoading(true);
    setErrorBanner("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/conversations/${activeId}/takeover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Takeover failed");
      }

      // Optimistic update
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeId)
            ? { ...c, status: "human_active", assigned_to: currentUserId, taken_over_at: new Date().toISOString() }
            : c
        )
      );

      // Append system message locally
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          conversation_id: activeId,
          sender: "system",
          role: "system",
          content: `${agentName} has joined the conversation`,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      console.error("Takeover error:", err);
      setErrorBanner(err.message || "Failed to take over conversation.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReturnToAI() {
    if (!activeId || actionLoading) return;
    setActionLoading(true);
    setErrorBanner("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/conversations/${activeId}/return-to-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Return to AI failed");

      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeId)
            ? { ...c, status: "ai_active", assigned_to: "ai" }
            : c
        )
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          conversation_id: activeId,
          sender: "system",
          role: "system",
          content: "Conversation returned to AI assistant",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      console.error("Return to AI error:", err);
      setErrorBanner(err.message || "Failed to return to AI.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolve() {
    if (!activeId || actionLoading) return;
    setActionLoading(true);
    setErrorBanner("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/conversations/${activeId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resolve failed");

      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeId)
            ? { ...c, status: "resolved", resolved_at: new Date().toISOString() }
            : c
        )
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          conversation_id: activeId,
          sender: "system",
          role: "system",
          content: "Conversation resolved",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      console.error("Resolve error:", err);
      setErrorBanner(err.message || "Failed to resolve conversation.");
    } finally {
      setActionLoading(false);
    }
  }

  // ----------------------------------------------------
  // 6. Send human reply
  // ----------------------------------------------------
  async function handleSendMessage() {
    const cleanText = replyText.trim();
    if (!cleanText || !activeId || sendingMessage) return;

    setSendingMessage(true);
    setErrorBanner("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content: cleanText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");

      setReplyText("");

      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(data.message.id))) return prev;
          return [
            ...prev,
            {
              id: data.message.id,
              conversation_id: activeId,
              sender: "human",
              role: "assistant",
              content: cleanText,
              created_at: data.message.timestamp || new Date().toISOString(),
            },
          ];
        });
      }

      // If active conversation was waiting, update status to human_active
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeId)
            ? {
                ...c,
                status: c.status === "waiting_for_human" ? "human_active" : c.status,
                last_message: cleanText,
                updated_at: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (err: any) {
      console.error("Send message error:", err);
      setErrorBanner(err.message || "Failed to send message.");
    } finally {
      setSendingMessage(false);
      textareaRef.current?.focus();
    }
  }

  // ----------------------------------------------------
  // 7. Filtering & Search
  // ----------------------------------------------------
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Filter status tab
      if (filter === "waiting") {
        if (c.status !== "waiting_for_human" && c.assigned_to !== "waiting_for_human") return false;
      } else if (filter === "active") {
        if (c.status !== "human_active" && c.assigned_to === "ai") return false;
        if (c.status === "resolved") return false;
      } else if (filter === "mine") {
        if (c.assigned_to !== currentUserId) return false;
      } else if (filter === "resolved") {
        if (c.status !== "resolved") return false;
      }

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = (c.customer_name || "").toLowerCase().includes(q);
        const matchesEmail = (c.customer_email || "").toLowerCase().includes(q);
        const matchesMsg = (c.last_message || "").toLowerCase().includes(q);
        const matchesSession = (c.visitor_session_id || "").toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesMsg || matchesSession;
      }

      return true;
    });
  }, [conversations, filter, search, currentUserId]);

  const waitingCount = useMemo(() => {
    return conversations.filter(
      (c) => c.status === "waiting_for_human" || c.assigned_to === "waiting_for_human"
    ).length;
  }, [conversations]);

  // Auth gate
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
          <span>Authenticating support console...</span>
        </div>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Authentication Required</h2>
          <p className="mt-2 text-sm text-slate-400">
            You must be logged in as a store owner or authorized support staff member to access the Sales Pilot Agent Console.
          </p>
          <a
            href="/login"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Log In to Sales Pilot
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-100 antialiased`}>
      {/* ===================================================
          CONSOLE TOP NAVBAR
          =================================================== */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Headphones className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Sales Pilot</span>
              <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                Agent Console
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {waitingCount > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-amber-300 animate-pulse font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>{waitingCount} {waitingCount === 1 ? "Customer Waiting" : "Customers Waiting"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>All Queues Clear</span>
            </div>
          )}

          <button
            onClick={() => fetchConversations()}
            disabled={loadingList}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-800/50 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Refresh conversations"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600/30 text-indigo-300 font-semibold text-[11px] border border-indigo-500/30">
              {agentName.slice(0, 1).toUpperCase()}
            </div>
            <span className="hidden sm:inline font-medium text-slate-300">{agentName}</span>
          </div>
        </div>
      </header>

      {/* Error alert if present */}
      {errorBanner && (
        <div className="flex items-center justify-between bg-red-950/80 border-b border-red-800 px-4 py-2 text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner("")} className="text-red-400 hover:text-red-200">
            ×
          </button>
        </div>
      )}

      {/* ===================================================
          MAIN 3-COLUMN WORKSPACE
          =================================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ===================================================
            COLUMN 1: CONVERSATIONS LIST (Desktop: 320px)
            =================================================== */}
        <aside
          className={`flex flex-col border-r border-slate-800/80 bg-slate-900/40 ${
            mobileView === "chat" ? "hidden md:flex" : "flex"
          } w-full md:w-80 lg:w-96 shrink-0`}
        >
          {/* Search & Filter header */}
          <div className="p-3 border-b border-slate-800/70 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search visitors, emails, messages..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 transition"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                onClick={() => setFilter("waiting")}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition ${
                  filter === "waiting"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span>Waiting</span>
                {waitingCount > 0 && (
                  <span className="rounded-full bg-amber-500/30 px-1.5 py-0.2 text-[9px] text-amber-200 font-bold">
                    {waitingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFilter("active")}
                className={`rounded-lg px-2 py-1 font-medium transition ${
                  filter === "active"
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                Human Active
              </button>

              <button
                onClick={() => setFilter("all")}
                className={`rounded-lg px-2 py-1 font-medium transition ${
                  filter === "all"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                All
              </button>

              <button
                onClick={() => setFilter("resolved")}
                className={`rounded-lg px-2 py-1 font-medium transition ${
                  filter === "resolved"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                Resolved
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-600" />
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <MessageSquare className="mx-auto mb-2 h-6 w-6 text-slate-700" />
                No conversations match this view.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = String(c.id) === String(activeId);
                const isWaiting = c.status === "waiting_for_human" || c.assigned_to === "waiting_for_human";
                const isHumanActive = c.status === "human_active" || (c.assigned_to && c.assigned_to !== "ai" && c.status !== "resolved");
                const isResolved = c.status === "resolved";

                const displayName = c.customer_name || (c.visitor_session_id ? `Visitor #${c.visitor_session_id.slice(0, 6)}` : "Visitor");
                const timeAgo = c.updated_at || c.created_at;

                return (
                  <div
                    key={String(c.id)}
                    onClick={() => {
                      setActiveId(c.id);
                      setMobileView("chat");
                    }}
                    className={`group cursor-pointer p-3 transition border-l-2 ${
                      isSelected
                        ? "bg-slate-800/60 border-indigo-500"
                        : isWaiting
                        ? "bg-amber-950/10 border-amber-500/60 hover:bg-slate-800/30"
                        : "border-transparent hover:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            isWaiting
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : isHumanActive
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : isResolved
                              ? "bg-slate-800 text-slate-400"
                              : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          }`}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate text-xs font-semibold text-slate-200">
                          {displayName}
                        </span>
                      </div>

                      {/* Status Tag */}
                      {isWaiting ? (
                        <span className="shrink-0 rounded-md bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 animate-pulse">
                          Waiting
                        </span>
                      ) : isHumanActive ? (
                        <span className="shrink-0 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
                          Active
                        </span>
                      ) : isResolved ? (
                        <span className="shrink-0 rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                          Resolved
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[9px] text-indigo-400">
                          AI
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-[11px] text-slate-400">
                      {c.last_message || "No message history"}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{c.customer_email || "No email"}</span>
                      <span>
                        {timeAgo ? new Date(timeAgo).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ===================================================
            COLUMN 2: LIVE CONVERSATION WINDOW
            =================================================== */}
        <section
          className={`flex flex-1 flex-col overflow-hidden bg-slate-950 ${
            mobileView === "list" ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConversation ? (
            <>
              {/* Active Conversation Top Bar */}
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 backdrop-blur">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setMobileView("list")}
                    className="md:hidden mr-1 p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-white">
                        {activeConversation.customer_name || "Website Visitor"}
                      </span>
                      {activeConversation.status === "waiting_for_human" && (
                        <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300 animate-pulse">
                          Waiting for Human
                        </span>
                      )}
                      {activeConversation.status === "human_active" && (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          Human Active
                        </span>
                      )}
                      {activeConversation.status === "resolved" && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                          Resolved
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-slate-400">
                      {activeConversation.customer_email || `Session: ${activeConversation.visitor_session_id?.slice(0, 12)}...`}
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Take Over Button */}
                  {(activeConversation.status === "waiting_for_human" ||
                    activeConversation.assigned_to === "ai" ||
                    !activeConversation.assigned_to) && (
                    <button
                      onClick={handleTakeOver}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Take Over</span>
                    </button>
                  )}

                  {/* Return to AI Button */}
                  {activeConversation.status === "human_active" && (
                    <button
                      onClick={handleReturnToAI}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
                      title="Return conversation to AI automated replies"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Return to AI</span>
                    </button>
                  )}

                  {/* Resolve Button */}
                  {activeConversation.status !== "resolved" ? (
                    <button
                      onClick={handleResolve}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
                      title="Mark conversation as resolved"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Resolve</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleTakeOver}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                      <span>Reopen</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    <RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin text-slate-600" />
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No messages recorded for this conversation yet.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isSystem = m.role === "system" || m.sender === "system";
                    const isHuman = m.sender === "human";
                    const isCustomer = m.sender === "customer" || m.role === "user";
                    const isAI = m.sender === "ai" || (!isHuman && !isCustomer && !isSystem);

                    if (isSystem) {
                      return (
                        <div key={String(m.id)} className="flex justify-center my-2">
                          <span className="rounded-full bg-slate-900 border border-slate-800/80 px-3 py-1 text-[11px] text-slate-400 font-medium">
                            ℹ️ {m.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={String(m.id)}
                        className={`flex flex-col ${isCustomer ? "items-start" : "items-end"}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 px-1">
                          {isCustomer ? (
                            <>
                              <User className="h-3 w-3 text-slate-400" />
                              <span className="font-semibold text-slate-400">
                                {activeConversation.customer_name || "Customer"}
                              </span>
                            </>
                          ) : isHuman ? (
                            <>
                              <Headphones className="h-3 w-3 text-emerald-400" />
                              <span className="font-semibold text-emerald-400">Support Staff</span>
                            </>
                          ) : (
                            <>
                              <Bot className="h-3 w-3 text-indigo-400" />
                              <span className="font-semibold text-indigo-400">Sales Pilot AI</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs whitespace-pre-wrap break-words leading-relaxed shadow-sm ${
                            isCustomer
                              ? "bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-sm"
                              : isHuman
                              ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm shadow-indigo-600/20"
                              : "bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tr-sm"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
                {activeConversation.status === "resolved" ? (
                  <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs text-slate-400">
                    <span>This conversation is currently resolved. Reopen to send replies.</span>
                    <button
                      onClick={handleTakeOver}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      Reopen & Take Over
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/90 focus-within:border-indigo-500/50 transition">
                      <textarea
                        ref={textareaRef}
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={`Reply to ${activeConversation.customer_name || "customer"} as ${agentName}... (Enter to send)`}
                        className="w-full resize-none bg-transparent px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                      />
                    </div>

                    <button
                      onClick={handleSendMessage}
                      disabled={!replyText.trim() || sendingMessage}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Send message (Enter)"
                    >
                      {sendingMessage ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-600 mb-3">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">Select a Conversation</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Choose a customer from the left list to review history, take over from AI, or reply in real time.
              </p>
            </div>
          )}
        </section>

        {/* ===================================================
            COLUMN 3: CUSTOMER DETAILS PANEL (Desktop: 280px)
            =================================================== */}
        {activeConversation && (
          <aside className="hidden lg:flex w-72 shrink-0 flex-col border-l border-slate-800/80 bg-slate-900/30 p-4 overflow-y-auto">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Customer Info
            </h4>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 space-y-2">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Name</span>
                  <span className="text-slate-200 font-semibold">
                    {activeConversation.customer_name || "Website Visitor"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Email</span>
                  <span className="text-slate-200 truncate block">
                    {activeConversation.customer_email || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Visitor Session</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate block">
                    {activeConversation.visitor_session_id || "None"}
                  </span>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2 mb-1">
                Handover Diagnostics
              </h4>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Status</span>
                  <span className="font-semibold text-slate-200 capitalize">
                    {activeConversation.status || "ai_active"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Assigned Agent</span>
                  <span className="text-slate-300">
                    {activeConversation.assigned_to === "ai"
                      ? "Sales Pilot AI"
                      : activeConversation.assigned_to === "waiting_for_human"
                      ? "Waiting for Staff"
                      : activeConversation.assigned_to || "Unassigned"}
                  </span>
                </div>
                {activeConversation.handover_reason && (
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Handover Reason</span>
                    <span className="text-amber-300 font-medium capitalize">
                      {activeConversation.handover_reason.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                {activeConversation.handover_requested_at && (
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Requested At</span>
                    <span className="text-slate-400">
                      {new Date(activeConversation.handover_requested_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {activeConversation.taken_over_at && (
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Takeover Time</span>
                    <span className="text-slate-400">
                      {new Date(activeConversation.taken_over_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

