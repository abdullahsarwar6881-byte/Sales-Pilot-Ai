"use client";

import { Copy, Check, Code2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  profileId?: string;
  widgetPublicId?: string;
}

export default function WidgetCode({
  profileId,
  widgetPublicId,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState(
    process.env.NEXT_PUBLIC_APP_URL || "https://app.salespilot.ai"
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
    }
  }, []);

  const publicId = widgetPublicId || profileId || "YOUR_WIDGET_ID";

  const code = `<script
  src="${appUrl}/widget.js"
  data-widget-id="${publicId}"
  async></script>`;

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] p-6 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="text-[#5B3DF5] dark:text-[#9B7CFC]" size={20} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Embed Code
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Copy this snippet and paste it before the closing{" "}
            <code className="rounded bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-xs font-mono text-slate-800 dark:text-slate-200">
              {"</body>"}
            </code>{" "}
            tag on your website.
          </p>
        </div>

        <button
          type="button"
          onClick={copyCode}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B3DF5] to-[#7C5CFC] hover:from-[#4E2DE8] hover:to-[#6B4BE8] px-5 py-2.5 font-medium text-xs text-white shadow-sm shadow-[#5B3DF5]/20 transition-all duration-150 active:scale-[0.98] self-start sm:self-auto shrink-0"
        >
          {copied ? (
            <>
              <Check size={16} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
        <pre className="text-xs sm:text-sm leading-relaxed text-emerald-400 font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}