"use client";

import { ReactNode } from "react";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  description: string;
  trend?: string;
  icon: ReactNode;
  color?: string;
}

export default function MetricCard({
  title,
  value,
  description,
  trend = "+0%",
  icon,
  color = "from-indigo-500 to-violet-600",
}: MetricCardProps) {
  return (
    <motion.div
      whileHover={{
        y: -3,
      }}
      transition={{
        duration: 0.15,
      }}
      className="rounded-2xl border border-theme bg-card p-4 sm:p-5 shadow-xs transition-colors active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">
            {title}
          </p>

          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">
            <CountUp end={value} duration={1.2} />
          </h2>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-xs`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {description}
        </p>

        <div className="flex items-center gap-1 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <TrendingUp size={13} />
          {trend}
        </div>
      </div>
    </motion.div>
  );
}