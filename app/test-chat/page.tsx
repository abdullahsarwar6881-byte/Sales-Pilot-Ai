import ChatWidget from "@/components/ChatWidget";
import { createClient } from "@/lib/supabase/server";

export default async function TestChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Login Required
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please log in to your Sales Pilot account before
            testing the chat widget.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Background */}

      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-[-200px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="absolute bottom-[-200px] right-[-100px] h-[500px] w-[500px] rounded-full bg-purple-200/20 blur-3xl" />
      </div>

      {/* Content */}

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <div className="text-center">

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
            <span className="text-xl font-bold">
              S
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            Sales Pilot Chat Test
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-500">
            This page uses your real Sales Pilot chat API.
            Messages sent here are processed by your actual
            backend and saved to your database.
          </p>

          {/* Status */}

          <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Account
              </p>

              <p className="mt-1 max-w-[220px] truncate text-sm font-semibold text-slate-900">
                {user.email}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Chat API
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <p className="text-sm font-semibold text-slate-900">
                  Connected
                </p>
              </div>
            </div>

          </div>

          {/* Instructions */}

          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 text-left">
            <h2 className="font-semibold text-slate-900">
              Test your AI agent
            </h2>

            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>
                • Say <strong>Hi</strong> to test the fast
                response.
              </li>

              <li>
                • Ask a product question to test knowledge
                retrieval.
              </li>

              <li>
                • Send multiple messages to test the same
                conversation.
              </li>

              <li>
                • Open a new session to test billing usage.
              </li>

              <li>
                • Check the Billing page after testing.
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* =========================================
          REAL CHAT WIDGET
          ========================================= */}

      <ChatWidget
        profileId={user.id}
        aiName="Sales Pilot"
        brandColor="#6366F1"
        welcomeMessage="👋 Hi! I'm Sales Pilot. How can I help you today?"
        autoOpen={true}
        preview={false}
        theme="Light"
        size="Medium"
        radius="Rounded"
        position="Bottom Right"
        showTypingIndicator={true}
        soundNotifications={false}
        showAiAvatar={true}
        collectVisitorName={false}
        collectVisitorEmail={false}
        enableAnimations={true}
        showPoweredBy={true}
      />
    </main>
  );
}