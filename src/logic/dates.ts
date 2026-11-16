/** Local calendar date as 'YYYY-MM-DD'. */
export type DateKey = string;

export function toDateKey(d: Date): DateKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Date key for an ISO timestamp, in the device's local time zone. */
export function isoToDateKey(iso: string): DateKey {
  return toDateKey(new Date(iso));
}

export function addDays(key: DateKey, days: number): DateKey {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** The last `n` date keys ending at `end`, oldest first. */
export function lastNDays(end: DateKey, n: number): DateKey[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}
