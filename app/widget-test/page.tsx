"use client";

import { useEffect } from "react";

const PROFILE_ID =
  "3c321d7c-23e8-4101-9d30-1a2a8a0a37f9";

export default function WidgetTestPage() {
  useEffect(() => {
    // Prevent loading the widget more than once
    if (
      document.getElementById(
        "salespilot-widget-script"
      )
    ) {
      return;
    }

    // Create widget script
    const script =
      document.createElement("script");

    script.id =
      "salespilot-widget-script";

    // Load local widget.js
    script.src = "/widget.js";

    // Pass the user's real Sales Pilot profile
    script.setAttribute(
      "data-profile",
      PROFILE_ID
    );

    // Tell widget where the API lives
    script.setAttribute(
      "data-api",
      window.location.origin
    );

    script.defer = true;

    document.body.appendChild(
      script
    );

    // Cleanup when leaving the page
    return () => {
      const widget =
        document.getElementById(
          "salespilot-widget"
        );

      if (widget) {
        widget.remove();
      }

      const widgetScript =
        document.getElementById(
          "salespilot-widget-script"
        );

      if (widgetScript) {
        widgetScript.remove();
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-10">
      <div className="mx-auto max-w-5xl">

        {/* Store Header */}
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">
            Acme Store
          </h1>

          <p className="mt-2 text-slate-500">
            Test website for Sales Pilot AI
          </p>
        </div>

        {/* Products */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">

          {/* Product 1 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="h-40 rounded-xl bg-slate-200" />

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Acme Hoodie
            </h2>

            <p className="mt-2 text-slate-500">
              Comfortable premium hoodie.
            </p>

            <p className="mt-4 font-bold text-slate-900">
              $49.00
            </p>
          </div>

          {/* Product 2 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="h-40 rounded-xl bg-slate-200" />

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Acme T-Shirt
            </h2>

            <p className="mt-2 text-slate-500">
              Classic Acme cotton t-shirt.
            </p>

            <p className="mt-4 font-bold text-slate-900">
              $25.00
            </p>
          </div>

          {/* Product 3 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="h-40 rounded-xl bg-slate-200" />

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Acme Cap
            </h2>

            <p className="mt-2 text-slate-500">
              Adjustable everyday cap.
            </p>

            <p className="mt-4 font-bold text-slate-900">
              $20.00
            </p>
          </div>

        </div>

        {/* Shipping & Returns */}
        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">

          <h2 className="text-xl font-bold text-slate-900">
            Shipping & Returns
          </h2>

          <p className="mt-3 text-slate-600">
            We offer standard shipping and
            accept returns within 30 days.
          </p>

        </div>

        {/* Test Information */}
        <div className="mt-8 rounded-3xl border border-indigo-100 bg-indigo-50 p-8">

          <h2 className="text-lg font-bold text-indigo-900">
            Sales Pilot Widget Test
          </h2>

          <p className="mt-2 text-sm text-indigo-700">
            The Sales Pilot widget should appear
            in the bottom-right corner of this page.
          </p>

          <p className="mt-3 text-xs text-indigo-600">
            Profile ID: {PROFILE_ID}
          </p>

        </div>

      </div>
    </main>
  );
}