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
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-100 px-6 py-4">

        <h2 className="text-lg font-bold text-slate-900">
          Inbox
        </h2>

        <p className="text-sm text-slate-500">
          {conversations.length} Conversations
        </p>

      </div>

      <div className="max-h-[700px] space-y-3 overflow-y-auto p-4">

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