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
  const percentage =
    limit > 0
      ? Math.min(Math.round((used / limit) * 100), 100)
      : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-foreground">
            {used.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {limit.toLocaleString()}
            </span>
          </p>
        </div>

        <span className="text-sm font-medium text-muted-foreground">
          {percentage}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      {description && (
        <p className="mt-3 text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}