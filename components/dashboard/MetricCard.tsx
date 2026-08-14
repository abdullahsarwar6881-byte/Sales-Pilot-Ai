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
        y: -6,
        scale: 1.02,
      }}
      transition={{
        duration: 0.2,
      }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-3 text-4xl font-bold text-slate-900">
            <CountUp end={value} duration={1.5} />
          </h2>
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}
        >
          {icon}
        </div>

      </div>

      <div className="mt-6 flex items-center justify-between">

        <p className="text-sm text-slate-500">
          {description}
        </p>

        <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-600">

          <TrendingUp size={16} />

          {trend}

        </div>

      </div>
    </motion.div>
  );
}