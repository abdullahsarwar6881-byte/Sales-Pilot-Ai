"use client";

import ConversationItem, {
  Conversation,
} from "./ConversationItem";
import EmptyState from "./EmptyState";

interface Props {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
}: Props) {
  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="rounded-2xl border border-theme bg-card shadow-xs flex flex-col h-full overflow-hidden transition-colors">
      <div className="border-b border-theme px-3.5 py-2.5 flex items-center justify-between bg-muted/20">
        <h2 className="text-sm font-bold text-foreground">
          Inbox
        </h2>

        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
          {conversations.length}
        </span>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            active={conversation.id === activeId}
            onClick={() => onSelect(conversation.id)}
          />
        ))}
      </div>
    </div>
  );
}