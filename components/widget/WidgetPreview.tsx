"use client";

import { Bot, Send } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  aiName?: string;
  welcomeMessage?: string;
  brandColor?: string;
  theme?: string;
  size?: string;
  radius?: string;
}

export default function WidgetPreview({
  aiName = "Sales Pilot AI",
  welcomeMessage = "👋 Hi! How can I help you today?",
  brandColor = "#6366F1",
  theme = "Light",
  size = "Medium",
  radius = "Rounded",
}: Props) {
  // ----------------------------------------
  // WIDGET SIZE
  // ----------------------------------------

  const widgetHeight =
    size === "Small"
      ? "h-[520px]"
      : size === "Large"
        ? "h-[720px]"
        : "h-[620px]";

  // ----------------------------------------
  // WIDGET RADIUS
  // ----------------------------------------

  const widgetRadius =
    radius === "Square"
      ? "rounded-xl"
      : radius === "Soft"
        ? "rounded-2xl"
        : "rounded-[32px]";

  // ----------------------------------------
  // WIDGET THEME
  // ----------------------------------------

  const isDark = theme.toLowerCase() === "dark";

  // ----------------------------------------
  // WIDGET COLORS
  // ----------------------------------------

  const widgetBackground = isDark
    ? "bg-slate-900"
    : "bg-slate-100";

  const widgetBorder = isDark
    ? "border-slate-700"
    : "border-slate-200";

  const customerMessageBackground = isDark
    ? "bg-slate-800"
    : "bg-white";

  const customerMessageText = isDark
    ? "text-white"
    : "text-slate-900";

  const inputBackground = isDark
    ? "bg-slate-800"
    : "bg-white";

  const inputBorder = isDark
    ? "border-slate-700"
    : "border-slate-200";

  const inputText = isDark
    ? "text-white placeholder:text-slate-400"
    : "text-slate-900 placeholder:text-slate-400";

  const inputAreaBorder = isDark
    ? "border-slate-700"
    : "border-slate-200";

  return (
    <div className="space-y-4">
      {/* -------------------------------- */}
      {/* LIVE PREVIEW TITLE */}
      {/* -------------------------------- */}

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
            This is how your widget will appear.
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

      {/* -------------------------------- */}
      {/* WIDGET */}
      {/* -------------------------------- */}

      <div
        className={`
          mx-auto
          flex
          max-w-sm
          flex-col
          overflow-hidden
          border
          shadow-2xl
          transition-all
          duration-300

          ${widgetHeight}
          ${widgetRadius}
          ${widgetBackground}
          ${widgetBorder}
        `}
      >
        {/* -------------------------------- */}
        {/* WIDGET HEADER */}
        {/* -------------------------------- */}

        <div
          className="
            flex
            items-center
            gap-3
            px-5
            py-4
            text-white
          "
          style={{
            backgroundColor: brandColor,
          }}
        >
          {/* Bot Avatar */}

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-white/20
            "
          >
            <Bot size={21} />
          </div>

          {/* AI Name */}

          <div className="min-w-0">
            <p className="truncate font-semibold">
              {aiName}
            </p>

            <p className="text-xs text-white/80">
              Online
            </p>
          </div>
        </div>

        {/* -------------------------------- */}
        {/* CHAT AREA */}
        {/* -------------------------------- */}

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* -------------------------------- */}
          {/* AI MESSAGE */}
          {/* -------------------------------- */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.25,
            }}
            className="flex items-start gap-3"
          >
            {/* AI Avatar */}

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-full
                text-white
              "
              style={{
                backgroundColor: brandColor,
              }}
            >
              <Bot size={18} />
            </div>

            {/* AI Message */}

            <div
              className="
                max-w-[80%]
                rounded-2xl
                px-4
                py-3
                text-sm
                leading-6
                text-white
              "
              style={{
                backgroundColor: brandColor,
              }}
            >
              {welcomeMessage}
            </div>
          </motion.div>

          {/* -------------------------------- */}
          {/* CUSTOMER MESSAGE */}
          {/* -------------------------------- */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.15,
              duration: 0.25,
            }}
            className="flex justify-end"
          >
            <div
              className={`
                max-w-[75%]
                rounded-2xl
                px-4
                py-3
                text-sm
                shadow-sm
                transition-colors
                duration-300

                ${customerMessageBackground}
                ${customerMessageText}
              `}
            >
              I need help with my order.
            </div>
          </motion.div>

          {/* -------------------------------- */}
          {/* EXTRA AI MESSAGE */}
          {/* -------------------------------- */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.3,
              duration: 0.25,
            }}
            className="flex items-start gap-3"
          >
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-full
                text-white
              "
              style={{
                backgroundColor: brandColor,
              }}
            >
              <Bot size={18} />
            </div>

            <div
              className="
                max-w-[80%]
                rounded-2xl
                px-4
                py-3
                text-sm
                leading-6
                text-white
              "
              style={{
                backgroundColor: brandColor,
              }}
            >
              Sure! I can help you check your order status.
            </div>
          </motion.div>
        </div>

        {/* -------------------------------- */}
        {/* INPUT AREA */}
        {/* -------------------------------- */}

        <div
          className={`
            border-t
            p-4
            transition-colors
            duration-300

            ${inputAreaBorder}
          `}
        >
          <div
            className={`
              flex
              items-center
              gap-2
              rounded-xl
              border
              p-2
              transition-colors
              duration-300

              ${inputBackground}
              ${inputBorder}
            `}
          >
            {/* Input */}

            <input
              disabled
              placeholder="Type your message..."
              className={`
                min-w-0
                flex-1
                bg-transparent
                px-2
                text-sm
                outline-none

                ${inputText}
              `}
            />

            {/* Send */}

            <button
              type="button"
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-white
                transition
                hover:opacity-90
              "
              style={{
                backgroundColor: brandColor,
              }}
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}