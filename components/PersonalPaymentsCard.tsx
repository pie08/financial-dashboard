import { money, pctChange } from "@/lib/format";
import type { PeriodComparison } from "@/lib/types";

/**
 * Internal transfers are you paying yourself, so they get their own box
 * instead of polluting revenue or expenses. Shown neutrally — paying
 * yourself more isn't good or bad the way revenue or expenses are.
 */
export default function PersonalPaymentsCard({
  comparison,
}: {
  comparison: PeriodComparison;
}) {
  const { current, previous } = comparison;
  const pct = previous
    ? pctChange(current.personalOut, previous.personalIn)
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-hairline bg-surface p-4">
      <div className="min-w-0">
        <p className="text-xs text-muted">
          Personal payments · {current.label}
        </p>
        <p className="mt-1 text-xl font-semibold text-ink sm:text-2xl">
          {money(current.personalOut)}
        </p>
        {pct !== null ? (
          <p className="mt-1 text-xs text-ink-2">
            {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%{" "}
            <span className="text-muted">vs {previous!.label}</span>
          </p>
        ) : previous ? (
          <p className="mt-1 text-xs text-muted">
            no transfers in {previous.label}
          </p>
        ) : null}
      </div>
      <div className="ml-auto max-w-xs text-right">
        {current.personalIn > 0 && (
          <p className="text-xs text-ink-2">
            {money(current.personalIn)}{" "}
            <span className="text-muted">moved back to business</span>
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted">
          Transfers between your own accounts — kept out of revenue and expenses
        </p>
      </div>
    </div>
  );
}
