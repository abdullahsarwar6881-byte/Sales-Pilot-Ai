"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Code2 } from "lucide-react";

interface Props {
  websiteUrl: string;
  profileId: string;
}

export default function InstallCodeCard({
  websiteUrl,
  profileId,
}: Props) {
  const [copied, setCopied] = useState(false);

  const widgetCode = `<script
  src="https://app.salespilot.ai/widget.js"
  data-profile="${profileId || "YOUR_PROFILE_ID"}"
  defer></script>`;

  // ----------------------------------------
  // COPY CODE
  // ----------------------------------------

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(widgetCode);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Failed to copy installation code:",
        error
      );
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-6
        text-slate-900
        shadow-sm
        transition-colors
        duration-300

        dark:border-slate-800
        dark:bg-slate-900
        dark:text-slate-100
        dark:shadow-black/20
      "
    >
      {/* -------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------- */}

      <div className="flex items-start gap-4">
        <div
          className="
            flex
            h-14
            w-14
            shrink-0
            items-center
            justify-center
            rounded-2xl
            bg-gradient-to-br
            from-violet-500
            to-indigo-600
            text-white
            shadow-sm
          "
        >
          <Code2 size={26} />
        </div>

        <div>
          <h2
            className="
              text-xl
              font-bold
              text-slate-900

              dark:text-white
            "
          >
            Installation Code
          </h2>

          <p
            className="
              mt-1
              text-sm
              text-slate-500

              dark:text-slate-400
            "
          >
            Copy this snippet and paste it before
            the closing {"</body>"} tag of your
            website.
          </p>
        </div>
      </div>

      {/* -------------------------------- */}
      {/* CONNECTED WEBSITE */}
      {/* -------------------------------- */}

      {websiteUrl && (
        <div
          className="
            mt-6
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            p-4
            transition-colors
            duration-300

            dark:border-slate-700
            dark:bg-slate-950
          "
        >
          <p
            className="
              text-xs
              font-medium
              uppercase
              tracking-wide
              text-slate-500

              dark:text-slate-400
            "
          >
            Connected Website
          </p>

          <p
            className="
              mt-1
              break-all
              text-sm
              font-medium
              text-slate-800

              dark:text-slate-200
            "
          >
            {websiteUrl}
          </p>
        </div>
      )}

      {/* -------------------------------- */}
      {/* PROFILE STATUS */}
      {/* -------------------------------- */}

      <div
        className="
          mt-4
          rounded-2xl
          border
          border-emerald-100
          bg-emerald-50
          p-4
          transition-colors
          duration-300

          dark:border-emerald-900/50
          dark:bg-emerald-950/30
        "
      >
        <p
          className="
            text-xs
            font-medium
            uppercase
            tracking-wide
            text-emerald-600

            dark:text-emerald-400
          "
        >
          Widget Profile
        </p>

        <p
          className="
            mt-1
            break-all
            text-sm
            font-medium
            text-emerald-800

            dark:text-emerald-300
          "
        >
          {profileId || "Profile not available"}
        </p>
      </div>

      {/* -------------------------------- */}
      {/* CODE BLOCK */}
      {/* -------------------------------- */}

      <div
        className="
          mt-6
          overflow-x-auto
          rounded-2xl
          border
          border-slate-800
          bg-slate-950
          p-5
          shadow-inner
        "
      >
        <pre
          className="
            text-sm
            leading-7
            text-emerald-400
          "
        >
          <code>{widgetCode}</code>
        </pre>
      </div>

      {/* -------------------------------- */}
      {/* COPY BUTTON */}
      {/* -------------------------------- */}

      <button
        type="button"
        onClick={copyCode}
        disabled={!profileId}
        className="
          mt-6
          flex
          w-full
          items-center
          justify-center
          gap-2
          rounded-2xl
          bg-gradient-to-r
          from-indigo-600
          to-violet-600
          py-3
          font-semibold
          text-white
          transition
          hover:opacity-90
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        {copied ? (
          <>
            <Check size={18} />

            Copied Successfully
          </>
        ) : (
          <>
            <Copy size={18} />

            Copy Installation Code
          </>
        )}
      </button>

      {/* -------------------------------- */}
      {/* INSTALLATION GUIDE */}
      {/* -------------------------------- */}

      <div
        className="
          mt-6
          rounded-2xl
          border
          border-indigo-100
          bg-indigo-50
          p-5
          transition-colors
          duration-300

          dark:border-indigo-900/50
          dark:bg-indigo-950/40
        "
      >
        <h3
          className="
            font-semibold
            text-indigo-900

            dark:text-indigo-100
          "
        >
          Installation Guide
        </h3>

        <ol
          className="
            mt-3
            list-decimal
            space-y-2
            pl-5
            text-sm
            leading-6
            text-indigo-700

            dark:text-indigo-200
          "
        >
          <li>
            Copy the installation code above.
          </li>

          <li>
            Open your website or Shopify theme.
          </li>

          <li>
            Paste it before the closing{" "}
            {"</body>"} tag.
          </li>

          <li>
            Save your website changes.
          </li>

          <li>
            Open your website and verify that
            the Sales Pilot chat widget appears.
          </li>
        </ol>
      </div>
    </motion.div>
  );
}