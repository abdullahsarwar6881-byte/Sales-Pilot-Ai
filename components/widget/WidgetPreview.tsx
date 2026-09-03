"use client";

import {
  Bot,
  Check,
  ExternalLink,
  Send,
  User,
  Image as ImageIcon,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

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

interface WidgetProduct {
  id?: string;
  name?: string;
  title?: string;
  price?: string;
  displayPrice?: string;
  displayName?: string;
  currency?: string;
  description?: string;
  imageUrl?: string;
  image?: string;
  productUrl?: string;
  url?: string;
  viewUrl?: string;
  available?: boolean | null;
  availabilityLabel?: string;
}

interface Message {
  id: string;
  sender: "ai" | "customer";
  content: string;
  imageUrl?: string;
  products?: WidgetProduct[];
  imageMatch?: { matchType?: string; exactProductId?: string | null } | null;
  timestamp: Date;
}

// =====================================================
// FILE TO BASE64
// =====================================================

function fileToDataUrl(
  file: File
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result !==
          "string"
        ) {
          reject(
            new Error(
              "Unable to read image."
            )
          );

          return;
        }

        resolve(
          reader.result
        );
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read image."
          )
        );
      };

      reader.readAsDataURL(
        file
      );
    }
  );
}

// =====================================================
// COMPONENT
// =====================================================

export default function WidgetPreview({
  profileId,

  aiName = "Sales Pilot AI",

  welcomeMessage =
    "ðŸ‘‹ Hi! How can I help you today?",

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

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    visitorSessionId,
    setVisitorSessionId,
  ] = useState("");

  const [mounted, setMounted] =
    useState(false);

  // =====================================================
  // IMAGE STATE
  // =====================================================

  const [
    selectedImage,
    setSelectedImage,
  ] = useState<File | null>(null);

  const [
    imagePreview,
    setImagePreview,
  ] = useState<string | null>(null);

  // =====================================================
  // REFS
  // =====================================================

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const imageInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  // =====================================================
  // MESSAGES
  // =====================================================

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: "welcome",

        sender: "ai",

        content:
          welcomeMessage,

        timestamp:
          new Date(0),
      },
    ]);

  // =====================================================
  // MOUNT
  // =====================================================

  useEffect(() => {
    setMounted(true);

    setMessages(
      (previous) =>
        previous.map(
          (item) =>
            item.id ===
            "welcome"
              ? {
                  ...item,

                  content:
                    welcomeMessage,

                  timestamp:
                    new Date(),
                }
              : item
        )
    );
  }, [
    welcomeMessage,
  ]);

  // =====================================================
  // LOAD PREVIEW SESSION
  // =====================================================

  useEffect(() => {
    if (
      !mounted ||
      !profileId
    ) {
      return;
    }

    const storageKey =
      `sales-pilot-preview-session-${profileId}`;

    const existingSession =
      localStorage.getItem(
        storageKey
      );

    if (
      existingSession
    ) {
      setVisitorSessionId(
        existingSession
      );

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
  }, [
    profileId,
    mounted,
  ]);

  // =====================================================
  // AUTO SCROLL
  // =====================================================

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

  // =====================================================
  // FOCUS INPUT
  // =====================================================

  useEffect(() => {
    if (!loading) {
      const timer =
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);

      return () =>
        clearTimeout(timer);
    }
  }, [
    loading,
  ]);

  // =====================================================
  // CLEAN IMAGE OBJECT URL
  // =====================================================

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(
          imagePreview
        );
      }
    };
  }, [
    imagePreview,
  ]);

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
  // OPEN IMAGE SELECTOR
  // =====================================================

  function openImageSelector() {
    if (
      loading ||
      !profileId
    ) {
      return;
    }

    imageInputRef.current?.click();
  }

  // =====================================================
  // SELECT IMAGE
  // =====================================================

  function handleImageSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    // ---------------------------------------------------
    // ALLOWED TYPES
    // ---------------------------------------------------

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
      alert(
        "Please upload a JPG, PNG, or WEBP image."
      );

      event.target.value =
        "";

      return;
    }

    // ---------------------------------------------------
    // MAX SIZE
    // ---------------------------------------------------

    const MAX_SIZE =
      5 * 1024 * 1024;

    if (
      file.size > MAX_SIZE
    ) {
      alert(
        "Please upload an image smaller than 5MB."
      );

      event.target.value =
        "";

      return;
    }

    // ---------------------------------------------------
    // CLEAN PREVIOUS PREVIEW
    // ---------------------------------------------------

    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    // ---------------------------------------------------
    // CREATE PREVIEW
    // ---------------------------------------------------

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setSelectedImage(
      file
    );

    setImagePreview(
      previewUrl
    );
  }

  // =====================================================
  // REMOVE IMAGE
  // =====================================================

  function removeSelectedImage() {
    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    setSelectedImage(
      null
    );

    setImagePreview(
      null
    );

    if (
      imageInputRef.current
    ) {
      imageInputRef.current.value =
        "";
    }
  }

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  async function sendMessage() {
    if (
      !message.trim() &&
      !selectedImage
    ) {
      return;
    }

    if (loading) {
      return;
    }

    if (!profileId) {
      setMessages(
        (previous) => [
          ...previous,

          {
            id:
              `error-${Date.now()}`,

            sender:
              "ai",

            content:
              "The widget is not connected to a Sales Pilot account yet.",

            timestamp:
              new Date(),
          },
        ]
      );

      return;
    }

    const userMessage =
      message.trim();

    const imageToSend =
      selectedImage;

    // ---------------------------------------------------
    // CUSTOMER MESSAGE TEXT
    // ---------------------------------------------------

    let customerContent =
      userMessage;

    if (
      imageToSend &&
      !customerContent
    ) {
      customerContent =
        "I uploaded a product image. Can you find this product?";
    }

    // ---------------------------------------------------
    // CLEAR TEXT INPUT
    // ---------------------------------------------------

    setMessage("");

    // ---------------------------------------------------
    // START LOADING
    // ---------------------------------------------------

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
        "IMAGE:",
        imageToSend
          ? {
              name:
                imageToSend.name,

              type:
                imageToSend.type,

              size:
                imageToSend.size,
            }
          : null
      );

      console.log(
        "================================="
      );
      // =================================================
      // CONVERT IMAGE TO BASE64
      // =================================================

      let imageData: string | null = null;

      if (imageToSend) {
        console.log("CONVERTING IMAGE TO BASE64...");

        imageData = await fileToDataUrl(imageToSend);

        console.log("IMAGE CONVERTED");

        console.log("IMAGE DATA LENGTH:", imageData.length);
      }

      // ---------------------------------------------------
      // ADD CUSTOMER MESSAGE (with the actual image)
      // ---------------------------------------------------

      const customerMessage: Message = {
        id: `customer-${Date.now()}`,

        sender: "customer",

        content: customerContent,

        imageUrl: imageData || undefined,

        timestamp: new Date(),
      };

      setMessages(
        (previous) => [
          ...previous,
          customerMessage,
        ]
      );

      // ---------------------------------------------------
      // CLEAR PENDING IMAGE (kept only as imageUrl on message)
      // ---------------------------------------------------

      setSelectedImage(null);

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setImagePreview(null);

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }

      // =================================================
      // SEND TO CHAT API
      // =================================================

      const response =
        await fetch(
          "/api/chat",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                // ---------------------------------------
                // MESSAGE
                // ---------------------------------------

                message:
                  userMessage ||
                  "Find this product from the image.",

                // ---------------------------------------
                // PROFILE
                // ---------------------------------------

                profileId,

                // ---------------------------------------
                // SESSION
                // ---------------------------------------

                visitorSessionId:
                  visitorSessionId ||
                  null,

                // ---------------------------------------
                // CUSTOMER
                // ---------------------------------------

                customerName:
                  "Widget Preview",

                customerEmail:
                  null,

                // ---------------------------------------
                // IMAGE
                // ---------------------------------------

                imageData,

                imageName:
                  imageToSend?.name ||
                  null,

                imageType:
                  imageToSend?.type ||
                  null,
              }),
          }
        );

      // =================================================
      // RESPONSE
      // =================================================

      let data: any =
        null;

      try {
        data =
          await response.json();
      } catch {
        data =
          null;
      }

      console.log(
        "WIDGET CHAT STATUS:",
        response.status
      );

      console.log(
        "WIDGET CHAT RESPONSE:",
        data
      );

      // =================================================
      // ERROR
      // =================================================

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Chat request failed (${response.status})`
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
          `sales-pilot-preview-session-${profileId}`;

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

      const rawProducts =
        Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data?.productCards)
            ? data.productCards
            : [];

      const productData = rawProducts
        .map((entry: any) => ({
          id: entry.id || undefined,
          name: entry.displayName || entry.name || entry.title || "",
          title: entry.title || entry.name || entry.displayName || "",
          price: entry.displayPrice || entry.price || "",
          currency: entry.currency || "",
          imageUrl: entry.imageUrl || entry.image || "",
          image: entry.image || entry.imageUrl || "",
          productUrl: entry.productUrl || entry.viewUrl || entry.url || "",
          url: entry.url || entry.productUrl || entry.viewUrl || "",
          viewUrl: entry.viewUrl || entry.productUrl || entry.url || "",
          available: typeof entry.available === "boolean" ? entry.available : null,
          availabilityLabel: entry.availabilityLabel || "",
        }))
        .filter((p: { name?: string }) => p.name);

      const aiMessage:
        Message = {
        id:
          `ai-${Date.now()}`,

        sender:
          "ai",

        content:
          aiResponse,

        products:
          productData,
        imageMatch:
          data?.imageMatch || null,

        timestamp:
          new Date(),
      };
      setMessages(
        (previous) => [
          ...previous,
          aiMessage,
        ]
      );
    } catch (
      error
    ) {
      console.error(
        "WIDGET PREVIEW CHAT ERROR:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong.";

      console.error(
        "ERROR MESSAGE:",
        errorMessage
      );

      let userFacingError =
        "I'm sorry, something went wrong. Please try again.";

      const normalizedError =
        errorMessage
          .toLowerCase();

      if (
        normalizedError.includes(
          "billing"
        ) ||
        normalizedError.includes(
          "subscription"
        )
      ) {
        userFacingError =
          "This Sales Pilot account does not have an active billing subscription.";
      } else if (
        normalizedError.includes(
          "knowledge"
        )
      ) {
        userFacingError =
          "I couldn't access the store knowledge base right now.";
      } else if (
        normalizedError.includes(
          "profile"
        )
      ) {
        userFacingError =
          "This widget is not connected to a valid Sales Pilot account.";
      } else if (
        normalizedError.includes(
          "image"
        )
      ) {
        userFacingError =
          "I couldn't process that image. Please try another JPG, PNG, or WEBP image.";
      }

      setMessages(
        (previous) => [
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
        ]
      );
    } finally {
      setLoading(
        false
      );
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
        className={`flex w-full min-w-0 ${
          isAI
            ? "justify-start"
            : "justify-end"
        }`}
      >
        <div
          className={`flex w-full max-w-[88%] min-w-0 gap-2.5 ${
            isAI
              ? "items-start"
              : "items-end"
          }`}
        >
          {/* =================================================
              AI AVATAR
          ================================================= */}

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

          <div className="min-w-0 w-full max-w-full">
            {/* =================================================
                MESSAGE
            ================================================= */}

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
              {/* CUSTOMER UPLOADED IMAGE */}
              {!isAI && msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Uploaded image"
                  className="
                    mb-2
                    block
                    max-h-[140px]
                    max-w-[120px]
                    rounded-xl
                    object-contain
                    border
                    border-black/10
                  "
                />
              )}
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

              {/* =================================================
                  PRODUCT CARDS
              ================================================= */}

              {isAI &&
                Array.isArray(msg.products) &&
                msg.products.length > 0 && (
                <div className="mt-2 w-full max-w-full space-y-2">
                  {msg.imageMatch &&
                    (msg.imageMatch.matchType === "similar" ||
                     msg.imageMatch.matchType === "no_match") && (
                    <p
                      className={`
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wide
                        ${
                          isDark
                            ? "text-slate-400"
                            : "text-slate-500"
                        }
                      `}
                    >
                      Similar options
                    </p>
                  )}
                  {msg.products.map(
                    (product, idx) => {
                      const name =
                        product.title ||
                          product.name ||
                          "";

                      const price =
                        product.price ||
                          product.displayPrice ||
                          "";

                      const productUrl =
                        product.productUrl ||
                          product.viewUrl ||
                          product.url ||
                          "";

                      const imageUrl =
                        product.imageUrl ||
                          product.image ||
                          "";

                      const isAvailable =
                        product.available;

                      const availabilityText =
                        product.availabilityLabel ||
                        (isAvailable === true
                          ? "In stock"
                          : isAvailable === false
                            ? "Out of stock"
                            : "");

                      return (
                        <div
                          key={`${name}-${idx}`}
                          className={`
                            flex
                            items-center
                            gap-3
                            min-w-0
                            w-full
                            max-w-full
                            overflow-hidden
                            rounded-xl
                            border
                            p-2.5
                            ${
                              isDark
                                ? "border-slate-700 bg-slate-800"
                                : "border-slate-200 bg-white"
                            }
                          `}
                        >
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt={name}
                              className="h-14 w-14 shrink-0 rounded-lg object-cover"
                            />
                          )}

                          <div className="min-w-0 flex-1">
                            <p
                              className={`
                                break-words
                                text-sm
                                font-semibold
                                ${
                                  isDark
                                    ? "text-slate-100"
                                    : "text-slate-800"
                                }
                              `}
                            >
                              {name}
                            </p>

                            {price && (
                              <p
                                className={`
                                  mt-0.5
                                  text-sm
                                  ${
                                    isDark
                                      ? "text-slate-300"
                                      : "text-slate-500"
                                  }
                                `}
                              >
                                {price}
                              </p>
                            )}

                            {typeof isAvailable === "boolean" && (
                              <span
                                className={`
                                  inline-block
                                  text-xs
                                  font-medium
                                  ${
                                    isAvailable
                                      ? "text-emerald-600"
                                      : "text-red-500"
                                  }
                                `}
                              >
                                {availabilityText ||
                                  (isAvailable ? "In stock" : "Out of stock")}
                              </span>
                            )}
                          </div>

                          {productUrl && (
                            <a
                              href={productUrl}
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
                      );
                    },
                  )}
                </div>
              )}

            {/* =================================================
                TIME
            ================================================= */}

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

          {/* =================================================
              CUSTOMER AVATAR
          ================================================= */}

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
        {/* =================================================
            WEBSITE BACKGROUND
        ================================================= */}

        <div className="absolute inset-0 opacity-50">
          <div className="absolute left-8 top-8 h-24 w-48 rounded-xl bg-white dark:bg-slate-800" />

          <div className="absolute right-8 top-12 h-32 w-32 rounded-full bg-white dark:bg-slate-800" />

          <div className="absolute bottom-10 left-12 h-40 w-64 rounded-xl bg-white dark:bg-slate-800" />
        </div>

        {/* =================================================
            WIDGET
        ================================================= */}

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
                  Online Â· AI Support
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
                    key={
                      msg.id
                    }
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
                          (
                            item
                          ) => (
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

            {imagePreview && (
              <div className="mb-2 flex items-start">
                <div className="relative">
                  <img
                    src={
                      imagePreview
                    }
                    alt="Selected product"
                    className="
                      h-20
                      w-20
                      rounded-xl
                      border
                      border-slate-200
                      object-cover
                      shadow-sm
                    "
                  />

                  <button
                    type="button"
                    onClick={
                      removeSelectedImage
                    }
                    disabled={
                      loading
                    }
                    className="
                      absolute
                      -right-2
                      -top-2
                      flex
                      h-6
                      w-6
                      items-center
                      justify-center
                      rounded-full
                      bg-slate-900
                      text-white
                      shadow
                      transition
                      hover:bg-slate-700
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                    aria-label="Remove image"
                  >
                    <X
                      size={13}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* =================================================
                INPUT ROW
            ================================================= */}

            <div className="flex items-end gap-2">
              {/* =================================================
                  HIDDEN FILE INPUT
              ================================================= */}

              <input
                ref={
                  imageInputRef
                }
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handleImageSelect
                }
                className="hidden"
              />

              {/* =================================================
                  IMAGE BUTTON
              ================================================= */}

              <button
                type="button"
                onClick={
                  openImageSelector
                }
                disabled={
                  loading ||
                  !profileId
                }
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                  text-slate-500
                  shadow-sm
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Upload product image"
                title="Upload product image"
              >
                <ImageIcon
                  size={19}
                />
              </button>

              {/* =================================================
                  TEXT INPUT
              ================================================= */}

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
                    imagePreview
                      ? "Ask about this product..."
                      : profileId
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

              {/* =================================================
                  SEND BUTTON
              ================================================= */}

              <button
                type="button"
                onClick={
                  sendMessage
                }
                disabled={
                  loading ||
                  (
                    !message.trim() &&
                    !selectedImage
                  ) ||
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
