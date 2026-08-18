"use client";

import {
  ShoppingBag,
  Globe,
  Code2,
  FileCode2,
  ArrowRight,
  X,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";

interface Props {
  profileId?: string;
}

const platforms = [
  {
    title: "Shopify",
    description: "Install Sales Pilot from the Shopify App Store.",
    icon: ShoppingBag,
    color: "from-emerald-500 to-green-600",
  },
  {
    title: "WordPress",
    description: "Connect your WordPress website in minutes.",
    icon: Globe,
    color: "from-sky-500 to-blue-600",
  },
  {
    title: "React / Next.js",
    description: "Install using our React component or SDK.",
    icon: Code2,
    color: "from-violet-500 to-indigo-600",
  },
  {
    title: "HTML Website",
    description: "Paste one script tag into your website.",
    icon: FileCode2,
    color: "from-orange-500 to-red-500",
  },
];

export default function WidgetInstall({ profileId }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const widgetId = profileId;

  const embedCode = widgetId
    ? `<script src="https://salespilottt.netlify.app/widget.js" data-widget-id="${widgetId}"></script>`
    : "";

  function handlePlatformClick(platform: string) {
    setCopied(false);
    setSelectedPlatform(platform);
  }

  async function copyEmbedCode() {
    if (!embedCode) return;

    await navigator.clipboard.writeText(embedCode);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <>
      <div
        className="
          rounded-3xl
          border
          border-theme
          bg-card
          p-6
          text-card-foreground
          shadow-sm
          transition-colors
        "
      >
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">
            Install Sales Pilot
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose your platform and start helping customers in minutes.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {platforms.map((platform) => {
            const Icon = platform.icon;

            return (
              <div
                key={platform.title}
                className="
                  rounded-2xl
                  border
                  border-theme
                  bg-card
                  p-5
                  transition-all
                  hover:-translate-y-1
                  hover:border-indigo-400
                  hover:shadow-lg
                "
              >
                <div
                  className={`
                    inline-flex
                    rounded-2xl
                    bg-gradient-to-br
                    ${platform.color}
                    p-4
                    text-white
                  `}
                >
                  <Icon size={24} />
                </div>

                <h3 className="mt-5 text-lg font-bold text-foreground">
                  {platform.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {platform.description}
                </p>

                <button
                  type="button"
                  onClick={() => handlePlatformClick(platform.title)}
                  className="
                    mt-6
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-slate-900
                    px-5
                    py-3
                    font-medium
                    text-white
                    transition
                    hover:bg-indigo-600

                    dark:bg-white
                    dark:text-slate-900
                    dark:hover:bg-indigo-500
                    dark:hover:text-white
                  "
                >
                  Get Started
                  <ArrowRight size={18} />
                </button>
              </div>
            );
          })}
        </div>

        {profileId && (
          <div
            className="
              mt-8
              rounded-2xl
              border
              border-theme
              bg-muted
              p-4
            "
          >
            <p className="text-sm text-muted-foreground">
              Widget ID
            </p>

            <p
              className="
                mt-1
                break-all
                font-mono
                text-sm
                font-semibold
                text-foreground
              "
            >
              {profileId}
            </p>
          </div>
        )}
      </div>

      {selectedPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="
              relative
              w-full
              max-w-2xl
              rounded-3xl
              bg-background
              p-6
              shadow-2xl
            "
          >
            <button
              type="button"
              onClick={() => setSelectedPlatform(null)}
              className="
                absolute
                right-4
                top-4
                rounded-lg
                p-2
                text-muted-foreground
                transition
                hover:bg-muted
                hover:text-foreground
              "
            >
              <X size={20} />
            </button>

            <h2 className="pr-10 text-2xl font-bold text-foreground">
              Install Sales Pilot on {selectedPlatform}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Follow the installation instructions below.
            </p>

            {selectedPlatform === "HTML Website" && (
              <div className="mt-6">
                <div className="rounded-2xl border border-theme bg-muted p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    Step 1 — Copy this script
                  </p>

                  {widgetId ? (
                    <>
                      <pre
                        className="
                          overflow-x-auto
                          rounded-xl
                          bg-slate-950
                          p-4
                          text-sm
                          leading-6
                          text-white
                        "
                      >
                        <code>{embedCode}</code>
                      </pre>

                      <button
                        type="button"
                        onClick={copyEmbedCode}
                        className="
                          mt-4
                          flex
                          items-center
                          gap-2
                          rounded-xl
                          bg-indigo-600
                          px-5
                          py-3
                          font-medium
                          text-white
                          transition
                          hover:bg-indigo-700
                        "
                      >
                        {copied ? (
                          <>
                            <Check size={18} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={18} />
                            Copy Embed Code
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-red-500">
                      Widget ID is missing. Please refresh the page and try
                      again.
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-theme p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Step 2 — Add it to your website
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Paste the script before the closing{" "}
                    <code>&lt;/body&gt;</code> tag of your website.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-theme p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Step 3 — Open your website
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    The Sales Pilot AI chat widget will appear on your website.
                  </p>
                </div>
              </div>
            )}

            {selectedPlatform === "Shopify" && (
              <div className="mt-6 rounded-2xl border border-theme bg-muted p-5">
                <h3 className="font-semibold text-foreground">
                  Shopify integration
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Shopify installation will be connected to the Sales Pilot
                  Shopify app and OAuth flow.
                </p>
              </div>
            )}

            {selectedPlatform === "WordPress" && (
              <div className="mt-6 rounded-2xl border border-theme bg-muted p-5">
                <h3 className="font-semibold text-foreground">
                  WordPress integration
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  WordPress installation will provide the Sales Pilot widget
                  script/plugin instructions.
                </p>
              </div>
            )}

            {selectedPlatform === "React / Next.js" && (
              <div className="mt-6 rounded-2xl border border-theme bg-muted p-5">
                <h3 className="font-semibold text-foreground">
                  React / Next.js integration
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  React installation will provide the Sales Pilot component
                  and widget configuration instructions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}