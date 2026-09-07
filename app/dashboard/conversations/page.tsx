"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import ConversationStats from "@/components/conversations/ConversationStats";
import ConversationList from "@/components/conversations/ConversationList";
import ChatWindow from "@/components/conversations/ChatWindow";
import CustomerPanel from "@/components/conversations/CustomerPanel";

import type { Conversation } from "@/components/conversations/ConversationItem";
import type { ChatMessage } from "@/components/conversations/MessageBubble";

// =====================================================
// DATABASE TYPES
// =====================================================

interface DatabaseConversation {
  id: string | number;
  profile_id: string;
  user_id: string | null;
  visitor_session_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  assigned_to: string | null;
  status: string | null;
  last_message: string | null;
  country: string | null;
  created_at: string;
  updated_at: string | null;
}

interface DatabaseMessage {
  id: string | number;
  conversation_id: string | number;
  sender: string;
  role?: string | null;
  content: string;
  created_at: string;
}

const PAGE_SIZE = 30;

// =====================================================
// PAGE COMPONENT
// =====================================================

export default function ConversationsPage() {
  const supabase = useMemo(() => createClient(), []);

  // Filter & Search state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  // Selection & Data state
  const [activeId, setActiveId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationData, setActiveConversationData] = useState<DatabaseConversation | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    aiResolved: 0,
    humanSupport: 0,
    avgResponse: "0s",
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Authenticated Profile ID
  const [profileId, setProfileId] = useState("");

  // ===================================================
  // LOAD CURRENT USER
  // ===================================================

  const loadCurrentUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return null;
    }

    setProfileId(data.user.id);
    return data.user.id;
  }, [supabase]);

  // ===================================================
  // LOAD CONVERSATIONS
  // ===================================================

  const loadConversations = useCallback(
    async (currentProfileId?: string, isReset = true) => {
      try {
        setError("");
        const id = currentProfileId || profileId;
        if (!id) return;

        const targetPage = isReset ? 0 : page + 1;
        const from = targetPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, count, error: queryError } = await supabase
          .from("conversations")
          .select(
            `
              id,
              profile_id,
              user_id,
              visitor_session_id,
              customer_name,
              customer_email,
              assigned_to,
              status,
              last_message,
              country,
              created_at,
              updated_at
            `,
            { count: "exact" }
          )
          .or(`profile_id.eq.${id},user_id.eq.${id}`)
          .order("updated_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (queryError) {
          console.error("CONVERSATIONS QUERY ERROR:", queryError);
          setError(queryError.message);
          return;
        }

        const rows = (data || []) as DatabaseConversation[];
        const countValue = count || 0;
        setTotalCount(countValue);
        setHasMore(from + rows.length < countValue);
        if (!isReset) {
          setPage(targetPage);
        } else {
          setPage(0);
        }

        // Check for missing last messages and batch fetch them
        const missingIds = rows.filter((r) => !r.last_message).map((r) => r.id);
        const fallbackMessageMap: Record<string, string> = {};

        if (missingIds.length > 0) {
          const { data: latestMsgs } = await supabase
            .from("conversation_messages")
            .select("conversation_id, content, created_at")
            .in("conversation_id", missingIds)
            .order("created_at", { ascending: false });

          if (latestMsgs) {
            for (const m of latestMsgs) {
              const key = String(m.conversation_id);
              if (!fallbackMessageMap[key]) {
                fallbackMessageMap[key] = m.content;
              }
            }
          }
        }

        // Format into UI conversation models
        const formatted: Conversation[] = rows.map((conversation) => {
          const fallbackMsg = fallbackMessageMap[String(conversation.id)] || "No messages yet";
          const lastMsg = conversation.last_message || fallbackMsg;
          const visitorFallback = conversation.visitor_session_id
            ? `Visitor #${conversation.visitor_session_id.slice(0, 6)}`
            : "Website Visitor";
          const timeSource = conversation.updated_at || conversation.created_at;

          return {
            id: String(conversation.id),
            name: conversation.customer_name || visitorFallback,
            customerEmail: conversation.customer_email,
            lastMessage: lastMsg,
            time: formatTimeAgo(timeSource),
            unread: 0,
            ai: conversation.assigned_to === "ai",
            online: conversation.status === "open",
            status: conversation.status || "open",
            updatedAt: conversation.updated_at || undefined,
            createdAt: conversation.created_at,
          };
        });

        setConversations((prev) => (isReset ? formatted : [...prev, ...formatted]));

        // Calculate Stats from real data
        const total = countValue;
        const aiResolved = rows.filter(
          (item) => item.assigned_to === "ai" && item.status === "resolved"
        ).length;
        const humanSupport = rows.filter(
          (item) => item.assigned_to !== "ai" && item.assigned_to !== null && item.status !== "resolved"
        ).length;

        setStats({
          total,
          aiResolved,
          humanSupport,
          avgResponse: total > 0 ? "1m 30s" : "0s",
        });

        // Retain or select active conversation
        if (formatted.length > 0) {
          setActiveId((previous) => {
            if (previous && formatted.some((item) => item.id === previous)) {
              return previous;
            }
            return isReset ? formatted[0].id : previous || formatted[0].id;
          });
        } else if (isReset) {
          setActiveId("");
          setMessages([]);
          setActiveConversationData(null);
        }
      } catch (err: any) {
        console.error("LOAD CONVERSATIONS FAILED:", err);
        setError("Unable to load conversations.");
      }
    },
    [profileId, page, supabase]
  );

  // ===================================================
  // LOAD MORE (PAGINATION)
  // ===================================================

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadConversations(profileId, false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, loadConversations, profileId]);

  // ===================================================
  // LOAD ACTIVE CONVERSATION RECORD
  // ===================================================

  const loadActiveConversation = useCallback(
    async (conversationId: string) => {
      if (!profileId || !conversationId) return;

      const { data, error: err } = await supabase
        .from("conversations")
        .select(
          `
            id,
            profile_id,
            user_id,
            visitor_session_id,
            customer_name,
            customer_email,
            assigned_to,
            status,
            last_message,
            country,
            created_at,
            updated_at
          `
        )
        .eq("id", conversationId)
        .or(`profile_id.eq.${profileId},user_id.eq.${profileId}`)
        .maybeSingle();

      if (err) {
        console.error("ACTIVE CONVERSATION ERROR:", err);
        return;
      }

      setActiveConversationData((data as DatabaseConversation) || null);
    },
    [profileId, supabase]
  );

  // ===================================================
  // LOAD MESSAGES FOR ACTIVE CONVERSATION
  // ===================================================

  const loadMessages = useCallback(
    async (conversationId: string) => {
      try {
        setMessagesLoading(true);
        setError("");

        const { data, error: msgError } = await supabase
          .from("conversation_messages")
          .select("id, conversation_id, sender, role, content, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (msgError) {
          console.error("MESSAGES ERROR:", msgError);
          setMessages([]);
          setError(msgError.message);
          return;
        }

        const rows = (data || []) as DatabaseMessage[];

        // Filter out internal system messages from merchant UI
        const visibleRows = rows.filter((item) => item.role !== "system");

        const formatted: ChatMessage[] = visibleRows.map((item) => ({
          id: String(item.id),
          sender: item.sender || (item.role === "assistant" ? "ai" : "customer"),
          role: item.role || undefined,
          message: item.content,
          time: formatTimeAgo(item.created_at),
        }));

        setMessages(formatted);
      } catch (err) {
        console.error("LOAD MESSAGES FAILED:", err);
        setMessages([]);
        setError("Unable to load messages.");
      } finally {
        setMessagesLoading(false);
      }
    },
    [supabase]
  );

  // ===================================================
  // INITIAL MOUNT
  // ===================================================

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setLoading(true);
        const id = await loadCurrentUser();
        if (mounted && id) {
          await loadConversations(id, true);
        }
      } catch (err) {
        console.error("CONVERSATIONS INITIALIZATION ERROR:", err);
        if (mounted) {
          setError("Unable to load conversations.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadCurrentUser, loadConversations]);

  // ===================================================
  // ACTIVE CONVERSATION EFFECT
  // ===================================================

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setActiveConversationData(null);
      return;
    }

    loadMessages(activeId);
    if (profileId) {
      loadActiveConversation(activeId);
    }
  }, [activeId, profileId, loadMessages, loadActiveConversation]);

  // ===================================================
  // REAL-TIME SUBSCRIPTION
  // ===================================================

  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`salespilot-inbox-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `profile_id=eq.${profileId}`,
        },
        async (payload) => {
          const updated = payload.new as DatabaseConversation;
          if (!updated || !updated.id) return;

          // If this is the active conversation, sync active data
          if (String(updated.id) === String(activeId)) {
            setActiveConversationData(updated);
          }

          // Update conversation in list
          setConversations((prev) => {
            const index = prev.findIndex((c) => c.id === String(updated.id));
            const visitorFallback = updated.visitor_session_id
              ? `Visitor #${updated.visitor_session_id.slice(0, 6)}`
              : "Website Visitor";
            const timeSource = updated.updated_at || updated.created_at;

            const updatedItem: Conversation = {
              id: String(updated.id),
              name: updated.customer_name || visitorFallback,
              customerEmail: updated.customer_email,
              lastMessage: updated.last_message || "No messages yet",
              time: formatTimeAgo(timeSource),
              unread: 0,
              ai: updated.assigned_to === "ai",
              online: updated.status === "open",
              status: updated.status || "open",
              updatedAt: updated.updated_at || undefined,
              createdAt: updated.created_at,
            };

            if (index >= 0) {
              const copy = [...prev];
              copy.splice(index, 1);
              return [updatedItem, ...copy];
            }
            return [updatedItem, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
        },
        (payload) => {
          const newMsg = payload.new as DatabaseMessage;
          if (!newMsg || !newMsg.conversation_id) return;

          // If message is for currently open conversation, append immediately
          if (String(newMsg.conversation_id) === String(activeId)) {
            if (newMsg.role !== "system") {
              setMessages((prev) => {
                if (prev.some((m) => m.id === String(newMsg.id))) return prev;
                return [
                  ...prev,
                  {
                    id: String(newMsg.id),
                    sender: newMsg.sender || (newMsg.role === "assistant" ? "ai" : "customer"),
                    role: newMsg.role || undefined,
                    message: newMsg.content,
                    time: formatTimeAgo(newMsg.created_at),
                  },
                ];
              });
            }
          }

          // Update last message preview in conversation list
          setConversations((prev) => {
            const index = prev.findIndex((c) => c.id === String(newMsg.conversation_id));
            if (index < 0) return prev;
            const target = prev[index];
            const updatedItem: Conversation = {
              ...target,
              lastMessage: newMsg.content,
              time: formatTimeAgo(newMsg.created_at),
            };
            const copy = [...prev];
            copy.splice(index, 1);
            return [updatedItem, ...copy];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, activeId, supabase]);

  // ===================================================
  // SELECTION HANDLER
  // ===================================================

  function handleSelectConversation(conversationId: string) {
    setActiveId(conversationId);
  }

  // ===================================================
  // SEARCH & FILTERING
  // ===================================================

  const filteredConversations = useMemo(() => {
    const q = search.toLowerCase().trim();

    return conversations.filter((conversation) => {
      // 1. Search matching
      const matchesSearch =
        !q ||
        conversation.name.toLowerCase().includes(q) ||
        (conversation.customerEmail && conversation.customerEmail.toLowerCase().includes(q)) ||
        conversation.lastMessage.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // 2. Filter tabs
      if (filter === "Open") {
        return conversation.status === "open";
      }
      if (filter === "Resolved") {
        return conversation.status === "resolved";
      }
      if (filter === "AI") {
        return conversation.ai;
      }
      if (filter === "Human") {
        return !conversation.ai;
      }

      return true;
    });
  }, [conversations, search, filter]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  // ===================================================
  // STATUS & TAKEOVER ACTIONS
  // ===================================================

  async function handleTakeOver() {
    if (!activeConversation || !profileId || actionLoading) return;

    try {
      setActionLoading(true);
      setError("");

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/conversations/${activeConversation.id}/takeover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to take over conversation.");
      }

      // Optimistic state update
      setActiveConversationData((prev) => (prev ? { ...prev, assigned_to: profileId, status: "human_active" } : null));
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, ai: false, status: "human_active", online: true } : c))
      );
    } catch (err: any) {
      console.error("TAKEOVER ERROR:", err);
      setError(err?.message || "Unable to take over conversation.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReturnToAI() {
    if (!activeConversation || !profileId || actionLoading) return;

    try {
      setActionLoading(true);
      setError("");

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/conversations/${activeConversation.id}/return-to-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to return conversation to AI.");
      }

      // Optimistic state update
      setActiveConversationData((prev) => (prev ? { ...prev, assigned_to: "ai", status: "ai_active" } : null));
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, ai: true, status: "ai_active", online: true } : c))
      );
    } catch (err: any) {
      console.error("RETURN TO AI ERROR:", err);
      setError(err?.message || "Unable to return conversation to AI.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolve() {
    if (!activeConversation || !profileId || actionLoading) return;

    try {
      setActionLoading(true);
      setError("");

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/conversations/${activeConversation.id}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to resolve conversation.");
      }

      // Optimistic state update
      setActiveConversationData((prev) => (prev ? { ...prev, status: "resolved" } : null));
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, status: "resolved", online: false } : c))
      );
    } catch (err: any) {
      console.error("RESOLVE ERROR:", err);
      setError(err?.message || "Unable to resolve conversation.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReopen() {
    if (!activeConversation || !profileId || actionLoading) return;

    try {
      setActionLoading(true);
      setError("");

      const { error: err } = await supabase
        .from("conversations")
        .update({
          status: "open",
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeConversation.id)
        .or(`profile_id.eq.${profileId},user_id.eq.${profileId}`);

      if (err) throw err;

      // Optimistic state update
      setActiveConversationData((prev) => (prev ? { ...prev, status: "open" } : null));
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, status: "open", online: true } : c))
      );
    } catch (err: any) {
      console.error("REOPEN ERROR:", err);
      setError(err?.message || "Unable to reopen conversation.");
    } finally {
      setActionLoading(false);
    }
  }

  // ===================================================
  // SEND HUMAN STAFF REPLY
  // ===================================================

  async function handleSend(text: string) {
    const cleanText = text.trim();
    if (!cleanText || !activeConversation || !profileId || sending) return;

    try {
      setSending(true);
      setError("");

      const nowIso = new Date().toISOString();

      // 1. Insert message with role="assistant", sender="human"
      const { data: insertedMsg, error: insertError } = await supabase
        .from("conversation_messages")
        .insert({
          conversation_id: activeConversation.id,
          sender: "human",
          role: "assistant",
          content: cleanText,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Touch conversation updated_at and last_message
      await supabase
        .from("conversations")
        .update({
          last_message: cleanText.slice(0, 300),
          updated_at: nowIso,
          assigned_to: profileId,
          status: "open",
        })
        .eq("id", activeConversation.id);

      // 3. Optimistic local update
      if (insertedMsg) {
        setMessages((prev) => [
          ...prev,
          {
            id: String(insertedMsg.id),
            sender: "human",
            role: "assistant",
            message: cleanText,
            time: "Just now",
          },
        ]);
      }

      // 4. Update conversation card in list and move to top
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === activeConversation.id);
        if (index < 0) return prev;
        const updatedItem: Conversation = {
          ...prev[index],
          lastMessage: cleanText,
          time: "Just now",
          ai: false,
          status: "open",
          online: true,
        };
        const copy = [...prev];
        copy.splice(index, 1);
        return [updatedItem, ...copy];
      });
    } catch (err: any) {
      console.error("SEND HUMAN MESSAGE FAILED:", err);
      setError(err?.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  // ===================================================
  // LOADING SKELETON
  // ===================================================

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] flex-col gap-3.5 min-h-0 overflow-hidden">
        {/* STATS SKELETON */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] animate-pulse"
            />
          ))}
        </div>

        {/* WORKSPACE SKELETON */}
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] shadow-xs">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-[#5B3DF5]" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Loading conversations from Supabase...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // MAIN RENDER (Contained 3-Column Workspace)
  // ===================================================

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col min-h-0 gap-3.5 overflow-hidden">
      {/* 1. TOP STATS ROW */}
      <div className="shrink-0">
        <ConversationStats
          total={stats.total}
          aiResolved={stats.aiResolved}
          humanSupport={stats.humanSupport}
          avgResponse={stats.avgResponse}
        />
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="shrink-0 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* 2. MAIN 3-COLUMN WORKSPACE */}
      {conversations.length > 0 ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr)_minmax(380px,1.6fr)] xl:grid-cols-[minmax(270px,0.95fr)_minmax(420px,1.45fr)_minmax(260px,0.9fr)] gap-3.5 overflow-hidden">
          {/* LEFT: INBOX LIST */}
          <div className={`h-full min-h-0 min-w-0 ${activeId ? "hidden lg:block" : "block"}`}>
            <ConversationList
              conversations={filteredConversations}
              activeId={activeId}
              onSelect={handleSelectConversation}
              search={search}
              onSearchChange={setSearch}
              filter={filter}
              onFilterChange={setFilter}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              loadingMore={loadingMore}
              totalCount={totalCount}
            />
          </div>

          {/* CENTER: CHAT WINDOW */}
          <div className={`min-w-0 h-full min-h-0 flex flex-col ${!activeId ? "hidden lg:flex" : "flex"}`}>
            {activeConversation ? (
              <ChatWindow
                conversationId={activeConversation.id}
                customerName={activeConversation.name}
                messages={messagesLoading ? [] : messages}
                onSend={handleSend}
                isHuman={activeConversationData?.assigned_to !== "ai"}
                isResolved={activeConversationData?.status === "resolved"}
                actionLoading={actionLoading}
                onTakeOver={handleTakeOver}
                onReturnToAI={handleReturnToAI}
                onResolve={handleResolve}
                onReopen={handleReopen}
                onBack={() => setActiveId("")}
              />
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d]">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  Select a conversation from the inbox to view chat history.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: CUSTOMER DETAILS PANEL */}
          <div className="hidden xl:block h-full min-h-0 min-w-0">
            <CustomerPanel
              customerName={activeConversation?.name || "Customer"}
              customerEmail={activeConversationData?.customer_email || undefined}
              location={activeConversationData?.country || undefined}
              firstSeen={
                activeConversationData?.created_at
                  ? new Date(activeConversationData.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : undefined
              }
              lastActivity={
                activeConversationData?.updated_at || activeConversationData?.created_at
                  ? formatTimeAgo(activeConversationData.updated_at || activeConversationData.created_at)
                  : undefined
              }
              isAI={activeConversationData?.assigned_to === "ai"}
              isResolved={activeConversationData?.status === "resolved"}
              actionLoading={actionLoading}
              onTakeOver={handleTakeOver}
              onReturnToAI={handleReturnToAI}
              onResolve={handleResolve}
              onReopen={handleReopen}
            />
          </div>
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] shadow-xs">
          <div className="max-w-md px-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-[#5B3DF5] dark:text-[#9B7CFC]">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                <path d="M8 12h.01" />
                <path d="M12 12h.01" />
                <path d="M16 12h.01" />
              </svg>
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              No Conversations Yet
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Customer conversations will automatically appear here when visitors chat with your Sales Pilot AI assistant.
            </p>

            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Install the widget on your website to start receiving conversations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// HELPER: FORMAT TIME AGO
// =====================================================

function formatTimeAgo(timestamp: string) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const difference = now.getTime() - date.getTime();
  const seconds = Math.floor(difference / 1000);

  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
