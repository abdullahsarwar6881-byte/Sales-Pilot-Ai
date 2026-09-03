"use client";

import { useState } from "react";
import { Paperclip, Smile, SendHorizontal } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
}

export default function MessageInput({
  onSend,
}: Props) {
  const [message, setMessage] = useState("");

  const send = () => {
    if (!message.trim()) return;

    onSend(message);

    setMessage("");
  };

  return (
    <div className="border-t border-theme bg-card p-2.5 sm:p-3 transition-colors">
      <div className="flex items-center gap-2 rounded-xl border border-theme bg-input px-3 py-1.5 transition-all duration-150 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
        <button
          type="button"
          aria-label="Attach file"
          className="text-muted-foreground transition hover:text-foreground active:scale-95"
        >
          <Paperclip size={16} />
        </button>

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              send();
            }
          }}
          placeholder="Type your message..."
          className="flex-1 bg-transparent text-xs sm:text-sm text-input-foreground placeholder:text-muted-foreground outline-none"
        />

        <button
          type="button"
          aria-label="Add emoji"
          className="text-muted-foreground transition hover:text-foreground active:scale-95"
        >
          <Smile size={16} />
        </button>

        <button
          type="button"
          onClick={send}
          disabled={!message.trim()}
          aria-label="Send message"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs transition-all duration-150 hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SendHorizontal size={15} />
        </button>
      </div>
    </div>
  );
}