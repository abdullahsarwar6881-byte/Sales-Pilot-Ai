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
      iconBg: "bg-purple-100 dark:bg-purple-950/60",
      iconColor: "text-[#5B3DF5] dark:text-[#9B7CFC]",
    },
    {
      title: "Resolved by AI",
      value: aiResolved.toLocaleString(),
      change: "Live",
      icon: Bot,
      iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Human Support",
      value: humanSupport.toLocaleString(),
      change: "Live",
      icon: Users,
      iconBg: "bg-orange-100 dark:bg-orange-950/60",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      title: "Avg Response",
      value: avgResponse,
      change: "Calculated",
      icon: Clock3,
      iconBg: "bg-purple-100 dark:bg-purple-950/60",
      iconColor: "text-[#5B3DF5] dark:text-[#9B7CFC]",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {item.title}
                </p>

                <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                    {item.value}
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                    {item.change}
                  </span>
                </div>
              </div>

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg} ${item.iconColor} shadow-2xs`}
              >
                <Icon size={18} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}