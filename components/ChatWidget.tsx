"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  MessageCircle,
  X,
  Bot,
  Send,
  Check,
  ExternalLink,
  User,
} from "lucide-react";

// ========================================
// PROPS
// ========================================

interface Props {
  profileId: string;

  aiName?: string;

  brandColor?: string;

  welcomeMessage?: string;

  preview?: boolean;

  // Appearance
  theme?: "Light" | "Dark";

  size?: "Small" | "Medium" | "Large";

  radius?:
    | "Square"
    | "Rounded"
    | "Pill";

  position?:
    | "Bottom Right"
    | "Bottom Left";

  // Behavior
  autoOpen?: boolean;

  showTypingIndicator?: boolean;

  soundNotifications?: boolean;

  showAiAvatar?: boolean;

  collectVisitorName?: boolean;

  collectVisitorEmail?: boolean;

  enableAnimations?: boolean;

  showPoweredBy?: boolean;
}

// ========================================
// MESSAGE TYPES
// ========================================

interface Message {
  id: string;

  sender: "ai" | "customer";

  content: string;

  timestamp: Date;
}

// ========================================
// PRODUCT TYPE
// ========================================

interface Product {
  name: string;

  price?: string;

  description?: string;

  url?: string;
}

// ========================================
// COMPONENT
// ========================================

export default function ChatWidget({
  profileId,

  aiName = "Sales Pilot",

  brandColor = "#6366F1",

  welcomeMessage =
    "👋 Hi! How can I help you today?",

  preview = false,

  theme = "Light",

  size = "Medium",

  radius = "Rounded",

  position = "Bottom Right",

  autoOpen = true,

  showTypingIndicator = true,

  soundNotifications = false,

  showAiAvatar = true,

  collectVisitorName = false,

  collectVisitorEmail = false,

  enableAnimations = true,

  showPoweredBy = true,
}: Props) {
  // ======================================
  // STATE
  // ======================================

  const [open, setOpen] =
    useState(
      preview || autoOpen
    );

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [visitorName, setVisitorName] =
    useState("");

  const [visitorEmail, setVisitorEmail] =
    useState("");

  const [visitorSessionId, setVisitorSessionId] =
    useState("");

  const [started, setStarted] =
    useState(
      !collectVisitorName &&
        !collectVisitorEmail
    );

  // ======================================
  // REFS
  // ======================================

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  // ======================================
  // MESSAGE STATE
  // ======================================

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: "welcome",

        sender: "ai",

        content: welcomeMessage,

        timestamp: new Date(),
      },
    ]);

  // ======================================
  // LOAD SESSION
  // ======================================

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const storageKey =
      `sales-pilot-session-${profileId}`;

    const existingSession =
      localStorage.getItem(
        storageKey
      );

    if (existingSession) {
      setVisitorSessionId(
        existingSession
      );
    }
  }, [profileId]);

  // ======================================
  // AUTO SCROLL
  // ======================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior:
          enableAnimations
            ? "smooth"
            : "auto",
      }
    );
  }, [
    messages,
    loading,
    enableAnimations,
  ]);

  // ======================================
  // FOCUS INPUT
  // ======================================

  useEffect(() => {
    if (
      open &&
      started &&
      !loading
    ) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [
    open,
    started,
    loading,
  ]);

  // ======================================
  // SIZE
  // ======================================

  const sizeClass =
    size === "Small"
      ? "w-[340px] h-[500px]"
      : size === "Large"
      ? "w-[430px] h-[680px]"
      : "w-[390px] h-[600px]";

  // ======================================
  // RADIUS
  // ======================================

  const radiusClass =
    radius === "Square"
      ? "rounded-none"
      : radius === "Pill"
      ? "rounded-[32px]"
      : "rounded-[24px]";

  // ======================================
  // POSITION
  // ======================================

  const positionClass =
    position === "Bottom Left"
      ? "left-6"
      : "right-6";

  // ======================================
  // THEME
  // ======================================

  const isDark =
    theme === "Dark";

  const backgroundClass =
    isDark
      ? "bg-slate-950 text-white"
      : "bg-white text-slate-900";

  const messagesBackground =
    isDark
      ? "bg-slate-900"
      : "bg-slate-50";

  // ======================================
  // START CONVERSATION
  // ======================================

  function startConversation() {
    if (
      collectVisitorName &&
      !visitorName.trim()
    ) {
      return;
    }

    if (
      collectVisitorEmail &&
      !visitorEmail.trim()
    ) {
      return;
    }

    setStarted(true);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

  // ======================================
  // FORMAT TIME
  // ======================================

  function formatTime(
    date: Date
  ) {
    return date.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  // ======================================
  // PLAY SOUND
  // ======================================

  function playNotificationSound() {
    if (
      !soundNotifications ||
      typeof window ===
        "undefined"
    ) {
      return;
    }

    try {
      const audioContext =
        new (
          window.AudioContext ||
          (
            window as any
          ).webkitAudioContext
        )();

      const oscillator =
        audioContext.createOscillator();

      const gain =
        audioContext.createGain();

      oscillator.frequency.value =
        700;

      oscillator.type =
        "sine";

      gain.gain.value =
        0.04;

      oscillator.connect(
        gain
      );

      gain.connect(
        audioContext.destination
      );

      oscillator.start();

      oscillator.stop(
        audioContext.currentTime +
          0.08
      );
    } catch {
      // Ignore audio errors.
    }
  }

  // ========================================
  // SEND MESSAGE
  // ========================================

  async function sendMessage() {
    if (
      !message.trim() ||
      loading
    ) {
      return;
    }

    const userMessage =
      message.trim();

    const customerMessage: Message =
      {
        id:
          `customer-${Date.now()}`,

        sender:
          "customer",

        content:
          userMessage,

        timestamp:
          new Date(),
      };

    setMessages(
      (prev) => [
        ...prev,
        customerMessage,
      ]
    );

    setMessage("");

    setLoading(true);

    try {
      // ------------------------------------
      // SEND TO API
      // ------------------------------------

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

                visitorSessionId,

                customerName:
                  visitorName ||
                  "Website Visitor",

                customerEmail:
                  visitorEmail ||
                  null,

                // Send conversation
                // history as well.
                conversationHistory:
                  messages.map(
                    (msg) => ({
                      sender:
                        msg.sender,

                      content:
                        msg.content,
                    })
                  ),
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Chat failed"
        );
      }

      // ------------------------------------
      // SAVE SESSION
      // ------------------------------------

      if (
        data.visitorSessionId &&
        typeof window !==
          "undefined"
      ) {
        const storageKey =
          `sales-pilot-session-${profileId}`;

        localStorage.setItem(
          storageKey,
          data.visitorSessionId
        );

        setVisitorSessionId(
          data.visitorSessionId
        );
      }

      // ------------------------------------
      // AI RESPONSE
      // ------------------------------------

      const aiMessage: Message =
        {
          id:
            `ai-${Date.now()}`,

          sender:
            "ai",

          content:
            data.response ||
            "I'm sorry, I couldn't find an answer.",

          timestamp:
            new Date(),
        };

      setMessages(
        (prev) => [
          ...prev,
          aiMessage,
        ]
      );

      playNotificationSound();
    } catch (error: any) {
      console.error(
        "CHAT ERROR:",
        error
      );

      setMessages(
        (prev) => [
          ...prev,
          {
            id:
              `error-${Date.now()}`,

            sender:
              "ai",

            content:
              "I'm sorry, something went wrong. Please try again.",

            timestamp:
              new Date(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  }

  // ========================================
  // HANDLE ENTER
  // ========================================

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      e.key === "Enter"
    ) {
      e.preventDefault();

      sendMessage();
    }
  }

  // ========================================
  // PARSE PRODUCT RESPONSE
  // ========================================

  function parseProductResponse(
    content: string
  ) {
    const urlRegex =
      /(https?:\/\/[^\s]+)/gi;

    const urls =
      content.match(
        urlRegex
      ) || [];

    return {
      urls,
      content,
    };
  }

  // ========================================
  // RENDER MESSAGE
  // ========================================

  function renderMessageContent(
    msg: Message
  ) {
    const parsed =
      parseProductResponse(
        msg.content
      );

    let text =
      parsed.content;

    // --------------------------------------
    // Convert product URL into clickable
    // button/link
    // --------------------------------------

    const url =
      parsed.urls[0];

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

    // --------------------------------------
    // Remove placeholder URL
    // --------------------------------------

    text =
      text.replace(
        /\[Product URL\]/gi,
        ""
      );

    return (
      <div className="space-y-3">
        <p className="whitespace-pre-wrap break-words leading-6">
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
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            View Product
            <ExternalLink
              size={15}
            />
          </a>
        )}
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      {/* ================================== */}
      {/* CHAT WINDOW */}
      {/* ================================== */}

      {open && (
        <div
          className={`
            fixed
            bottom-24
            ${positionClass}
            ${sizeClass}
            ${radiusClass}
            ${backgroundClass}
            z-[9999]
            flex
            flex-col
            overflow-hidden
            border
            border-slate-200/80
            shadow-[0_20px_60px_rgba(15,23,42,0.25)]
            ${
              enableAnimations
                ? "animate-in fade-in slide-in-from-bottom-4 duration-200"
                : ""
            }
          `}
        >
          {/* ================================= */}
          {/* HEADER */}
          {/* ================================= */}

          <div
            style={{
              backgroundColor:
                brandColor,
            }}
            className="flex shrink-0 items-center justify-between px-5 py-4 text-white"
          >
            <div className="flex min-w-0 items-center gap-3">
              {/* Avatar */}

              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                  <Bot
                    size={22}
                  />
                </div>

                {/* Online dot */}

                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
              </div>

              {/* Name */}

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

            {/* Close */}

            {!preview && (
              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
                aria-label="Close chat"
              >
                <X
                  size={20}
                />
              </button>
            )}
          </div>

          {/* ================================= */}
          {/* WELCOME / START FORM */}
          {/* ================================= */}

          {!started ? (
            <div
              className={`
                flex
                flex-1
                flex-col
                justify-center
                px-6
                ${
                  isDark
                    ? "bg-slate-950"
                    : "bg-white"
                }
              `}
            >
              <div className="mb-6">
                <div
                  style={{
                    backgroundColor:
                      `${brandColor}18`,
                    color:
                      brandColor,
                  }}
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                >
                  <Bot
                    size={25}
                  />
                </div>

                <h2 className="text-2xl font-bold">
                  Before we start 👋
                </h2>

                <p
                  className={`mt-2 text-sm leading-6 ${
                    isDark
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Tell us a little about
                  yourself so our AI can
                  better assist you.
                </p>
              </div>

              {collectVisitorName && (
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold">
                    Your name
                  </label>

                  <input
                    value={
                      visitorName
                    }
                    onChange={(e) =>
                      setVisitorName(
                        e.target.value
                      )
                    }
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:ring-2"
                    style={{
                      borderColor:
                        `${brandColor}55`,
                    }}
                  />
                </div>
              )}

              {collectVisitorEmail && (
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-semibold">
                    Your email
                  </label>

                  <input
                    type="email"
                    value={
                      visitorEmail
                    }
                    onChange={(e) =>
                      setVisitorEmail(
                        e.target.value
                      )
                    }
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={
                  startConversation
                }
                style={{
                  backgroundColor:
                    brandColor,
                }}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              >
                Start Chat
              </button>
            </div>
          ) : (
            <>
              {/* ================================= */}
              {/* MESSAGES */}
              {/* ================================= */}

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
                    (msg) => {
                      const isAI =
                        msg.sender ===
                        "ai";

                      return (
                        <div
                          key={
                            msg.id
                          }
                          className={`
                            flex
                            ${
                              isAI
                                ? "justify-start"
                                : "justify-end"
                            }
                          `}
                        >
                          <div
                            className={`
                              flex
                              max-w-[88%]
                              gap-2.5
                              ${
                                isAI
                                  ? "items-start"
                                  : "items-end"
                              }
                            `}
                          >
                            {/* AI avatar */}

                            {isAI &&
                              showAiAvatar && (
                                <div
                                  style={{
                                    backgroundColor:
                                      `${brandColor}18`,
                                    color:
                                      brandColor,
                                  }}
                                  className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                >
                                  <Bot
                                    size={
                                      16
                                    }
                                  />
                                </div>
                              )}

                            <div>
                              {/* Bubble */}

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
                                {renderMessageContent(
                                  msg
                                )}
                              </div>

                              {/* Time */}

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
                                {formatTime(
                                  msg.timestamp
                                )}

                                {!isAI && (
                                  <span className="ml-1">
                                    <Check
                                      size={
                                        11
                                      }
                                      className="inline"
                                    />
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Customer avatar */}

                            {!isAI && (
                              <div
                                style={{
                                  backgroundColor:
                                    `${brandColor}18`,
                                  color:
                                    brandColor,
                                }}
                                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                              >
                                <User
                                  size={
                                    15
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}

                  {/* ================================= */}
                  {/* TYPING INDICATOR */}
                  {/* ================================= */}

                  {loading &&
                    showTypingIndicator && (
                      <div className="flex items-start gap-2.5">
                        {showAiAvatar && (
                          <div
                            style={{
                              backgroundColor:
                                `${brandColor}18`,
                              color:
                                brandColor,
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          >
                            <Bot
                              size={
                                16
                              }
                            />
                          </div>
                        )}

                        <div
                          className={`
                            rounded-2xl
                            rounded-tl-md
                            px-4
                            py-3
                            ${
                              isDark
                                ? "bg-slate-800"
                                : "bg-white"
                            }
                            shadow-sm
                          `}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              style={{
                                backgroundColor:
                                  brandColor,
                              }}
                              className="h-1.5 w-1.5 animate-bounce rounded-full"
                            />

                            <span
                              style={{
                                backgroundColor:
                                  brandColor,
                              }}
                              className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:120ms]"
                            />

                            <span
                              style={{
                                backgroundColor:
                                  brandColor,
                              }}
                              className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:240ms]"
                            />
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

              {/* ================================= */}
              {/* INPUT */}
              {/* ================================= */}

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
                      ref={inputRef}
                      value={message}
                      onChange={(e) =>
                        setMessage(
                          e.target.value
                        )
                      }
                      onKeyDown={
                        handleKeyDown
                      }
                      disabled={
                        loading
                      }
                      placeholder="Ask me anything..."
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
                      !message.trim()
                    }
                    style={{
                      backgroundColor:
                        brandColor,
                    }}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send
                      size={19}
                    />
                  </button>
                </div>

                {/* Powered by */}

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
            </>
          )}
        </div>
      )}

      {/* ================================== */}
      {/* FLOATING BUTTON */}
      {/* ================================== */}

      {!preview && (
        <button
          type="button"
          onClick={() =>
            setOpen(
              (previous) =>
                !previous
            )
          }
          style={{
            backgroundColor:
              brandColor,
          }}
          className={`
            fixed
            bottom-6
            ${positionClass}
            z-[9999]
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-full
            text-white
            shadow-[0_10px_30px_rgba(0,0,0,0.2)]
            transition
            hover:scale-105
          `}
          aria-label={
            open
              ? "Close chat"
              : "Open chat"
          }
        >
          {open ? (
            <X size={23} />
          ) : (
            <MessageCircle
              size={23}
            />
          )}
        </button>
      )}
    </>
  );
}