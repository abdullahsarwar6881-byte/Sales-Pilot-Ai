"use client";

import {
  ShoppingBag,
  Globe,
  Code2,
  FileCode2,
  ArrowRight,
} from "lucide-react";

interface Props {
  profileId?: string;
}

const platforms = [
  {
    title: "Shopify",
    description:
      "Install Sales Pilot from the Shopify App Store.",
    icon: ShoppingBag,
    color: "from-emerald-500 to-green-600",
  },

  {
    title: "WordPress",
    description:
      "Connect your WordPress website in minutes.",
    icon: Globe,
    color: "from-sky-500 to-blue-600",
  },

  {
    title: "React / Next.js",
    description:
      "Install using our React component or SDK.",
    icon: Code2,
    color: "from-violet-500 to-indigo-600",
  },

  {
    title: "HTML Website",
    description:
      "Paste one script tag into your website.",
    icon: FileCode2,
    color: "from-orange-500 to-red-500",
  },
];

export default function WidgetInstall({
  profileId,
}: Props) {
  return (
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
      {/* -------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------- */}

      <div className="mb-6">
        <h2
          className="
            text-xl
            font-bold
            text-foreground
          "
        >
          Install Sales Pilot
        </h2>

        <p
          className="
            mt-1
            text-sm
            text-muted-foreground
          "
        >
          Choose your platform and start
          helping customers in minutes.
        </p>
      </div>

      {/* -------------------------------- */}
      {/* PLATFORMS */}
      {/* -------------------------------- */}

      <div
        className="
          grid
          gap-5
          md:grid-cols-2
        "
      >
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
              {/* Icon */}

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

              {/* Title */}

              <h3
                className="
                  mt-5
                  text-lg
                  font-bold
                  text-foreground
                "
              >
                {platform.title}
              </h3>

              {/* Description */}

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-muted-foreground
                "
              >
                {platform.description}
              </p>

              {/* Button */}

              <button
                type="button"
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

      {/* -------------------------------- */}
      {/* WIDGET ID */}
      {/* -------------------------------- */}

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
          <p
            className="
              text-sm
              text-muted-foreground
            "
          >
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
  );
}