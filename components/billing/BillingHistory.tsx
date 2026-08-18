import { Download, Receipt } from "lucide-react";

interface BillingTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  invoice_url: string | null;
  created_at: string;
}

interface BillingHistoryProps {
  transactions: BillingTransaction[];
}

export default function BillingHistory({
  transactions,
}: BillingHistoryProps) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Billing history
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          View your previous Sales Pilot payments and invoices.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {transactions.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-foreground">
              No billing history yet
            </h3>

            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Your invoices and payments will appear here after
              your first payment.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[1fr_1.5fr_1fr_100px_80px] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <span>Date</span>
              <span>Description</span>
              <span>Amount</span>
              <span>Status</span>
              <span />
            </div>

            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid gap-3 border-b border-border px-5 py-4 last:border-b-0 md:grid-cols-[1fr_1.5fr_1fr_100px_80px] md:items-center md:gap-4"
              >
                <p className="text-sm font-medium text-foreground">
                  {new Date(
                    transaction.created_at
                  ).toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>

                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Receipt className="h-4 w-4 text-foreground" />
                  </div>

                  <p className="text-sm font-medium text-foreground">
                    {transaction.description}
                  </p>
                </div>

                <p className="text-sm font-semibold text-foreground">
                  {transaction.currency}{" "}
                  {transaction.amount.toLocaleString()}
                </p>

                <span className="w-fit rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">
                  {transaction.status}
                </span>

                <div>
                  {transaction.invoice_url ? (
                    <a
                      href={transaction.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      Invoice
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      —
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}