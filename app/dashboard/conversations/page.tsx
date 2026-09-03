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

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="space-y-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Conversations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage customer conversations handled by your AI assistant.
          </p>
        </div>

        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-theme bg-card shadow-xs">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-indigo-600" />
            <p className="text-xs text-muted-foreground">
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
    <div className="space-y-3">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Conversations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage customer conversations handled by your AI assistant.
          </p>
        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
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
          TOOLBAR: SEARCH & FILTERS
      ================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <ConversationSearch
          value={search}
          onChange={setSearch}
        />

        <ConversationFilters
          selected={filter}
          onSelect={setFilter}
        />
      </div>

      {/* =================================================
          NO SEARCH RESULTS
      ================================================= */}
      {conversations.length > 0 &&
        filteredConversations.length === 0 && (
          <div className="rounded-2xl border border-theme bg-card p-8 text-center">
            <h3 className="text-sm font-semibold text-foreground">
              No matching conversations
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Try changing your search keywords or active filter.
            </p>
          </div>
        )}

      {/* =================================================
          MAIN WORKSPACE (3-COLUMN RESPONSIVE)
      ================================================= */}
      {conversations.length > 0 ? (
        <div className="grid h-[calc(100vh-210px)] min-h-[500px] max-h-[820px] gap-3 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_minmax(0,1fr)_280px]">
          {/* =================================================
              LEFT: INBOX LIST
          ================================================= */}
          <ConversationList
            conversations={filteredConversations}
            activeId={activeId}
            onSelect={handleSelectConversation}
          />

          {/* =================================================
              CENTER: CHAT WINDOW
          ================================================= */}
          <div className="min-w-0 h-full flex flex-col">
            {activeConversation ? (
              <ChatWindow
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
              />
            ) : (
              <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-theme bg-card">
                <p className="text-xs text-muted-foreground">
                  Select a conversation from the inbox to view chat history.
                </p>
              </div>
            )}
          </div>

          {/* =================================================
              RIGHT: CUSTOMER DETAILS PANEL
          ================================================= */}
          <div className="hidden xl:block h-full min-w-0">
            <CustomerPanel
              customerName={activeConversation?.name || "Customer"}
              customerEmail={activeConversationData?.customer_email || undefined}
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

        // =================================================
        // EMPTY STATE
        // =================================================

        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-theme bg-card shadow-xs">
          <div className="max-w-md px-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
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

            <h2 className="mt-4 text-lg font-bold text-foreground">
              No Conversations Yet
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Customer conversations will automatically appear here when visitors start chatting with your Sales Pilot AI assistant.
            </p>

            <p className="mt-3 text-xs text-muted-foreground/80">
              Open your widget test page and send a message to create your first conversation.
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