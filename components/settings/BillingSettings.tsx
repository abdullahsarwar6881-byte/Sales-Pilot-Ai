"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function BillingSettings() {
  const searchParams = useSearchParams();
  const search = searchParams?.toString();
  const billingHref = search ? `/dashboard/billing?${search}` : "/dashboard/billing";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        Subscription & Billing
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Manage your Sales Pilot plan and billing preferences.
      </p>

      <div className="mt-6 space-y-6">
        {/* Current Plan */}
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">
                Current Subscription
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                View plan details, billing cycle, and invoice history.
              </p>
            </div>

            <Link
              href={billingHref}
              className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-200 transition"
            >
              View Subscription →
            </Link>
          </div>
        </div>

        {/* Upgrade */}
        <div className="rounded-2xl bg-indigo-50 p-5">
          <h3 className="font-semibold text-indigo-900">
            Upgrade Your Plan
          </h3>

          <p className="mt-1 text-sm text-indigo-700">
            Upgrade your plan for additional websites, expanded knowledge pages, and advanced features.
          </p>

          <Link
            href={billingHref}
            className="inline-block mt-4 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            Manage Subscription
          </Link>
        </div>
      </div>
    </div>
  );
}