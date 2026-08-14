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
    <div className="flex flex-wrap gap-3">

      {filters.map((filter) => (

        <button
          key={filter}
          onClick={() => onSelect(filter)}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
            selected === filter
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          {filter}
        </button>

      ))}

    </div>
  );
}