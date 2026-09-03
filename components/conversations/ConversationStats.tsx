"use client";

import { MessageSquare, Bot, Clock3, Users } from "lucide-react";

interface Props {
  total: number;
  aiResolved: number;
  humanSupport: number;
  avgResponse: string;
}

export default function ConversationStats({
  total,
  aiResolved,
  humanSupport,
  avgResponse,
}: Props) {
  const stats = [
    {
      title: "Total Conversations",
      value: total.toLocaleString(),
      change: "Live",
      icon: MessageSquare,
      color: "from-indigo-500 to-violet-600",
    },
    {
      title: "Resolved by AI",
      value: aiResolved.toLocaleString(),
      change: "Live",
      icon: Bot,
      color: "from-emerald-500 to-green-600",
    },
    {
      title: "Human Support",
      value: humanSupport.toLocaleString(),
      change: "Live",
      icon: Users,
      color: "from-orange-500 to-red-500",
    },
    {
      title: "Avg Response",
      value: avgResponse,
      change: "Calculated",
      icon: Clock3,
      color: "from-blue-500 to-cyan-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="rounded-xl border border-theme bg-card px-3.5 py-2.5 shadow-xs transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground truncate">
                  {item.title}
                </p>

                <div className="mt-1 flex items-baseline gap-2">
                  <h3 className="text-xl font-bold text-foreground tracking-tight">
                    {item.value}
                  </h3>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {item.change}
                  </span>
                </div>
              </div>

              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} text-white shadow-xs`}
              >
                <Icon size={16} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}