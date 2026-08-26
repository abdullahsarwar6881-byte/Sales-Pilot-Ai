"use client";

import { useState } from "react";

export default function TestCheckoutPage() {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/billing/test-payment",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            planId: "growth",
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to create checkout."
        );
      }

      if (!data.checkoutUrl) {
        throw new Error(
          "Safepay checkout URL was not returned."
        );
      }

      /*
       * Redirect to Safepay.
       */
      window.location.href =
        data.checkoutUrl;
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout."
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-xl">

        <h1 className="text-2xl font-bold">
          Safepay Checkout Test
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Test the direct Safepay payment
          checkout for the Growth plan.
        </p>

        <button
          type="button"
          onClick={startCheckout}
          disabled={loading}
          className="mt-6 rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background disabled:opacity-50"
        >
          {loading
            ? "Opening checkout..."
            : "Pay for Growth"}
        </button>

        {error && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}