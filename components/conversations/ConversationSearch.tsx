"use client";

import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function ConversationSearch({
  value,
  onChange,
}: Props) {
  return (
    <div className="relative">

      <Search
        size={20}
        className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search conversations..."
        className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-14 pr-5 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      />

    </div>
  );
}