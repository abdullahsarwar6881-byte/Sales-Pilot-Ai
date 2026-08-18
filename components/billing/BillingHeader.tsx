import { CreditCard } from "lucide-react";

export default function BillingHeader() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
          <CreditCard className="h-5 w-5 text-foreground" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Billing
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage your Sales Pilot subscription, usage, and billing.
          </p>
        </div>
      </div>
    </div>
  );
}