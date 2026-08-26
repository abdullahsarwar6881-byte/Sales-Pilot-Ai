interface UsageCardProps {
  title: string;
  used: number;
  limit: number;
  description?: string;
}

export default function UsageCard({
  title,
  used,
  limit,
  description,
}: UsageCardProps) {
  // Safely normalize billing values
  const safeUsed =
    typeof used === "number" && Number.isFinite(used)
      ? Math.max(0, used)
      : 0;

  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(0, limit)
      : 0;

  // Calculate usage percentage safely
  const percentage =
    safeLimit > 0
      ? Math.min(
          Math.round((safeUsed / safeLimit) * 100),
          100
        )
      : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-foreground">
            {safeUsed.toLocaleString()}

            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {safeLimit.toLocaleString()}
            </span>
          </p>
        </div>

        <span className="text-sm font-medium text-muted-foreground">
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-300"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      {/* Description */}
      {description && (
        <p className="mt-3 text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}