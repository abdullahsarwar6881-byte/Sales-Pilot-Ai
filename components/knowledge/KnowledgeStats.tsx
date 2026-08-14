"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Globe,
  Database,
  CheckCircle2,
} from "lucide-react";

interface Props {
  documents: number;
  pages: number;
  chunks: number;
  connected: boolean;
}

export default function KnowledgeStats({
  documents,
  pages,
  chunks,
  connected,
}: Props) {
  const stats = [
    {
      title: "Documents",
      value: documents,
      icon: FileText,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Website Pages",
      value: pages,
      icon: Globe,
      color: "from-violet-500 to-fuchsia-500",
    },
    {
      title: "Knowledge Chunks",
      value: chunks,
      icon: Database,
      color: "from-emerald-500 to-green-500",
    },
    {
      title: "Website",
      value: connected ? "Connected" : "Not Connected",
      icon: CheckCircle2,
      color: connected
        ? "from-emerald-500 to-green-500"
        : "from-red-500 to-orange-500",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <motion.div
            key={item.title}
            whileHover={{
              y: -4,
              scale: 1.02,
            }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  {item.title}
                </p>

                <h2 className="mt-3 text-3xl font-bold text-slate-900">
                  {item.value}
                </h2>
              </div>

              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-lg`}
              >
                <Icon size={28} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}