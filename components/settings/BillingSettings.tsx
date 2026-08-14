"use client";

export default function BillingSettings() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <h2 className="text-xl font-bold text-slate-900">
        Billing Settings
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Manage your subscription and usage.
      </p>


      <div className="mt-6 space-y-6">


        {/* Current Plan */}
        <div className="rounded-2xl border border-slate-200 p-5">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="font-semibold text-slate-900">
                Current Plan
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your active subscription.
              </p>

            </div>


            <span className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-semibold text-indigo-700">
              Starter
            </span>

          </div>


        </div>




        {/* Usage */}
        <div className="rounded-2xl border border-slate-200 p-5">

          <h3 className="font-semibold text-slate-900">
            Usage
          </h3>


          <div className="mt-4 space-y-4">


            <div>

              <div className="mb-2 flex justify-between text-sm">

                <span className="text-slate-600">
                  AI Conversations
                </span>

                <span className="font-semibold text-slate-900">
                  120 / 5,000
                </span>

              </div>


              <div className="h-2 rounded-full bg-slate-100">

                <div className="h-2 w-[25%] rounded-full bg-indigo-600" />

              </div>

            </div>




            <div>

              <div className="mb-2 flex justify-between text-sm">

                <span className="text-slate-600">
                  Knowledge Documents
                </span>

                <span className="font-semibold text-slate-900">
                  15 / 100
                </span>

              </div>


              <div className="h-2 rounded-full bg-slate-100">

                <div className="h-2 w-[15%] rounded-full bg-indigo-600" />

              </div>

            </div>


          </div>

        </div>




        {/* Upgrade */}
        <div className="rounded-2xl bg-indigo-50 p-5">

          <h3 className="font-semibold text-indigo-900">
            Need More Power?
          </h3>


          <p className="mt-1 text-sm text-indigo-700">
            Upgrade your plan for more conversations, documents, and AI features.
          </p>


          <button
            type="button"
            className="mt-4 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            Upgrade Plan
          </button>

        </div>


      </div>

    </div>
  );
}