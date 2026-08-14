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
        y: -5,
        scale: 1.02,
      }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={href}
        className="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <Icon size={28} />
        </div>

        <h3 className="mt-5 text-lg font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>

        <div className="mt-6 flex items-center gap-2 font-semibold text-indigo-600">
          Open
          <ArrowRight size={18} />
        </div>
      </Link>
    </motion.div>
  );
}