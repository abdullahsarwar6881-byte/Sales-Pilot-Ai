"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const question = input;

    const userMessage: Message = {
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        role: "assistant",
        content:
          data.response ||
          data.error ||
          "Something went wrong.",
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Server error.",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <div className="border-b border-slate-800 p-6">
        <h1 className="text-3xl font-bold">
          Sales Pilot AI
        </h1>

        <p className="mt-2 text-slate-400">
          Ask questions about your knowledge base.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="text-slate-500">
            Ask your first question...
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-3xl rounded-xl p-4 ${
              message.role === "user"
                ? "ml-auto bg-indigo-600"
                : "bg-slate-800"
            }`}
          >
            <div className="mb-2 font-semibold">
              {message.role === "user"
                ? "You"
                : "Sales Pilot"}
            </div>

            <div className="whitespace-pre-wrap">
              {message.content}
            </div>

            {message.role === "assistant" &&
              message.sources &&
              message.sources.length > 0 && (
                <div className="mt-4 border-t border-slate-700 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Sources
                  </p>

                  <div className="space-y-1">
                    {message.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all text-sm text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        {source}
                      </a>
                    ))}
                  </div>
                </div>
              )}
          </div>
        ))}

        {loading && (
          <div className="max-w-3xl rounded-xl bg-slate-800 p-4">
            <div className="font-semibold">
              Sales Pilot
            </div>

            <div className="mt-2 text-slate-300">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 border-t border-slate-800 p-6">
        <input
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !loading
            ) {
              sendMessage();
            }
          }}
          placeholder="Ask anything..."
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-500"
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-6 hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}