"use client";

import {
  Bot,
  Check,
  ExternalLink,
  Send,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  profileId?: string;

  aiName?: string;
  welcomeMessage?: string;
  brandColor?: string;

  theme?: string;
  size?: string;
  radius?: string;

  position?: string;

  autoOpen?: boolean;
  showTypingIndicator?: boolean;
  showAiAvatar?: boolean;
  enableAnimations?: boolean;
  showPoweredBy?: boolean;
}

interface Message {
  id: string;
  sender: "ai" | "customer";
  content: string;
  timestamp: Date;
}

export default function WidgetPreview({
  profileId,

  aiName = "Sales Pilot AI",

  welcomeMessage =
    "👋 Hi! How can I help you today?",

  brandColor = "#6366F1",

  theme = "Light",

  size = "Medium",

  radius = "Rounded",

  autoOpen = true,

  showTypingIndicator = true,

  showAiAvatar = true,

  enableAnimations = true,

  showPoweredBy = true,
}: Props) {
  // =====================================================
  // STATE
  // =====================================================

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [visitorSessionId, setVisitorSessionId] =
    useState("");

  const [mounted, setMounted] = useState(false);

  // =====================================================
  // REFS
  // =====================================================

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const inputRef =
    useRef<HTMLInputElement | null>(null);

  // =====================================================
  // MESSAGES
  // =====================================================

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: "welcome",

        sender: "ai",

        content: welcomeMessage,

        timestamp: new Date(0),
      },
    ]);

  // =====================================================
  // MOUNT
  // =====================================================

  useEffect(() => {
    setMounted(true);

    setMessages((previous) =>
      previous.map((item) =>
        item.id === "welcome"
          ? {
              ...item,
              content: welcomeMessage,
              timestamp: new Date(),
            }
          : item
      )
    );
  }, [welcomeMessage]);

  // =====================================================
  // LOAD PREVIEW SESSION
  // =====================================================

  useEffect(() => {
    if (!mounted || !profileId) {
      return;
    }

    const storageKey =
      `sales-pilot-preview-session-${profileId}`;

    const existingSession =
      localStorage.getItem(storageKey);

    if (existingSession) {
      setVisitorSessionId(existingSession);

      return;
    }

    const newSession =
      crypto.randomUUID();

    localStorage.setItem(
      storageKey,
      newSession
    );

    setVisitorSessionId(
      newSession
    );
  }, [profileId, mounted]);

  // =====================================================
  // AUTO SCROLL
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior:
        enableAnimations
          ? "smooth"
          : "auto",
    });
  }, [
    messages,
    loading,
    enableAnimations,
  ]);

  // =====================================================
  // FOCUS INPUT
  // =====================================================

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () =>
        clearTimeout(timer);
    }
  }, [loading]);

  // =====================================================
  // SIZE
  // =====================================================

  const widgetHeight =
    size === "Small"
      ? "h-[500px]"
      : size === "Large"
        ? "h-[680px]"
        : "h-[600px]";

  const widgetWidth =
    size === "Small"
      ? "w-[340px]"
      : size === "Large"
        ? "w-[430px]"
        : "w-[390px]";

  // =====================================================
  // RADIUS
  // =====================================================

  const widgetRadius =
    radius === "Square"
      ? "rounded-none"
      : radius === "Pill"
        ? "rounded-[32px]"
        : "rounded-[24px]";

  // =====================================================
  // THEME
  // =====================================================

  const isDark =
    theme.toLowerCase() ===
    "dark";

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  async function sendMessage() {
    if (
      !message.trim() ||
      loading
    ) {
      return;
    }

    if (!profileId) {
      setMessages((previous) => [
        ...previous,
        {
          id:
            `error-${Date.now()}`,

          sender: "ai",

          content:
            "The widget is not connected to a Sales Pilot account yet.",

          timestamp: new Date(),
        },
      ]);

      return;
    }

    const userMessage =
      message.trim();

    // ---------------------------------------------------
    // ADD CUSTOMER MESSAGE
    // ---------------------------------------------------

    const customerMessage: Message = {
      id:
        `customer-${Date.now()}`,

      sender: "customer",

      content:
        userMessage,

      timestamp: new Date(),
    };

    setMessages((previous) => [
      ...previous,
      customerMessage,
    ]);

    setMessage("");

    setLoading(true);

    try {
      console.log(
        "================================="
      );

      console.log(
        "WIDGET PREVIEW CHAT"
      );

      console.log(
        "PROFILE:",
        profileId
      );

      console.log(
        "SESSION:",
        visitorSessionId
      );

      console.log(
        "MESSAGE:",
        userMessage
      );

      console.log(
        "================================="
      );

      // ---------------------------------------------------
      // CALL EXISTING CHAT API
      // ---------------------------------------------------

      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                message:
                  userMessage,

                profileId,

                visitorSessionId:
                  visitorSessionId ||
                  null,

                customerName:
                  "Widget Preview",

                customerEmail:
                  null,
              }),
          }
        );

      // ---------------------------------------------------
      // RESPONSE
      // ---------------------------------------------------

      let data: any =
        null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      console.log(
        "WIDGET CHAT STATUS:",
        response.status
      );

      console.log(
        "WIDGET CHAT RESPONSE:",
        data
      );

      // ---------------------------------------------------
      // ERROR
      // ---------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Chat request failed (${response.status})`
        );
      }

      // ---------------------------------------------------
      // SAVE SESSION
      // ---------------------------------------------------

      if (
        data?.visitorSessionId &&
        typeof window !==
          "undefined"
      ) {
        const storageKey =
          `sales-pilot-preview-session-${profileId}`;

        localStorage.setItem(
          storageKey,
          data.visitorSessionId
        );

        setVisitorSessionId(
          data.visitorSessionId
        );
      }

      // ---------------------------------------------------
      // AI RESPONSE
      // ---------------------------------------------------

      const aiResponse =
        String(
          data?.response ||
            "I'm sorry, I couldn't find an answer."
        ).trim();

      const aiMessage: Message = {
        id:
          `ai-${Date.now()}`,

        sender: "ai",

        content:
          aiResponse,

        timestamp:
          new Date(),
      };

      setMessages((previous) => [
        ...previous,
        aiMessage,
      ]);
    } catch (error) {
      console.error(
        "WIDGET PREVIEW CHAT ERROR:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong.";

      let userFacingError =
        "I'm sorry, something went wrong. Please try again.";

      if (
        errorMessage
          .toLowerCase()
          .includes("billing") ||
        errorMessage
          .toLowerCase()
          .includes("subscription")
      ) {
        userFacingError =
          "This Sales Pilot account does not have an active billing subscription.";
      } else if (
        errorMessage
          .toLowerCase()
          .includes("knowledge")
      ) {
        userFacingError =
          "I couldn't access the store knowledge base right now.";
      } else if (
        errorMessage
          .toLowerCase()
          .includes("profile")
      ) {
        userFacingError =
          "This widget is not connected to a valid Sales Pilot account.";
      }

      setMessages((previous) => [
        ...previous,
        {
          id:
            `error-${Date.now()}`,

          sender: "ai",

          content:
            userFacingError,

          timestamp:
            new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // ENTER KEY
  // =====================================================

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      sendMessage();
    }
  }

  // =====================================================
  // RENDER MESSAGE
  // =====================================================

  function renderMessage(
    msg: Message
  ) {
    const isAI =
      msg.sender === "ai";

    const urlRegex =
      /(https?:\/\/[^\s]+)/gi;

    const urls =
      msg.content.match(
        urlRegex
      ) || [];

    let text =
      msg.content;

    const url =
      urls[0];

    if (url) {
      text =
        text.replace(
          url,
          ""
        );

      text =
        text.replace(
          "View product:",
          ""
        );

      text =
        text.trim();
    }

    text =
      text.replace(
        /\[Product URL\]/gi,
        ""
      );

    return (
      <div
        className={`flex ${
          isAI
            ? "justify-start"
            : "justify-end"
        }`}
      >
        <div
          className={`flex max-w-[88%] gap-2.5 ${
            isAI
              ? "items-start"
              : "items-end"
          }`}
        >
          {/* AI AVATAR */}

          {isAI &&
            showAiAvatar && (
              <div
                className="
                  mt-1
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                "
                style={{
                  backgroundColor:
                    `${brandColor}18`,
                  color:
                    brandColor,
                }}
              >
                <Bot
                  size={16}
                />
              </div>
            )}

          <div>
            {/* MESSAGE */}

            <div
              className={`
                rounded-2xl
                px-4
                py-3
                text-[14px]
                leading-6
                shadow-sm
                ${
                  isAI
                    ? isDark
                      ? "rounded-tl-md bg-slate-800 text-slate-100"
                      : "rounded-tl-md bg-white text-slate-800"
                    : "rounded-tr-md text-white"
                }
              `}
              style={
                !isAI
                  ? {
                      backgroundColor:
                        brandColor,
                    }
                  : undefined
              }
            >
              <p className="whitespace-pre-wrap break-words">
                {text}
              </p>

              {url && (
                <a
                  href={url.replace(
                    /[),.]+$/,
                    ""
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor:
                      brandColor,
                  }}
                  className="
                    mt-3
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:opacity-90
                  "
                >
                  View Product

                  <ExternalLink
                    size={15}
                  />
                </a>
              )}
            </div>

            {/* TIME */}

            {mounted && (
              <div
                className={`
                  mt-1.5
                  px-1
                  text-[10px]
                  ${
                    isAI
                      ? "text-left"
                      : "text-right"
                  }
                  ${
                    isDark
                      ? "text-slate-500"
                      : "text-slate-400"
                  }
                `}
              >
                {msg.timestamp.toLocaleTimeString(
                  [],
                  {
                    hour:
                      "numeric",
                    minute:
                      "2-digit",
                  }
                )}

                {!isAI && (
                  <span className="ml-1">
                    <Check
                      size={11}
                      className="inline"
                    />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* CUSTOMER AVATAR */}

          {!isAI && (
            <div
              className="
                mt-1
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-full
              "
              style={{
                backgroundColor:
                  `${brandColor}18`,
                color:
                  brandColor,
              }}
            >
              <User
                size={15}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-4">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex items-center justify-between">
        <div>
          <h2
            className="
              text-xl
              font-bold
              text-slate-900
              dark:text-white
            "
          >
            Live Preview
          </h2>

          <p
            className="
              mt-1
              text-sm
              text-slate-500
              dark:text-slate-400
            "
          >
            Test your actual Sales Pilot AI widget.
          </p>
        </div>

        <span
          className="
            rounded-full
            bg-emerald-100
            px-3
            py-1
            text-sm
            font-semibold
            text-emerald-700
            dark:bg-emerald-950/50
            dark:text-emerald-300
          "
        >
          Live
        </span>
      </div>

      {/* =================================================
          PREVIEW AREA
      ================================================= */}

      <div
        className="
          relative
          flex
          min-h-[700px]
          items-center
          justify-center
          overflow-hidden
          rounded-3xl
          border
          border-slate-200
          bg-slate-100
          p-6
          shadow-sm
          dark:border-slate-700
          dark:bg-slate-900
        "
      >
        {/* WEBSITE BACKGROUND */}

        <div className="absolute inset-0 opacity-50">
          <div className="absolute left-8 top-8 h-24 w-48 rounded-xl bg-white dark:bg-slate-800" />

          <div className="absolute right-8 top-12 h-32 w-32 rounded-full bg-white dark:bg-slate-800" />

          <div className="absolute bottom-10 left-12 h-40 w-64 rounded-xl bg-white dark:bg-slate-800" />
        </div>

        {/* WIDGET */}

        <div
          className={`
            relative
            z-10
            flex
            flex-col
            overflow-hidden
            border
            shadow-2xl
            ${widgetHeight}
            ${widgetWidth}
            ${widgetRadius}
            ${
              isDark
                ? "border-slate-700 bg-slate-950"
                : "border-slate-200 bg-white"
            }
          `}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className="
              flex
              shrink-0
              items-center
              gap-3
              px-5
              py-4
              text-white
            "
            style={{
              backgroundColor:
                brandColor,
            }}
          >
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                <Bot
                  size={22}
                />
              </div>

              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold">
                {aiName}
              </h3>

              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />

                <span>
                  Online · AI Support
                </span>
              </div>
            </div>
          </div>

          {/* =================================================
              MESSAGES
          ================================================= */}

          <div
            className={`
              flex-1
              overflow-y-auto
              px-4
              py-5
              ${
                isDark
                  ? "bg-slate-900"
                  : "bg-slate-50"
              }
            `}
          >
            <div className="space-y-5">
              {messages.map(
                (msg) => (
                  <div
                    key={msg.id}
                  >
                    {renderMessage(
                      msg
                    )}
                  </div>
                )
              )}

              {/* =================================================
                  TYPING
              ================================================= */}

              {loading &&
                showTypingIndicator && (
                  <div className="flex items-start gap-2.5">
                    {showAiAvatar && (
                      <div
                        className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                        "
                        style={{
                          backgroundColor:
                            `${brandColor}18`,
                          color:
                            brandColor,
                        }}
                      >
                        <Bot
                          size={16}
                        />
                      </div>
                    )}

                    <div
                      className={`
                        rounded-2xl
                        rounded-tl-md
                        px-4
                        py-3
                        shadow-sm
                        ${
                          isDark
                            ? "bg-slate-800"
                            : "bg-white"
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map(
                          (item) => (
                            <span
                              key={
                                item
                              }
                              className="h-1.5 w-1.5 animate-bounce rounded-full"
                              style={{
                                backgroundColor:
                                  brandColor,
                                animationDelay:
                                  `${item * 120}ms`,
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

              <div
                ref={
                  messagesEndRef
                }
              />
            </div>
          </div>

          {/* =================================================
              INPUT
          ================================================= */}

          <div
            className={`
              shrink-0
              border-t
              p-3
              ${
                isDark
                  ? "border-slate-800 bg-slate-950"
                  : "border-slate-200 bg-white"
              }
            `}
          >
            <div className="flex items-end gap-2">
              <div
                className={`
                  flex
                  min-h-[48px]
                  flex-1
                  items-center
                  rounded-2xl
                  border
                  px-4
                  ${
                    isDark
                      ? "border-slate-700 bg-slate-900"
                      : "border-slate-200 bg-slate-50"
                  }
                `}
              >
                <input
                  ref={
                    inputRef
                  }
                  value={
                    message
                  }
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  disabled={
                    loading ||
                    !profileId
                  }
                  placeholder={
                    profileId
                      ? "Ask me anything..."
                      : "Connecting to Sales Pilot..."
                  }
                  className={`
                    w-full
                    bg-transparent
                    text-sm
                    outline-none
                    ${
                      isDark
                        ? "text-white placeholder:text-slate-500"
                        : "text-slate-900 placeholder:text-slate-400"
                    }
                  `}
                />
              </div>

              <button
                type="button"
                onClick={
                  sendMessage
                }
                disabled={
                  loading ||
                  !message.trim() ||
                  !profileId
                }
                style={{
                  backgroundColor:
                    brandColor,
                }}
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  text-white
                  shadow-md
                  transition
                  hover:opacity-90
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Send message"
              >
                <Send
                  size={19}
                />
              </button>
            </div>

            {showPoweredBy && (
              <div
                className={`
                  pt-2
                  text-center
                  text-[10px]
                  ${
                    isDark
                      ? "text-slate-500"
                      : "text-slate-400"
                  }
                `}
              >
                Powered by{" "}
                <span className="font-semibold">
                  Sales Pilot
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}