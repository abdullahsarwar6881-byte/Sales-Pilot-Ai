"use client";

interface Props {
  selected: string;
  onSelect: (value: string) => void;
}

const filters = [
  "All",
  "Unread",
  "AI",
  "Human",
  "Resolved",
];

export default function ConversationFilters({
  selected,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onSelect(filter)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            selected === filter
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs"
              : "border border-theme bg-card text-muted-foreground hover:bg-hover hover:text-foreground active:bg-slate-200/60 dark:active:bg-slate-800/60"
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}