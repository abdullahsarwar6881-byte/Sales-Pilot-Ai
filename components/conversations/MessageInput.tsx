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
    <div className="border-t border-slate-200 bg-white p-6">

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">

        <button className="text-slate-400 transition hover:text-indigo-600">
          <Paperclip size={20} />
        </button>

        <input
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              send();
            }
          }}
          placeholder="Type your message..."
          className="flex-1 bg-transparent outline-none"
        />

        <button className="text-slate-400 transition hover:text-indigo-600">
          <Smile size={20} />
        </button>

        <button
          onClick={send}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white transition hover:scale-105"
        >
          <SendHorizontal size={18} />
        </button>

      </div>

    </div>
  );
}