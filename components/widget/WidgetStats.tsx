"use client";

import {
  MessageCircle,
  Users,
  Bot,
  Activity,
} from "lucide-react";

import { motion } from "framer-motion";

interface Props {
  conversations?: number;
  resolution?: number;
  visitors?: number;
  views?: number;
}

export default function WidgetStats({
  conversations = 0,
  resolution = 0,
  visitors = 0,
  views = 0,
}: Props) {
  const stats = [
    {
      title: "Widget Views",
      value: views.toLocaleString(),
      change: "Live",
      icon: Users,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Conversations",
      value: conversations.toLocaleString(),
      change: "Total",
      icon: MessageCircle,
      color: "from-indigo-500 to-violet-600",
    },
    {
      title: "AI Resolution",
      value: `${resolution}%`,
      change: "Success Rate",
      icon: Bot,
      color: "from-emerald-500 to-green-600",
    },
    {
      title: "Active Visitors",
      value: visitors.toString(),
      change: "Currently Online",
      icon: Activity,
      color: "from-orange-500 to-red-500",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <motion.div
            key={item.title}
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
              transition-all
              duration-300

              dark:border-slate-800
              dark:bg-slate-900
              dark:text-slate-100
              dark:shadow-black/20
            "
          >
            <div className="flex items-center justify-between">
              {/* Text */}
              <div>
                <p
                  className="
                    text-sm
                    text-slate-500
                    transition-colors
                    duration-300

                    dark:text-slate-400
                  "
                >
                  {item.title}
                </p>

                <h2
                  className="
                    mt-3
                    text-4xl
                    font-bold
                    text-slate-900
                    transition-colors
                    duration-300

                    dark:text-white
                  "
                >
                  {item.value}
                </h2>

                <p
                  className="
                    mt-2
                    text-sm
                    font-medium
                    text-emerald-600
                    transition-colors
                    duration-300

                    dark:text-emerald-400
                  "
                >
                  {item.change}
                </p>
              </div>

              {/* Icon */}
              <div
                className={`
                  rounded-2xl
                  bg-gradient-to-br
                  ${item.color}
                  p-4
                  text-white
                  shadow-sm
                `}
              >
                <Icon size={26} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}