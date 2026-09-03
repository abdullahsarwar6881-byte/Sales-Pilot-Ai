"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import {
  MessageCircle,
  X,
  Bot,
  Send,
  Check,
  ExternalLink,
  User,
  Paperclip,
  Trash2,
  Sparkles,
  RotateCcw,
} from "lucide-react";

// =====================================================
// PROPS
// =====================================================

interface Props {
  profileId: string;

  aiName?: string;

  brandColor?: string;

  welcomeMessage?: string;

  preview?: boolean;

  theme?: "Light" | "Dark";

  size?: "Small" | "Medium" | "Large";

  radius?: "Square" | "Rounded" | "Pill";

  position?: "Bottom Right" | "Bottom Left";

  autoOpen?: boolean;

  showTypingIndicator?: boolean;

  soundNotifications?: boolean;

  showAiAvatar?: boolean;

  collectVisitorName?: boolean;

  collectVisitorEmail?: boolean;

  enableAnimations?: boolean;

  showPoweredBy?: boolean;
}

// =====================================================
// MESSAGE
// =====================================================

interface Message {
  id: string;

  sender: "ai" | "customer";

  content: string;

  timestamp: Date;

  imageUrl?: string;

  products?: any[];

  siteUrl?: string;
}


// =====================================================
// API RESPONSE
// =====================================================

interface ChatApiResponse {
  response?: string;

  visitorSessionId?: string;

  conversationId?: string;

  messageId?: string;

  products?: unknown[];

  action?: string;

  success?: boolean;

  error?: string;

  message?: string;

  [key: string]: unknown;
}

// =====================================================
// COMPONENT
// =====================================================

export default function ChatWidget({
  profileId,

  aiName = "Sales Pilot",

  brandColor = "#6366F1",

  welcomeMessage =
    "Hi! How can I help you today?",

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
  // ===================================================
  // STATE
  // ===================================================

  const [open, setOpen] = useState(
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

  const [started, setStarted] = useState(
    !collectVisitorName &&
      !collectVisitorEmail
  );

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  const [selectedImageName, setSelectedImageName] =
    useState("");

  const [imageError, setImageError] =
    useState("");

const [zoomImage, setZoomImage] =
    useState<string | null>(null);

  const [mounted, setMounted] =
    useState(false);

  const [showSuggestions, setShowSuggestions] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  // ===================================================
  // REFS
  // ===================================================

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const inputRef =
    useRef<HTMLTextAreaElement | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  // ===================================================
  // MESSAGES
  // ===================================================

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: "welcome",

        sender: "ai",

        content: welcomeMessage,

        timestamp: new Date(0),
      },
    ]);

  // ===================================================
  // SUGGESTIONS
  // ===================================================

  const suggestions = [
    "What products do you have?",
    "Show me your best products",
    "I need help choosing a product",
  ];

  // ===================================================
  // MOUNT
  // ===================================================

  useEffect(() => {
    setMounted(true);

    setMessages((previous) =>
      previous.map((item) =>
        item.id === "welcome"
          ? {
              ...item,
              timestamp: new Date(),
            }
          : item
      )
    );
  }, []);

  // ===================================================
  // LOAD SESSION
  // ===================================================

  useEffect(() => {
    if (
      !mounted ||
      !profileId ||
      typeof window === "undefined"
    ) {
      return;
    }

    const storageKey =
      `sales-pilot-session-${profileId}`;

    const existingSession =
      localStorage.getItem(storageKey);

    if (existingSession) {
      setVisitorSessionId(
        existingSession
      );
    }
  }, [
    profileId,
    mounted,
  ]);

  // ===================================================
  // AUTO SCROLL
  // ===================================================

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

  // ===================================================
  // INPUT FOCUS
  // ===================================================

  useEffect(() => {
    if (
      open &&
      started &&
      !loading
    ) {
      const timer =
        window.setTimeout(() => {
          inputRef.current?.focus();
        }, 150);

      return () =>
        window.clearTimeout(
          timer
        );
    }
  }, [
    open,
    started,
    loading,
  ]);

  // ===================================================
  // SIZE
  // ===================================================

  const sizeClass =
    size === "Small"
      ? "h-[min(560px,calc(100vh-110px))] w-[min(360px,calc(100vw-24px))]"
      : size === "Large"
      ? "h-[min(720px,calc(100vh-110px))] w-[min(460px,calc(100vw-24px))]"
      : "h-[min(640px,calc(100vh-110px))] w-[min(410px,calc(100vw-24px))]";

  // ===================================================
  // RADIUS
  // ===================================================

  const radiusClass =
    radius === "Square"
      ? "rounded-none"
      : radius === "Pill"
      ? "rounded-[30px]"
      : "rounded-[24px]";

  // ===================================================
  // POSITION
  // ===================================================

  const positionClass =
    position === "Bottom Left"
      ? "left-4 sm:left-6"
      : "right-4 sm:right-6";

  // ===================================================
  // THEME
  // ===================================================

  const isDark =
    theme === "Dark";

  const backgroundClass =
    isDark
      ? "bg-slate-950 text-white"
      : "bg-white text-slate-900";

  // ===================================================
  // START CONVERSATION
  // ===================================================

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

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

  // ===================================================
  // FORMAT TIME
  // ===================================================

  function formatTime(
    date: Date
  ) {
    if (!mounted) {
      return "";
    }

    return date.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  // ===================================================
  // PLAY SOUND
  // ===================================================

  function playNotificationSound() {
    if (
      !soundNotifications ||
      typeof window === "undefined"
    ) {
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const audioContext =
        new AudioContextClass();

      const oscillator =
        audioContext.createOscillator();

      const gain =
        audioContext.createGain();

      oscillator.frequency.value =
        680;

      oscillator.type = "sine";

      gain.gain.value = 0.035;

      oscillator.connect(gain);

      gain.connect(
        audioContext.destination
      );

      oscillator.start();

      oscillator.stop(
        audioContext.currentTime +
          0.08
      );

      window.setTimeout(() => {
        void audioContext.close();
      }, 200);
    } catch {
      // Ignore audio errors.
    }
  }

  // ===================================================
  // SELECT IMAGE
  // ===================================================

  function handleImageSelect(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setImageError("");

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setImageError(
        "Please select a JPG, PNG, or WebP image."
      );

      event.target.value = "";

      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      setImageError(
        "Image must be smaller than 5 MB."
      );

      event.target.value = "";

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result !==
        "string"
      ) {
        setImageError(
          "Unable to read this image."
        );

        return;
      }

      setSelectedImage(
        reader.result
      );

      setSelectedImageName(
        file.name
      );
    };

    reader.onerror = () => {
      setImageError(
        "Unable to read this image."
      );
    };

    reader.readAsDataURL(
      file
    );
  }

  // ===================================================
  // REMOVE IMAGE
  // ===================================================

  function removeSelectedImage() {
    setSelectedImage(null);

    setSelectedImageName("");

    setImageError("");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  // ===================================================
  // OPEN IMAGE SELECTOR
  // ===================================================

  function openImageSelector() {
    if (loading) {
      return;
    }

    fileInputRef.current?.click();
  }

  // ===================================================
  // HANDLE INPUT
  // ===================================================

  function handleMessageChange(
    value: string
  ) {
    setMessage(value);

    if (value.trim()) {
      setShowSuggestions(false);
    } else {
      setShowSuggestions(true);
    }
  }

  // ===================================================
  // TEXTAREA AUTO RESIZE
  // ===================================================

  useEffect(() => {
    const textarea =
      inputRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        120
      )}px`;
  }, [message]);

  // ===================================================
  // SEND MESSAGE
  // ===================================================

  async function sendMessage() {
    if (
      (
        !message.trim() &&
        !selectedImage
      ) ||
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
            "This chat widget is not connected to a Sales Pilot account.",

          timestamp:
            new Date(),
        },
      ]);

      return;
    }

    const userMessage =
      message.trim();

    const imageToSend =
      selectedImage;

    // -------------------------------------------------
    // HISTORY
    // -------------------------------------------------

    const historyForApi =
      messages.map((msg) => ({
        sender:
          msg.sender,

        content:
          msg.content,
      }));

    // -------------------------------------------------
    // CUSTOMER MESSAGE
    // -------------------------------------------------

    const customerMessage: Message =
      {
        id:
          `customer-${Date.now()}`,

        sender:
          "customer",

        content:
          userMessage ||
          "Please identify this product.",

        timestamp:
          new Date(),

        imageUrl:
          imageToSend ||
          undefined,
      };

    setMessages((previous) => [
      ...previous,
      customerMessage,
    ]);

    setMessage("");

    setSelectedImage(null);

    setSelectedImageName("");

    setImageError("");

    setShowSuggestions(false);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }

    setLoading(true);

    setSending(true);

    try {
      // =================================================
      // API REQUEST
      // =================================================

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
                  userMessage ||
                  "Please identify this product.",

                profileId,

                visitorSessionId:
                  visitorSessionId ||
                  null,

                customerName:
                  visitorName.trim() ||
                  "Website Visitor",

                customerEmail:
                  visitorEmail.trim() ||
                  null,

                conversationHistory:
                  historyForApi,

                image:
                  imageToSend ||
                  null,
              }),
          }
        );

      // =================================================
      // PARSE RESPONSE
      // =================================================

      let data:
        ChatApiResponse | null =
        null;

      try {
        data =
          (await response.json()) as
            ChatApiResponse;
      } catch {
        data = null;
      }

      // =================================================
      // API ERROR
      // =================================================

      if (!response.ok) {
        const errorMessage =
          data?.error ||
          data?.message ||
          `Chat request failed (${response.status})`;

        throw new Error(
          errorMessage
        );
      }

      // =================================================
      // SAVE SESSION
      // =================================================

      if (
        data?.visitorSessionId &&
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

      // =================================================
      // AI RESPONSE
      // =================================================

      const aiResponse =
        String(
          data?.response ||
            "I'm sorry, I couldn't find an answer."
        ).trim();

      const productData =
        Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data?.productCards)
            ? data.productCards
            : [];

      const aiMessage: Message =
        {
          id:
            `ai-${Date.now()}`,

          sender:
            "ai",

          content:
            aiResponse,

          timestamp:
            new Date(),

          products:
            productData,
          siteUrl:
            typeof data?.siteUrl ===
            "string"
              ? data.siteUrl
              : undefined,
        };

      setMessages((previous) => [
        ...previous,
        aiMessage,
      ]);

      playNotificationSound();
    } catch (error: unknown) {
      console.error(
        "SALES PILOT CHAT ERROR:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong.";

      let userFacingError =
        "I'm sorry, something went wrong. Please try again.";

      const normalizedError =
        errorMessage.toLowerCase();

      if (
        normalizedError.includes(
          "billing"
        ) ||
        normalizedError.includes(
          "subscription"
        ) ||
        normalizedError.includes(
          "active billing"
        )
      ) {
        userFacingError =
          "This Sales Pilot account does not have an active billing subscription. Please activate a plan before using the AI support employee.";
      } else if (
        normalizedError.includes(
          "profile"
        )
      ) {
        userFacingError =
          "This chat widget is not connected to a valid Sales Pilot account.";
      } else if (
        normalizedError.includes(
          "knowledge"
        )
      ) {
        userFacingError =
          "I couldn't access the store information right now. Please try again.";
      } else if (
        normalizedError.includes(
          "image"
        )
      ) {
        userFacingError =
          "I couldn't analyze that image. Please try another clear product photo.";
      } else if (
        normalizedError.includes(
          "timeout"
        ) ||
        normalizedError.includes(
          "timed out"
        )
      ) {
        userFacingError =
          "The AI is taking longer than expected. Please try again.";
      } else if (
        normalizedError.includes(
          "rate limit"
        ) ||
        normalizedError.includes(
          "429"
        )
      ) {
        userFacingError =
          "We're receiving a lot of requests right now. Please try again in a moment.";
      }

      setMessages((previous) => [
        ...previous,
        {
          id:
            `error-${Date.now()}`,

          sender:
            "ai",

          content:
            userFacingError,

          timestamp:
            new Date(),
        },
      ]);
    } finally {
      setLoading(false);

      setSending(false);

      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }

  // ===================================================
  // ENTER KEY
  // ===================================================

  function handleKeyDown(
    e: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      void sendMessage();
    }
  }

  // ===================================================
  // SUGGESTION CLICK
  // ===================================================

  function handleSuggestion(
    suggestion: string
  ) {
    setMessage(suggestion);

    setShowSuggestions(false);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  // ===================================================
  // NEW CONVERSATION
  // ===================================================

  function startNewConversation() {
    if (loading) {
      return;
    }

    setMessages([
      {
        id:
          `welcome-${Date.now()}`,

        sender:
          "ai",

        content:
          welcomeMessage,

        timestamp:
          new Date(),
      },
    ]);

    setMessage("");

    setSelectedImage(null);

    setSelectedImageName("");

    setImageError("");

    setShowSuggestions(true);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

  // ===================================================
  // CLEAR SESSION
  // ===================================================

  function clearConversationSession() {
    if (
      typeof window !==
      "undefined"
    ) {
      const storageKey =
        `sales-pilot-session-${profileId}`;

      localStorage.removeItem(
        storageKey
      );
    }

    setVisitorSessionId("");

    startNewConversation();
  }

  // ===================================================
  // PARSE RESPONSE
  // ===================================================

  // ===================================================
  // RENDER MESSAGE CONTENT
  // ===================================================

  function renderMessageContent(
    msg: Message
  ) {
    // Strip every raw URL from the AI text. Product links are rendered as
    // product cards/buttons below from the structured product data.
    let text =
      String(msg.content || "").replace(
        /https?:\/\/[^\s<>"')]+/gi,
        ""
      );

    text =
      text
        .replace(
          /\[?\s*view\s+product\s*\]?\s*:?/gi,
          ""
        )
        .replace(
          /view it here\s*:/gi,
          ""
        )
        .replace(
          /\n{3,}/g,
          "\n\n"
        )
        .trim();

    const productList =
      Array.isArray(msg.products)
        ? msg.products
          .map((raw) => {
            if (!raw || typeof raw !== "object") {
              return null;
            }
            const product = raw as any;
            const name =
              String(
                product.displayName ||
                  product.name ||
                  product.title ||
                  ""
              ).trim();
            const productUrl =
              String(
                product.productUrl ||
                  product.viewUrl ||
                  product.url ||
                  ""
              ).trim();
            const price =
              String(
                product.displayPrice ||
                  product.price ||
                  ""
              ).trim();
            const image =
              String(
                product.imageUrl ||
                  product.image ||
                  ""
              ).trim();
            const available =
              product.available === true ||
              product.in_stock === true;

            if (!name) {
              return null;
            }

            return {
              name,
              productUrl,
              price,
              image,
              available,
            };
          })
          .filter(
            (item: any) =>
              Boolean(item && item.name)
          )
        : [];

    return (
      <div className="space-y-3">
        {/* CUSTOMER IMAGE */}

        {msg.imageUrl && (
          <div
            className={`
              overflow-hidden
              rounded-xl
              border
              w-fit
              max-w-[160px]
              ${
                isDark
                  ? "border-slate-700"
                  : "border-slate-200"
              }
            `}
          >
            <img
              src={msg.imageUrl}
              alt="Uploaded product"
              className="max-h-[160px] max-w-[140px] w-auto h-auto cursor-zoom-in object-contain"
              onClick={() =>
                setZoomImage(
                  msg.imageUrl as string
                )
              }
              role="button"
              aria-label="Enlarge uploaded image"
            />
          </div>
        )}

        {/* MESSAGE */}

        {text && (
          <p
            className="
              whitespace-pre-wrap
              break-words
              leading-6
            "
          >
            {text}
          </p>
        )}

        {/* PRODUCT CARDS */}

        {productList.length > 0 && (
          <div className="space-y-2">
            {productList.map(
              (product, index) => (
                <div
                  key={`${product.name}-${index}`}
                  className={`
                    flex
                    items-center
                    gap-3
                    overflow-hidden
                    rounded-xl
                    border
                    p-2
                    ${
                      isDark
                        ? "border-slate-700 bg-slate-800"
                        : "border-slate-200 bg-white"
                    }
                  `}
                >
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p
                      className="
                        truncate
                        text-sm
                        font-semibold
                      "
                    >
                      {product.name}
                    </p>

                    {product.price && (
                      <p
                        className="
                          text-sm
                          text-slate-500
                        "
                      >
                        {product.price}
                      </p>
                    )}
                    {typeof product.available ===
                      "boolean" && (
                      <p className="mt-0.5">
                        <span
                          className={`
                            inline-flex
                            items-center
                            rounded-full
                            px-2
                            py-0.5
                            text-[11px]
                            font-semibold
                            ${
                              product.available
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }
                          `}
                        >
                          {product.available
                            ? "In Stock"
                            : "Out of Stock"}
                        </span>
                      </p>
                    )}
                  </div>

                  {product.productUrl && (
                    <a
                      href={product.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor:
                          brandColor,
                      }}
                      className="
                        inline-flex
                        shrink-0
                        items-center
                        gap-1.5
                        rounded-lg
                        px-3
                        py-2
                        text-xs
                        font-semibold
                        text-white
                        transition
                        hover:opacity-90
                      "
                    >
                      View Product

                      <ExternalLink
                        size={14}
                      />
                    </a>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* HOMEPAGE / STORE LINK */}

        {msg.siteUrl && (
          <a
            href={msg.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: brandColor,
            }}
            className="
              inline-flex
              shrink-0
              items-center
              gap-1.5
              rounded-lg
              px-3
              py-2
              text-xs
              font-semibold
              text-white
              transition
              hover:opacity-90
            "
          >
            Visit Website

            <ExternalLink
              size={14}
            />
          </a>
        )}
      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <>
      {/* =================================================
          CHAT WINDOW
          ================================================= */}

      {open && (
        <div
          role="dialog"
          aria-label={`${aiName} chat`}
          className={`
            fixed
            bottom-20
            sm:bottom-24
            ${positionClass}
            ${sizeClass}
            ${radiusClass}
            ${backgroundClass}
            z-[9999]
            flex
            flex-col
            overflow-hidden
            border
            ${
              isDark
                ? "border-slate-800"
                : "border-slate-200"
            }
            shadow-[0_24px_80px_rgba(15,23,42,0.22)]
            ${
              enableAnimations
                ? "animate-in fade-in slide-in-from-bottom-4 duration-200"
                : ""
            }
          `}
        >
          {/* =================================================
              HEADER
              ================================================= */}

          <div
            style={{
              backgroundColor:
                brandColor,
            }}
            className="
              flex
              shrink-0
              items-center
              justify-between
              px-4
              py-3.5
              text-white
            "
          >
            <div className="flex min-w-0 items-center gap-3">
              {/* AVATAR */}

              <div className="relative">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-full
                    bg-white/15
                    backdrop-blur
                  "
                >
                  {showAiAvatar ? (
                    <Bot size={21} />
                  ) : (
                    <Sparkles
                      size={20}
                    />
                  )}
                </div>

                <span
                  className="
                    absolute
                    bottom-0
                    right-0
                    h-2.5
                    w-2.5
                    rounded-full
                    border-2
                    border-white
                    bg-emerald-400
                  "
                />
              </div>

              {/* TITLE */}

              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-bold">
                  {aiName}
                </h3>

                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/80">
                  <span>
                    Online
                  </span>

                  <span className="opacity-50">
                    ·
                  </span>

                  <span>
                    Support
                  </span>
                </div>
              </div>
            </div>

            {/* HEADER ACTIONS */}

            <div className="flex items-center gap-1">
              {!preview && (
                <button
                  type="button"
                  onClick={
                    startNewConversation
                  }
                  disabled={
                    loading
                  }
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    transition
                    hover:bg-white/15
                    disabled:opacity-40
                  "
                  aria-label="New conversation"
                  title="New conversation"
                >
                  <RotateCcw
                    size={16}
                  />
                </button>
              )}

              {!preview && (
                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    transition
                    hover:bg-white/15
                  "
                  aria-label="Close chat"
                  title="Close chat"
                >
                  <X size={19} />
                </button>
              )}
            </div>
          </div>

          {/* =================================================
              START FORM
              ================================================= */}

          {!started ? (
            <div
              className={`
                flex
                flex-1
                flex-col
                justify-center
                overflow-y-auto
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
                  className="
                    mb-4
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-2xl
                  "
                >
                  <Sparkles
                    size={23}
                  />
                </div>

                <h2 className="text-2xl font-bold">
                  Let's get started
                </h2>

                <p
                  className={`
                    mt-2
                    text-sm
                    leading-6
                    ${
                      isDark
                        ? "text-slate-400"
                        : "text-slate-500"
                    }
                  `}
                >
                  Tell us a little about
                  yourself and we'll be
                  happy to help.
                </p>
              </div>

              {/* NAME */}

              {collectVisitorName && (
                <div className="mb-4">
                  <label
                    htmlFor="visitor-name"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Your name
                  </label>

                  <input
                    id="visitor-name"
                    value={
                      visitorName
                    }
                    onChange={(e) =>
                      setVisitorName(
                        e.target.value
                      )
                    }
                    placeholder="Enter your name"
                    className={`
                      w-full
                      rounded-xl
                      border
                      px-4
                      py-3
                      text-sm
                      outline-none
                      transition
                      ${
                        isDark
                          ? "border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                          : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                      }
                    `}
                    style={{
                      borderColor:
                        visitorName
                          ? `${brandColor}70`
                          : undefined,
                    }}
                  />
                </div>
              )}

              {/* EMAIL */}

              {collectVisitorEmail && (
                <div className="mb-5">
                  <label
                    htmlFor="visitor-email"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Your email
                  </label>

                  <input
                    id="visitor-email"
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
                    className={`
                      w-full
                      rounded-xl
                      border
                      px-4
                      py-3
                      text-sm
                      outline-none
                      transition
                      ${
                        isDark
                          ? "border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                          : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                      }
                    `}
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
                className="
                  w-full
                  rounded-xl
                  py-3.5
                  text-sm
                  font-bold
                  text-white
                  shadow-lg
                  transition
                  hover:opacity-90
                  active:scale-[0.99]
                "
              >
                Start Chat
              </button>
            </div>
          ) : (
            <>
              {/* =================================================
                  MESSAGES
                  ================================================= */}

              <div
                className={`
                  flex-1
                  overflow-y-auto
                  px-3
                  py-4
                  sm:px-4
                  sm:py-5
                  ${
                    isDark
                      ? "bg-slate-900"
                      : "bg-slate-50"
                  }
                `}
              >
                <div className="space-y-4">
                  {/* =================================================
                      SUGGESTIONS
                      ================================================= */}

                  {messages.length ===
                    1 &&
                    showSuggestions && (
                      <div className="px-1 pb-2 pt-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Sparkles
                            size={13}
                            style={{
                              color:
                                brandColor,
                            }}
                          />

                          <span
                            className={`
                              text-[11px]
                              font-semibold
                              ${
                                isDark
                                  ? "text-slate-400"
                                  : "text-slate-500"
                              }
                            `}
                          >
                            You can ask me
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {suggestions.map(
                            (
                              suggestion
                            ) => (
                              <button
                                key={
                                  suggestion
                                }
                                type="button"
                                onClick={() =>
                                  handleSuggestion(
                                    suggestion
                                  )
                                }
                                className={`
                                  rounded-full
                                  border
                                  px-3
                                  py-2
                                  text-left
                                  text-[11px]
                                  font-medium
                                  transition
                                  ${
                                    isDark
                                      ? "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                                  }
                                `}
                              >
                                {suggestion}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* =================================================
                      MESSAGES
                      ================================================= */}

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
                              max-w-[90%]
                              gap-2
                              ${
                                isAI
                                  ? "items-start"
                                  : "items-end"
                              }
                            `}
                          >
                            {/* AI AVATAR */}

                            {isAI &&
                              showAiAvatar && (
                                <div
                                  style={{
                                    backgroundColor:
                                      `${brandColor}18`,
                                    color:
                                      brandColor,
                                  }}
                                  className="
                                    mt-0.5
                                    flex
                                    h-8
                                    w-8
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                  "
                                >
                                  <Bot
                                    size={
                                      16
                                    }
                                  />
                                </div>
                              )}

                            <div className="min-w-0">
                              {/* MESSAGE BUBBLE */}

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
                                        : "rounded-tl-md border border-slate-100 bg-white text-slate-800"
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

                              {/* TIME */}

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

                            {/* CUSTOMER AVATAR */}

                            {!isAI && (
                              <div
                                style={{
                                  backgroundColor:
                                    `${brandColor}18`,
                                  color:
                                    brandColor,
                                }}
                                className="
                                  mt-0.5
                                  flex
                                  h-8
                                  w-8
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-full
                                "
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

                  {/* =================================================
                      TYPING INDICATOR
                      ================================================= */}

                  {loading &&
                    showTypingIndicator && (
                      <div className="flex items-start gap-2">
                        {showAiAvatar && (
                          <div
                            style={{
                              backgroundColor:
                                `${brandColor}18`,
                              color:
                                brandColor,
                            }}
                            className="
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                            "
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
                            shadow-sm
                            ${
                              isDark
                                ? "bg-slate-800"
                                : "bg-white"
                            }
                          `}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              style={{
                                backgroundColor:
                                  brandColor,
                              }}
                              className="
                                h-1.5
                                w-1.5
                                animate-bounce
                                rounded-full
                              "
                            />

                            <span
                              style={{
                                backgroundColor:
                                  brandColor,
                              }}
                              className="
                                h-1.5
                                w-1.5
                                animate-bounce
                                rounded-full
                                [animation-delay:120ms]
                              "
                            />

                            <span
                              style={{
                                backgroundColor:
                                  brandColor,
                              }}
                              className="
                                h-1.5
                                w-1.5
                                animate-bounce
                                rounded-full
                                [animation-delay:240ms]
                              "
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

              {/* =================================================
                  INPUT AREA
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
                {/* =================================================
                    IMAGE PREVIEW
                    ================================================= */}

                {selectedImage && (
                  <div
                    className={`
                      mb-3
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      border
                      p-2
                      ${
                        isDark
                          ? "border-slate-700 bg-slate-900"
                          : "border-slate-200 bg-slate-50"
                      }
                    `}
                  >
                    <img
                      src={
                        selectedImage
                      }
                      alt={
                        selectedImageName ||
                        "Selected product"
                      }
                      className="
                        h-14
                        w-14
                        rounded-lg
                        object-cover
                      "
                    />

                    <div className="min-w-0 flex-1">
                      <p
                        className={`
                          truncate
                          text-xs
                          font-semibold
                          ${
                            isDark
                              ? "text-slate-200"
                              : "text-slate-700"
                          }
                        `}
                      >
                        {selectedImageName ||
                          "Product image"}
                      </p>

                      <p
                        className={`
                          mt-0.5
                          text-[11px]
                          ${
                            isDark
                              ? "text-slate-500"
                              : "text-slate-400"
                          }
                        `}
                      >
                        Image ready
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        removeSelectedImage
                      }
                      disabled={
                        loading
                      }
                      className="
                        flex
                        h-7
                        w-7
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        text-slate-400
                        transition
                        hover:bg-slate-200
                        hover:text-slate-700
                        disabled:opacity-40
                      "
                      aria-label="Remove image"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* =================================================
                    IMAGE ERROR
                    ================================================= */}

                {imageError && (
                  <div
                    className="
                      mb-2
                      rounded-lg
                      bg-red-50
                      px-3
                      py-2
                      text-xs
                      font-medium
                      text-red-600
                    "
                  >
                    {imageError}
                  </div>
                )}

                {/* =================================================
                    INPUT ROW
                    ================================================= */}

                <div className="flex items-end gap-2">
                  {/* HIDDEN FILE */}

                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleImageSelect
                    }
                    className="hidden"
                  />

                  {/* ATTACH */}

                  <button
                    type="button"
                    onClick={
                      openImageSelector
                    }
                    disabled={
                      loading
                    }
                    className={`
                      flex
                      h-12
                      w-12
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      transition
                      ${
                        isDark
                          ? "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    `}
                    aria-label="Upload product image"
                    title="Upload product image"
                  >
                    <Paperclip
                      size={18}
                    />
                  </button>

                  {/* TEXTAREA */}

                  <div
                    className={`
                      flex
                      min-h-[48px]
                      flex-1
                      items-end
                      rounded-2xl
                      border
                      px-4
                      py-2
                      ${
                        isDark
                          ? "border-slate-700 bg-slate-900"
                          : "border-slate-200 bg-slate-50"
                      }
                    `}
                  >
                    <textarea
                      ref={
                        inputRef
                      }
                      value={
                        message
                      }
                      onChange={(e) =>
                        handleMessageChange(
                          e.target.value
                        )
                      }
                      onKeyDown={
                        handleKeyDown
                      }
                      disabled={
                        loading
                      }
                      rows={1}
                      maxLength={4000}
                      placeholder={
                        selectedImage
                          ? "Add a message..."
                          : "Message..."
                      }
                      className={`
                        max-h-[120px]
                        min-h-[28px]
                        w-full
                        resize-none
                        bg-transparent
                        py-1
                        text-sm
                        leading-6
                        outline-none
                        ${
                          isDark
                            ? "text-white placeholder:text-slate-500"
                            : "text-slate-900 placeholder:text-slate-400"
                        }
                      `}
                    />
                  </div>

                  {/* SEND */}

                  <button
                    type="button"
                    onClick={
                      () =>
                        void sendMessage()
                    }
                    disabled={
                      loading ||
                      (
                        !message.trim() &&
                        !selectedImage
                      )
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
                      active:scale-95
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                    aria-label="Send message"
                  >
                    <Send size={18} />
                  </button>
                </div>

                {/* =================================================
                    INPUT FOOTER
                    ================================================= */}

                <div className="mt-2 flex items-center justify-between px-1">
                  <span
                    className={`
                      text-[10px]
                      ${
                        isDark
                          ? "text-slate-600"
                          : "text-slate-400"
                      }
                    `}
                  >
                    Enter to send · Shift+Enter
                    for a new line
                  </span>

                  {message.length >
                    0 && (
                    <span
                      className={`
                        text-[10px]
                        ${
                          message.length >
                          3800
                            ? "text-red-500"
                            : isDark
                            ? "text-slate-600"
                            : "text-slate-400"
                        }
                      `}
                    >
                      {message.length}
                      /4000
                    </span>
                  )}
                </div>

                {/* =================================================
                    POWERED BY
                    ================================================= */}

                {showPoweredBy && (
                  <div
                    className={`
                      pt-2
                      text-center
                      text-[10px]
                      ${
                        isDark
                          ? "text-slate-600"
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

                {/* =================================================
                    CLEAR SESSION
                    ================================================= */}

                {!preview &&
                  visitorSessionId && (
                    <button
                      type="button"
                      onClick={
                        clearConversationSession
                      }
                      disabled={
                        loading
                      }
                      className={`
                        mx-auto
                        mt-2
                        flex
                        items-center
                        gap-1
                        text-[10px]
                        transition
                        ${
                          isDark
                            ? "text-slate-600 hover:text-slate-400"
                            : "text-slate-400 hover:text-slate-600"
                        }
                      `}
                    >
                      <Trash2
                        size={11}
                      />

                      Clear session
                    </button>
                  )}
              </div>
            </>
          )}
        </div>
      )}

      {/* =================================================
          FLOATING BUTTON
          ================================================= */}

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
            bottom-4
            sm:bottom-6
            ${positionClass}
            z-[9999]
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-full
            text-white
            shadow-[0_10px_35px_rgba(0,0,0,0.2)]
            transition
            hover:scale-105
            active:scale-95
          `}
          aria-label={
            open
              ? "Close chat"
              : "Open chat"
          }
          title={
            open
              ? "Close chat"
              : "Open chat"
          }
        >
          {open ? (
            <X size={22} />
          ) : (
            <MessageCircle
              size={23}
            />
          )}
        </button>
      )}
      {/* =================================================
          IMAGE ZOOM PREVIEW
          ================================================= */}

      {zoomImage && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setZoomImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Uploaded image preview"
        >
          <img
            src={zoomImage}
            alt="Uploaded image preview"
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setZoomImage(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:bg-white"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>
      )}

    </>
  );
}



