"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import ConversationStats from "@/components/conversations/ConversationStats";
import ConversationSearch from "@/components/conversations/ConversationSearch";
import ConversationFilters from "@/components/conversations/ConversationFilters";
import ConversationList from "@/components/conversations/ConversationList";
import ChatWindow from "@/components/conversations/ChatWindow";
import CustomerPanel from "@/components/conversations/CustomerPanel";

import type { Conversation } from "@/components/conversations/ConversationItem";
import type { ChatMessage } from "@/components/conversations/MessageBubble";

import {
  Bot,
  CheckCircle2,
  UserRound,
  RotateCcw,
} from "lucide-react";

// =====================================================
// DATABASE TYPES
// =====================================================

interface DatabaseConversation {
  id: string;
  profile_id: string;
  visitor_session_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  assigned_to: string | null;
  status: string | null;
  created_at: string;
}

interface DatabaseMessage {
  id: string;
  conversation_id: string;
  sender: string;
  content: string;
  created_at: string;
}

// =====================================================
// PAGE
// =====================================================

export default function ConversationsPage() {
  const supabase = createClient();

  // ===================================================
  // STATE
  // ===================================================

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("All");

  const [activeId, setActiveId] = useState("");

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [stats, setStats] = useState({
    total: 0,
    aiResolved: 0,
    humanSupport: 0,
    avgResponse: "0s",
  });

  const [loading, setLoading] = useState(true);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [sending, setSending] = useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] = useState("");

  // ===================================================
  // CURRENT PROFILE
  // ===================================================

  const [profileId, setProfileId] = useState("");

  // ===================================================
  // CURRENT CONVERSATION DATA
  // ===================================================

  const [
    activeConversationData,
    setActiveConversationData,
  ] = useState<DatabaseConversation | null>(null);

  // ===================================================
  // LOAD CURRENT USER
  // ===================================================

  const loadCurrentUser = useCallback(async () => {
    const {
      data,
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error(
        "AUTH USER ERROR:",
        error
      );

      return null;
    }

    if (!data.user) {
      console.log(
        "NO AUTHENTICATED USER"
      );

      return null;
    }

    console.log(
      "AUTH USER:",
      data.user.id
    );

    setProfileId(data.user.id);

    return data.user.id;
  }, [supabase]);

  // ===================================================
  // GET LAST MESSAGE
  // ===================================================

  const getLastMessage = useCallback(
    async (conversationId: string) => {
      const {
        data,
        error,
      } = await supabase
        .from("conversation_messages")
        .select(
          "id, conversation_id, sender, content, created_at"
        )
        .eq(
          "conversation_id",
          conversationId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1);

      if (error) {
        console.error(
          "LAST MESSAGE ERROR:",
          error
        );

        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as DatabaseMessage;
    },
    [supabase]
  );

  // ===================================================
  // LOAD CONVERSATIONS
  // ===================================================

  const loadConversations = useCallback(
    async (currentProfileId?: string) => {
      try {
        setError("");

        const id =
          currentProfileId ||
          profileId;

        if (!id) {
          return;
        }

        console.log(
          "================================="
        );

        console.log(
          "LOADING CONVERSATIONS"
        );

        console.log(
          "PROFILE ID:",
          id
        );

        console.log(
          "================================="
        );

        const {
          data,
          error,
        } = await supabase
          .from("conversations")
          .select(
            `
              id,
              profile_id,
              visitor_session_id,
              customer_name,
              customer_email,
              assigned_to,
              status,
              created_at
            `
          )
          .eq(
            "profile_id",
            id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (error) {
          console.error(
            "CONVERSATIONS ERROR:",
            error
          );

          setError(error.message);

          return;
        }

        const rows =
          (data || []) as DatabaseConversation[];

        console.log(
          "CONVERSATIONS FOUND:",
          rows.length
        );

        // =================================================
        // FORMAT CONVERSATIONS
        // =================================================

        const formatted =
          await Promise.all(
            rows.map(
              async (conversation) => {
                const lastMessage =
                  await getLastMessage(
                    conversation.id
                  );

                return {
                  id:
                    conversation.id,

                  name:
                    conversation.customer_name ||
                    "Website Visitor",

                  lastMessage:
                    lastMessage?.content ||
                    "No messages yet",

                  time:
                    lastMessage?.created_at
                      ? formatTime(
                          lastMessage.created_at
                        )
                      : formatTime(
                          conversation.created_at
                        ),

                  unread: 0,

                  ai:
                    conversation.assigned_to ===
                    "ai",

                  online:
                    conversation.status ===
                    "open",
                } satisfies Conversation;
              }
            )
          );

        setConversations(formatted);

        // =================================================
        // STATS
        // =================================================

        const total = rows.length;

        const aiResolved =
          rows.filter(
            (item) =>
              item.assigned_to === "ai" &&
              item.status === "resolved"
          ).length;

        const humanSupport =
          rows.filter(
            (item) =>
              item.assigned_to !== "ai" &&
              item.assigned_to !== null &&
              item.status !== "resolved"
          ).length;

        setStats({
          total,

          aiResolved,

          humanSupport,

          avgResponse:
            total > 0
              ? "1m 30s"
              : "0s",
        });

        // =================================================
        // KEEP ACTIVE CONVERSATION
        // =================================================

        if (formatted.length > 0) {
          setActiveId((previous) => {
            const stillExists =
              formatted.some(
                (item) =>
                  item.id === previous
              );

            if (
              previous &&
              stillExists
            ) {
              return previous;
            }

            return formatted[0].id;
          });
        } else {
          setActiveId("");

          setMessages([]);

          setActiveConversationData(null);
        }
      } catch (err) {
        console.error(
          "LOAD CONVERSATIONS FAILED:",
          err
        );

        setError(
          "Unable to load conversations."
        );
      }
    },
    [
      profileId,
      supabase,
      getLastMessage,
    ]
  );

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setLoading(true);

        const id =
          await loadCurrentUser();

        if (
          mounted &&
          id
        ) {
          await loadConversations(id);
        }
      } catch (err) {
        console.error(
          "CONVERSATIONS INITIALIZATION ERROR:",
          err
        );

        if (mounted) {
          setError(
            "Unable to load conversations."
          );
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
  }, [
    loadCurrentUser,
    loadConversations,
  ]);

  // ===================================================
  // LOAD ACTIVE CONVERSATION DATA
  // ===================================================

  const loadActiveConversation =
    useCallback(
      async (conversationId: string) => {
        if (!profileId) {
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("conversations")
          .select(
            `
              id,
              profile_id,
              visitor_session_id,
              customer_name,
              customer_email,
              assigned_to,
              status,
              created_at
            `
          )
          .eq(
            "id",
            conversationId
          )
          .eq(
            "profile_id",
            profileId
          )
          .maybeSingle();

        if (error) {
          console.error(
            "ACTIVE CONVERSATION ERROR:",
            error
          );

          return;
        }

        setActiveConversationData(
          data as DatabaseConversation | null
        );
      },
      [profileId, supabase]
    );

  // ===================================================
  // LOAD MESSAGES
  // ===================================================

  const loadMessages =
    useCallback(
      async (conversationId: string) => {
        try {
          setMessagesLoading(true);

          setError("");

          console.log(
            "================================="
          );

          console.log(
            "LOADING CONVERSATION MESSAGES"
          );

          console.log(
            "CONVERSATION:",
            conversationId
          );

          console.log(
            "================================="
          );

          const {
            data,
            error,
          } = await supabase
            .from(
              "conversation_messages"
            )
            .select(
              `
                id,
                conversation_id,
                sender,
                content,
                created_at
              `
            )
            .eq(
              "conversation_id",
              conversationId
            )
            .order(
              "created_at",
              {
                ascending: true,
              }
            );

          if (error) {
            console.error(
              "MESSAGES ERROR:",
              error
            );

            setMessages([]);

            setError(error.message);

            return;
          }

          const rows =
            (data || []) as DatabaseMessage[];

          console.log(
            "MESSAGES FOUND:",
            rows.length
          );

          const formatted: ChatMessage[] =
            rows.map((item) => ({
              id: item.id,

              sender:
                item.sender === "ai"
                  ? "ai"
                  : "customer",

              message: item.content,

              time:
                formatTime(
                  item.created_at
                ),
            }));

          setMessages(formatted);
        } catch (err) {
          console.error(
            "LOAD MESSAGES FAILED:",
            err
          );

          setMessages([]);

          setError(
            "Unable to load messages."
          );
        } finally {
          setMessagesLoading(false);
        }
      },
      [supabase]
    );

  // ===================================================
  // LOAD ACTIVE CONVERSATION
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
  }, [
    activeId,
    profileId,
    loadMessages,
    loadActiveConversation,
  ]);

  // ===================================================
  // REALTIME
  // ===================================================

  useEffect(() => {
    if (!profileId) {
      return;
    }

    console.log(
      "STARTING CONVERSATION REALTIME"
    );

    const channel =
      supabase
        .channel(
          `sales-pilot-conversations-${profileId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "conversation_messages",
          },
          async (payload) => {
            console.log(
              "REALTIME NEW MESSAGE:",
              payload.new
            );

            const newMessage =
              payload.new as DatabaseMessage;

            if (
              newMessage.conversation_id ===
              activeId
            ) {
              await loadMessages(activeId);
            }

            await loadConversations(
              profileId
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversations",
          },
          async (payload) => {
            console.log(
              "REALTIME CONVERSATION UPDATE:",
              payload.new
            );

            const updated =
              payload.new as DatabaseConversation;

            if (
              updated.id === activeId
            ) {
              setActiveConversationData(
                updated
              );

              await loadMessages(
                activeId
              );
            }

            await loadConversations(
              profileId
            );
          }
        )
        .subscribe((status) => {
          console.log(
            "REALTIME STATUS:",
            status
          );
        });

    return () => {
      console.log(
        "STOPPING CONVERSATION REALTIME"
      );

      supabase.removeChannel(channel);
    };
  }, [
    profileId,
    activeId,
    loadMessages,
    loadConversations,
    supabase,
  ]);

  // ===================================================
  // SELECT CONVERSATION
  // ===================================================

  function handleSelectConversation(
    conversationId: string
  ) {
    console.log(
      "SELECTED CONVERSATION:",
      conversationId
    );

    setActiveId(conversationId);
  }

  // ===================================================
  // FILTER
  // ===================================================

  const filteredConversations =
    useMemo(() => {
      const searchText =
        search
          .toLowerCase()
          .trim();

      return conversations.filter(
        (conversation) => {
          const matchesSearch =
            !searchText ||
            conversation.name
              .toLowerCase()
              .includes(searchText) ||
            conversation.lastMessage
              .toLowerCase()
              .includes(searchText);

          if (filter === "AI") {
            return (
              matchesSearch &&
              conversation.ai
            );
          }

          if (filter === "Human") {
            return (
              matchesSearch &&
              !conversation.ai
            );
          }

          return matchesSearch;
        }
      );
    }, [
      conversations,
      search,
      filter,
    ]);

  // ===================================================
  // ACTIVE CONVERSATION
  // ===================================================

  const activeConversation =
    conversations.find(
      (conversation) =>
        conversation.id === activeId
    ) || null;

  // ===================================================
  // TAKE OVER
  // ===================================================

  async function handleTakeOver() {
    if (
      !activeConversation ||
      !profileId ||
      actionLoading
    ) {
      return;
    }

    try {
      setActionLoading(true);

      setError("");

      console.log(
        "TAKING OVER CONVERSATION:",
        activeConversation.id
      );

      const {
        data,
        error,
      } = await supabase
        .from("conversations")
        .update({
          assigned_to: profileId,
          status: "open",
        })
        .eq(
          "id",
          activeConversation.id
        )
        .eq(
          "profile_id",
          profileId
        )
        .select()
        .single();

      if (error) {
        console.error(
          "TAKEOVER SUPABASE ERROR:",
          error
        );

        throw error;
      }

      console.log(
        "CONVERSATION TAKEN OVER:",
        data
      );

      await loadActiveConversation(
        activeConversation.id
      );

      await loadConversations(
        profileId
      );
    } catch (err: any) {
      console.error(
        "TAKEOVER ERROR:",
        err
      );

      setError(
        err?.message ||
          "Unable to take over conversation."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ===================================================
  // RETURN TO AI
  // ===================================================

  async function handleReturnToAI() {
    if (
      !activeConversation ||
      !profileId ||
      actionLoading
    ) {
      return;
    }

    try {
      setActionLoading(true);

      setError("");

      console.log(
        "RETURNING CONVERSATION TO AI:",
        activeConversation.id
      );

      const {
        data,
        error,
      } = await supabase
        .from("conversations")
        .update({
          assigned_to: "ai",
          status: "open",
        })
        .eq(
          "id",
          activeConversation.id
        )
        .eq(
          "profile_id",
          profileId
        )
        .select()
        .single();

      if (error) {
        console.error(
          "RETURN TO AI SUPABASE ERROR:",
          error
        );

        throw error;
      }

      console.log(
        "CONVERSATION RETURNED TO AI:",
        data
      );

      await loadActiveConversation(
        activeConversation.id
      );

      await loadConversations(
        profileId
      );
    } catch (err: any) {
      console.error(
        "RETURN TO AI ERROR:",
        err
      );

      setError(
        err?.message ||
          "Unable to return conversation to AI."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ===================================================
  // RESOLVE
  // ===================================================

  async function handleResolve() {
    if (
      !activeConversation ||
      !profileId ||
      actionLoading
    ) {
      return;
    }

    try {
      setActionLoading(true);

      setError("");

      console.log(
        "RESOLVING CONVERSATION:",
        activeConversation.id
      );

      const {
        data,
        error,
      } = await supabase
        .from("conversations")
        .update({
          status: "resolved",
        })
        .eq(
          "id",
          activeConversation.id
        )
        .eq(
          "profile_id",
          profileId
        )
        .select()
        .single();

      if (error) {
        console.error(
          "RESOLVE SUPABASE ERROR:",
          error
        );

        throw error;
      }

      console.log(
        "CONVERSATION RESOLVED:",
        data
      );

      await loadActiveConversation(
        activeConversation.id
      );

      await loadConversations(
        profileId
      );
    } catch (err: any) {
      console.error(
        "RESOLVE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Unable to resolve conversation."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ===================================================
  // REOPEN
  // ===================================================

  async function handleReopen() {
    if (
      !activeConversation ||
      !profileId ||
      actionLoading
    ) {
      return;
    }

    try {
      setActionLoading(true);

      setError("");

      console.log(
        "REOPENING CONVERSATION:",
        activeConversation.id
      );

      const {
        data,
        error,
      } = await supabase
        .from("conversations")
        .update({
          status: "open",
        })
        .eq(
          "id",
          activeConversation.id
        )
        .eq(
          "profile_id",
          profileId
        )
        .select()
        .single();

      if (error) {
        console.error(
          "REOPEN SUPABASE ERROR:",
          error
        );

        throw error;
      }

      console.log(
        "CONVERSATION REOPENED:",
        data
      );

      await loadActiveConversation(
        activeConversation.id
      );

      await loadConversations(
        profileId
      );
    } catch (err: any) {
      console.error(
        "REOPEN ERROR:",
        err
      );

      setError(
        err?.message ||
          "Unable to reopen conversation."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ===================================================
  // SEND HUMAN MESSAGE
  // ===================================================

  async function handleSend(
    text: string
  ) {
    const cleanText =
      text.trim();

    if (
      !cleanText ||
      !activeConversation ||
      !profileId ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);

      setError("");

      console.log(
        "================================="
      );

      console.log(
        "SENDING HUMAN MESSAGE"
      );

      console.log(
        "CONVERSATION:",
        activeConversation.id
      );

      console.log(
        "MESSAGE:",
        cleanText
      );

      console.log(
        "================================="
      );

      // =================================================
      // ASSIGN TO HUMAN
      // =================================================

      const {
        error:
          conversationUpdateError,
      } = await supabase
        .from("conversations")
        .update({
          assigned_to: profileId,
          status: "open",
        })
        .eq(
          "id",
          activeConversation.id
        )
        .eq(
          "profile_id",
          profileId
        );

      if (conversationUpdateError) {
        console.error(
          "CONVERSATION UPDATE ERROR:",
          conversationUpdateError
        );

        throw conversationUpdateError;
      }

      // =================================================
      // SAVE HUMAN MESSAGE
      // =================================================

      const {
        data,
        error,
      } = await supabase
        .from(
          "conversation_messages"
        )
        .insert({
          conversation_id:
            activeConversation.id,

          sender: "human",

          content: cleanText,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "HUMAN MESSAGE ERROR:",
          error
        );

        throw error;
      }

      console.log(
        "HUMAN MESSAGE SAVED:",
        data
      );

      // =================================================
      // RELOAD
      // =================================================

      await loadMessages(
        activeConversation.id
      );

      await loadActiveConversation(
        activeConversation.id
      );

      await loadConversations(
        profileId
      );
    } catch (err: any) {
      console.error(
        "SEND HUMAN MESSAGE FAILED:",
        err
      );

      setError(
        err?.message ||
          "Unable to send message."
      );
    } finally {
      setSending(false);
    }
  }

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="space-y-6">

        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            Conversations
          </h1>

          <p className="mt-2 text-slate-500">
            Manage customer conversations handled
            by your AI assistant.
          </p>
        </div>

        <div className="flex min-h-[450px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="text-center">

            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

            <p className="text-sm text-slate-500">
              Loading conversations...
            </p>

          </div>

        </div>

      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Conversations
        </h1>

        <p className="mt-2 text-slate-500">
          Manage customer conversations handled
          by your AI assistant.
        </p>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =================================================
          STATS
      ================================================= */}

      <ConversationStats
        total={stats.total}
        aiResolved={stats.aiResolved}
        humanSupport={stats.humanSupport}
        avgResponse={stats.avgResponse}
      />

      {/* =================================================
          SEARCH
      ================================================= */}

      <ConversationSearch
        value={search}
        onChange={setSearch}
      />

      {/* =================================================
          FILTERS
      ================================================= */}

      <ConversationFilters
        selected={filter}
        onSelect={setFilter}
      />

      {/* =================================================
          NO SEARCH RESULTS
      ================================================= */}

      {conversations.length > 0 &&
        filteredConversations.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">

            <h3 className="text-lg font-semibold text-slate-900">
              No matching conversations
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or filter.
            </p>

          </div>
        )}

      {/* =================================================
          MAIN AREA
      ================================================= */}

      {conversations.length > 0 ? (
        <div className="grid min-h-[650px] gap-6 xl:grid-cols-[340px_minmax(0,1fr)_320px]">

          {/* =================================================
              LEFT
          ================================================= */}

          <ConversationList
            conversations={
              filteredConversations
            }
            activeId={activeId}
            onSelect={
              handleSelectConversation
            }
          />

          {/* =================================================
              CENTER
          ================================================= */}

          <div className="min-w-0">

            {activeConversation ? (
              <div className="space-y-3">

                {/* =================================================
                    ACTION BAR
                ================================================= */}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

                  {/* STATUS */}

                  <div className="flex flex-wrap items-center gap-2">

                    {activeConversationData?.assigned_to ===
                    "ai" ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700">

                        <Bot size={15} />

                        AI Handling

                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-sm font-medium text-indigo-700">

                        <UserRound size={15} />

                        Human Handling

                      </span>
                    )}

                    {activeConversationData?.status ===
                      "resolved" && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">

                        <CheckCircle2
                          size={15}
                        />

                        Resolved

                      </span>
                    )}

                    {activeConversationData?.status ===
                      "open" && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                        Open
                      </span>
                    )}

                  </div>

                  {/* ACTIONS */}

                  <div className="flex flex-wrap items-center gap-2">

                    {/* RESOLVE / REOPEN */}

                    {activeConversationData?.status ===
                    "resolved" ? (
                      <button
                        type="button"
                        onClick={
                          handleReopen
                        }
                        disabled={
                          actionLoading
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        <RotateCcw
                          size={15}
                        />

                        {actionLoading
                          ? "Reopening..."
                          : "Reopen"}

                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          handleResolve
                        }
                        disabled={
                          actionLoading
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        <CheckCircle2
                          size={15}
                        />

                        {actionLoading
                          ? "Resolving..."
                          : "Resolve"}

                      </button>
                    )}

                    {/* TAKE OVER / RETURN TO AI */}

                    {activeConversationData?.assigned_to ===
                    "ai" ? (
                      <button
                        type="button"
                        onClick={
                          handleTakeOver
                        }
                        disabled={
                          actionLoading
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        <UserRound
                          size={15}
                        />

                        {actionLoading
                          ? "Taking Over..."
                          : "Take Over"}

                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          handleReturnToAI
                        }
                        disabled={
                          actionLoading
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        <Bot
                          size={15}
                        />

                        {actionLoading
                          ? "Returning..."
                          : "Return to AI"}

                      </button>
                    )}

                  </div>

                </div>

                {/* =================================================
                    CHAT WINDOW
                ================================================= */}

                <ChatWindow
                  customerName={
                    activeConversation.name
                  }

                  messages={
                    messagesLoading
                      ? []
                      : messages
                  }

                  onSend={
                    handleSend
                  }

                  isHuman={
                    activeConversationData?.assigned_to !==
                    "ai"
                  }

                  onReturnToAI={
                    handleReturnToAI
                  }

                  onResolve={
                    handleResolve
                  }
                />

                {/* =================================================
                    SENDING
                ================================================= */}

                {sending && (
                  <p className="text-center text-xs text-slate-400">
                    Sending message...
                  </p>
                )}

              </div>
            ) : (
              <div className="flex h-full min-h-[500px] items-center justify-center rounded-3xl border border-slate-200 bg-white">

                <p className="text-slate-500">
                  Select a conversation.
                </p>

              </div>
            )}

          </div>

          {/* =================================================
              RIGHT — CUSTOMER PANEL
          ================================================= */}

          <CustomerPanel
            customerName={
              activeConversation?.name ||
              "Customer"
            }

            isAI={
              activeConversationData?.assigned_to ===
              "ai"
            }

            isResolved={
              activeConversationData?.status ===
              "resolved"
            }

            actionLoading={
              actionLoading
            }

            onTakeOver={
              handleTakeOver
            }

            onReturnToAI={
              handleReturnToAI
            }

            onResolve={
              handleResolve
            }

            onReopen={
              handleReopen
            }
          />

        </div>
      ) : (

        // =================================================
        // EMPTY STATE
        // =================================================

        <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="max-w-md px-6 text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">

              <svg
                width="36"
                height="36"
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

            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              No Conversations Yet
            </h2>

            <p className="mt-3 leading-7 text-slate-500">
              Customer conversations will
              automatically appear here when
              visitors start chatting with your
              Sales Pilot AI assistant.
            </p>

            <p className="mt-5 text-sm text-slate-400">
              Open your widget test page and send
              a message to create your first
              conversation.
            </p>

          </div>

        </div>
      )}

    </div>
  );
}

// =====================================================
// FORMAT TIME
// =====================================================

function formatTime(timestamp: string) {
  const date = new Date(timestamp);

  const now = new Date();

  const difference =
    now.getTime() -
    date.getTime();

  const seconds = Math.floor(
    difference / 1000
  );

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}