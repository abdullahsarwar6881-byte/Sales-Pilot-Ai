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
  iconBgColor?: string;
  iconTextColor?: string;
}

export default function MetricCard({
  title,
  value,
  description,
  trend = "+0%",
  icon,
  iconBgColor = "bg-[#5B3DF5] text-white",
  iconTextColor = "text-white",
}: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] p-5 sm:p-5 shadow-2xs transition-all flex flex-col justify-between"
    >
      <div className="flex items-center gap-3.5">
        {/* Metric Icon Container */}
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBgColor} ${iconTextColor} shrink-0 shadow-2xs`}
        >
          {icon}
        </div>

        {/* Metric Name and Value */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 dark:text-white tracking-tight leading-tight mt-0.5">
            <CountUp end={value} duration={1.2} separator="," />
          </h2>
        </div>
      </div>

      {/* Description and Trend */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100/80 dark:border-white/5 pt-3">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate">
          {description}
        </p>

        <div className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100/80 dark:border-emerald-800/40 shrink-0">
          <TrendingUp size={11} />
          <span>{trend}</span>
        </div>
      </div>
    </motion.div>
  );
}