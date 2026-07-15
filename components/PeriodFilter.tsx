"use client";

import { PERIOD_PRESETS, type PeriodPreset } from "@/lib/period";

export default function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodPreset;
  onChange: (preset: PeriodPreset) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Date range">
      {PERIOD_PRESETS.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-ink text-page"
                : "border border-hairline text-ink-2 hover:text-ink"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
