"use client";

import { useState } from "react";

export default function NotificationSettings() {

  const [notifications, setNotifications] = useState({
    conversations: true,
    escalations: true,
    reports: false,
    marketing: false,
  });


  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key],
    });
  };


  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <h2 className="text-xl font-bold text-slate-900">
        Notification Settings
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Choose which updates you want to receive.
      </p>


      <div className="mt-6 space-y-4">


        {/* New Conversations */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">

          <div>
            <h3 className="font-semibold text-slate-900">
              New Conversations
            </h3>

            <p className="text-sm text-slate-500">
              Get notified when customers start a chat.
            </p>
          </div>


          <input
            type="checkbox"
            checked={notifications.conversations}
            onChange={() =>
              toggleNotification("conversations")
            }
            className="h-5 w-5 rounded border-slate-300"
          />

        </div>




        {/* Escalations */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">

          <div>
            <h3 className="font-semibold text-slate-900">
              Human Escalations
            </h3>

            <p className="text-sm text-slate-500">
              Alert when AI needs human assistance.
            </p>
          </div>


          <input
            type="checkbox"
            checked={notifications.escalations}
            onChange={() =>
              toggleNotification("escalations")
            }
            className="h-5 w-5 rounded border-slate-300"
          />

        </div>




        {/* Reports */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">

          <div>
            <h3 className="font-semibold text-slate-900">
              Weekly Reports
            </h3>

            <p className="text-sm text-slate-500">
              Receive AI performance summaries.
            </p>
          </div>


          <input
            type="checkbox"
            checked={notifications.reports}
            onChange={() =>
              toggleNotification("reports")
            }
            className="h-5 w-5 rounded border-slate-300"
          />

        </div>




        {/* Marketing */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">

          <div>
            <h3 className="font-semibold text-slate-900">
              Product Updates
            </h3>

            <p className="text-sm text-slate-500">
              Receive updates about new features.
            </p>
          </div>


          <input
            type="checkbox"
            checked={notifications.marketing}
            onChange={() =>
              toggleNotification("marketing")
            }
            className="h-5 w-5 rounded border-slate-300"
          />

        </div>




        {/* Save */}
        <button
          type="button"
          className="mt-4 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Save Notification Settings
        </button>


      </div>

    </div>
  );
}