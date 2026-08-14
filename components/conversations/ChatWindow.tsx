"use client";

import MessageBubble, {
  ChatMessage,
} from "./MessageBubble";

import MessageInput from "./MessageInput";

import {
  Bot,
  Circle,
  UserRound,
  CheckCircle,
} from "lucide-react";

interface Props {
  customerName: string;
  messages: ChatMessage[];
  onSend: (message: string) => void;

  // NEW
  isHuman?: boolean;
  onReturnToAI?: () => void;
  onResolve?: () => void;
}

export default function ChatWindow({
  customerName,
  messages,
  onSend,
  isHuman = false,
  onReturnToAI,
  onResolve,
}: Props) {
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

        {/* CUSTOMER */}
        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 font-bold text-white">
            {customerName.charAt(0).toUpperCase()}
          </div>

          <div>

            <h2 className="text-lg font-bold text-slate-900">
              {customerName}
            </h2>

            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">

              <Circle
                size={10}
                className="fill-emerald-500 text-emerald-500"
              />

              Online

            </div>

          </div>

        </div>

        {/* =================================================
            AI / HUMAN STATUS
        ================================================= */}

        <div className="flex items-center gap-3">

          {isHuman ? (
            <>
              {/* HUMAN HANDLING */}

              <div className="flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700">

                <UserRound size={16} />

                Human Handling

              </div>

              {/* RETURN TO AI */}

              {onReturnToAI && (
                <button
                  onClick={onReturnToAI}
                  className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100"
                >
                  <Bot size={16} />

                  Return to AI
                </button>
              )}

            </>
          ) : (
            <>
              {/* AI HANDLING */}

              <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">

                <Bot size={16} />

                AI Handling

              </div>

            </>
          )}

          {/* RESOLVE */}

          {onResolve && (
            <button
              onClick={onResolve}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <CheckCircle size={16} />

              Resolve
            </button>
          )}

        </div>

      </div>

      {/* =================================================
          MESSAGES
      ================================================= */}

      <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 p-6">

        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">

            <p className="text-sm text-slate-400">
              No messages yet.
            </p>

          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
            />
          ))
        )}

      </div>

      {/* =================================================
          INPUT
      ================================================= */}

      <MessageInput onSend={onSend} />

    </div>
  );
}