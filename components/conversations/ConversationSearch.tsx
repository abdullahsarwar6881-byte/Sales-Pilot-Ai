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
    <div className="relative flex-1 min-w-[200px]">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search conversations..."
        className="w-full rounded-xl border border-theme bg-input py-2 pl-9 pr-3 text-xs sm:text-sm text-input-foreground shadow-xs outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground"
      />
    </div>
  );
}