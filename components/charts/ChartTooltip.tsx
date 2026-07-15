import { money } from "@/lib/format";

interface TooltipRow {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  payload?: Record<string, unknown>;
}

/** Shared dark tooltip for all Recharts charts. */
export default function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-hairline bg-raised px-3 py-2 shadow-lg">
      {label != null && <div className="mb-1 text-xs text-ink-2">{label}</div>}
      {payload.map((row, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: row.color ?? "var(--ink-muted)" }}
          />
          <span className="text-muted">{row.name}</span>
          <span className="ml-auto pl-3 font-medium text-ink tabular-nums">
            {typeof row.value === "number" ? money(row.value) : String(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
