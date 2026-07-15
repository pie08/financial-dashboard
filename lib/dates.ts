export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/** Monday of the week containing the given ISO date. */
export function weekStartOf(iso: string): string {
  const d = toUTC(iso);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return toISO(d);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function daysBetween(startISO: string, endISO: string): number {
  return Math.round((toUTC(endISO).getTime() - toUTC(startISO).getTime()) / 86400000);
}

/** "2026-07-09" → "Jul 9" */
export function shortLabel(iso: string): string {
  const d = toUTC(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Compact human label for a date range: "Jul 1–9", "May 4 – Jul 9", "Jun 2026". */
export function rangeLabel(start: string, end: string): string {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (sy === ey && sm === em) {
    if (sd === 1 && ed === daysInMonth(ey, em)) return `${MONTHS[em - 1]} ${ey}`;
    return `${MONTHS[sm - 1]} ${sd}–${ed}`;
  }
  if (sy === ey) return `${MONTHS[sm - 1]} ${sd} – ${MONTHS[em - 1]} ${ed}`;
  return `${MONTHS[sm - 1]} ${sd}, ${sy} – ${MONTHS[em - 1]} ${ed}, ${ey}`;
}
