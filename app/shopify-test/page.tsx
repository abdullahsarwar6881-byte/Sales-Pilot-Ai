"use client";

import { useEffect, useState } from "react";

export default function ShopifyTestPage() {
  const [mounted, setMounted] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    console.log("SALES PILOT CLIENT JAVASCRIPT IS RUNNING");
    setMounted(true);
  }, []);

  function handleClick() {
    console.log("SHOPIFY TEST BUTTON CLICKED");

    setClickCount((current) => current + 1);
  }

  return (
    <main className="min-h-screen bg-white p-10 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold">
          Shopify Connection Test
        </h1>

        <p className="mt-3 text-lg text-gray-600">
          We're testing the Sales Pilot client application.
        </p>

        {/* Client status */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h2 className="text-lg font-bold">
            Client Status
          </h2>

          <p className="mt-2 text-xl">
            {mounted
              ? "✅ Client JavaScript is running"
              : "⏳ Waiting for client JavaScript..."}
          </p>
        </div>

        {/* Button */}
        <button
          type="button"
          onClick={handleClick}
          className="mt-8 rounded-xl bg-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-purple-700 active:scale-95"
        >
          Test Shopify Connection
        </button>

        {/* Click status */}
        <div className="mt-8 rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold">
            Button Status
          </h2>

          <p className="mt-2 text-xl">
            Click count: {clickCount}
          </p>

          {clickCount > 0 && (
            <p className="mt-3 font-semibold text-green-600">
              ✅ React click handler is working.
            </p>
          )}
        </div>

        {/* Debug information */}
        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-bold">
            What we are testing
          </h2>

          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Next.js page rendering</li>
            <li>React client hydration</li>
            <li>React state</li>
            <li>Button click handler</li>
            <li>Shopify authentication comes AFTER this test</li>
          </ul>
        </div>
      </div>
    </main>
  );
}