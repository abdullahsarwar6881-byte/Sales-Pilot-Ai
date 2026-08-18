"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

export default function ChatPage() {
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const [visitorSessionId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const existing =
      sessionStorage.getItem("sales_pilot_visitor_session");

    if (existing) {
      return existing;
    }

    const newSession = crypto.randomUUID();

    sessionStorage.setItem(
      "sales_pilot_visitor_session",
      newSession
    );

    return newSession;
  });

  // =====================================================
  // LOAD LOGGED-IN USER + PROFILE
  // =====================================================

  useEffect(() => {
    async function loadProfile() {
      try {
        setProfileLoading(true);
        setProfileError("");

        // -----------------------------------------------
        // GET AUTH USER
        // -----------------------------------------------

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error(
            "AUTH USER ERROR:",
            userError
          );

          setProfileError(
            "Unable to load your account."
          );

          return;
        }

        if (!user) {
          setProfileError(
            "You are not logged in. Please log in first."
          );

          return;
        }

        console.log(
          "AUTH USER ID:",
          user.id
        );

        // -----------------------------------------------
        // FIND PROFILE
        //
        // Most Sales Pilot setups use:
        // profiles.id = auth.users.id
        // -----------------------------------------------

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "PROFILE LOOKUP ERROR:",
            profileError
          );

          setProfileError(
            "Unable to load your Sales Pilot profile."
          );

          return;
        }

        if (!profile) {
          console.error(
            "PROFILE NOT FOUND FOR USER:",
            user.id
          );

          setProfileError(
            "Your Sales Pilot profile was not found. Please check the profiles table in Supabase."
          );

          return;
        }

        console.log(
          "PROFILE ID:",
          profile.id
        );

        setProfileId(profile.id);
      } catch (error) {
        console.error(
          "PROFILE LOAD ERROR:",
          error
        );

        setProfileError(
          "Something went wrong while loading your profile."
        );
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [supabase]);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  async function sendMessage() {
    if (!input.trim()) return;

    if (!profileId) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Your Sales Pilot profile is not loaded yet. Please refresh the page.",
        },
      ]);

      return;
    }

    const question = input.trim();

    const userMessage: Message = {
      role: "user",
      content: question,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      console.log(
        "SENDING CHAT:",
        {
          message: question,
          profileId,
          visitorSessionId,
        }
      );

      const response = await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message: question,

            // IMPORTANT
            profileId,

            // Keep the same visitor
            visitorSessionId,

            customerName:
              "Website Visitor",

            customerEmail:
              null,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "CHAT RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Chat request failed."
        );
      }

      const aiMessage: Message = {
        role: "assistant",

        content:
          data.response ||
          data.error ||
          "Something went wrong.",

        sources:
          data.sources || [],
      };

      setMessages((prev) => [
        ...prev,
        aiMessage,
      ]);
    } catch (error) {
      console.error(
        "CHAT ERROR:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Server error.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // PROFILE LOADING
  // =====================================================

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-xl font-semibold">
            Loading Sales Pilot...
          </div>

          <div className="mt-2 text-slate-400">
            Loading your profile
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // PROFILE ERROR
  // =====================================================

  if (profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-red-900/50 bg-slate-900 p-8">
          <h1 className="text-2xl font-bold">
            Sales Pilot
          </h1>

          <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-red-300">
            {profileError}
          </div>

          <button
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-500"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // CHAT UI
  // =====================================================

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      {/* HEADER */}

      <div className="border-b border-slate-800 p-6">
        <h1 className="text-3xl font-bold">
          Sales Pilot AI
        </h1>

        <p className="mt-2 text-slate-400">
          Ask questions about your knowledge base.
        </p>
      </div>

      {/* MESSAGES */}

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="text-slate-500">
            Ask your first question...
          </div>
        )}

        {messages.map(
          (message, index) => (
            <div
              key={index}
              className={`max-w-3xl rounded-xl p-4 ${
                message.role ===
                "user"
                  ? "ml-auto bg-indigo-600"
                  : "bg-slate-800"
              }`}
            >
              <div className="mb-2 font-semibold">
                {message.role ===
                "user"
                  ? "You"
                  : "Sales Pilot"}
              </div>

              <div className="whitespace-pre-wrap">
                {message.content}
              </div>

              {message.role ===
                "assistant" &&
                message.sources &&
                message.sources.length >
                  0 && (
                  <div className="mt-4 border-t border-slate-700 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Sources
                    </p>

                    <div className="space-y-1">
                      {message.sources.map(
                        (
                          source,
                          i
                        ) => (
                          <a
                            key={i}
                            href={
                              source
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block break-all text-sm text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {
                              source
                            }
                          </a>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )
        )}

        {/* THINKING */}

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

      {/* INPUT */}

      <div className="flex gap-4 border-t border-slate-800 p-6">
        <input
          value={input}
          disabled={loading}
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
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-500 disabled:opacity-60"
        />

        <button
          onClick={sendMessage}
          disabled={
            loading ||
            !profileId
          }
          className="rounded-xl bg-indigo-600 px-6 font-medium hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "..."
            : "Send"}
        </button>
      </div>
    </div>
  );
}