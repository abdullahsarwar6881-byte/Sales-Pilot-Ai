"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export default function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: Props) {
  return (
    <motion.div
      whileHover={{
        y: -3,
      }}
      transition={{ duration: 0.15 }}
    >
      <Link
        href={href}
        className="block rounded-2xl border border-theme bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-indigo-500/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xs">
          <Icon size={22} />
        </div>

        <h3 className="mt-3.5 text-base font-bold text-foreground">
          {title}
        </h3>

        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>

        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          Open
          <ArrowRight size={14} />
        </div>
      </Link>
    </motion.div>
  );
}