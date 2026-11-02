// Display formatting for dates, times, durations and thrown errors, kept DOM-free so it
// can be tested under node:test without a renderer (so it imports nothing — Node runs the
// .ts source and cannot resolve .js specifiers). formatBytes lives in upload-files.ts and
// the local "YYYY-MM-DD" in date-presets.ts (localISODate).

export type DateInput = Date | string | number;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A Date from a Date, epoch ms or ISO string. A bare "YYYY-MM-DD" is that local calendar
 *  day, not UTC midnight (which `new Date()` gives, and which is the day before in the
 *  Americas). */
export function toDate(value: DateInput): Date {
  const m = typeof value === "string" ? DATE_ONLY.exec(value) : null;
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
}

/** A date for people, in their locale and time zone: "Nov 2, 2026". Pass `options` for
 *  more, e.g. `{ dateStyle: "medium", timeStyle: "short" }` for the time too. */
export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  locale?: string,
): string {
  return toDate(value).toLocaleString(locale, options);
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** How long ago (or until) `value` is, in its largest whole unit: "3 minutes ago",
 *  "yesterday", "in 2 hours". Under a minute either way is "now". */
export function formatRelative(value: DateInput, now: DateInput = Date.now(), locale?: string): string {
  const s = Math.round((toDate(value).getTime() - toDate(now).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const [unit, size] = RELATIVE_UNITS.find(([, n]) => Math.abs(s) >= n) ?? ["second", Infinity];
  return rtf.format(Math.trunc(s / size) || 0, unit); // || 0: -0 would read "0 seconds ago"
}

const DURATION_UNITS = [
  ["d", 86_400],
  ["h", 3_600],
  ["min", 60],
  ["s", 1],
] as const;

/** A span of time in its two largest units: "450 ms", "12 s", "3 min 20 s", "2 h",
 *  "3 d 4 h". Seconds are rounded; the smaller unit is dropped when it is zero. */
export function formatDuration(ms: number): string {
  if (Math.round(ms) < 1000) return `${Math.max(0, Math.round(ms))} ms`;
  const s = Math.round(ms / 1000);
  const i = DURATION_UNITS.findIndex(([, n]) => s >= n);
  const [unit, size] = DURATION_UNITS[i];
  const head = `${Math.floor(s / size)} ${unit}`;
  const next = DURATION_UNITS[i + 1];
  const rest = next ? Math.floor((s % size) / next[1]) : 0;
  return next && rest ? `${head} ${rest} ${next[0]}` : head;
}

/** What to show for a thrown or rejected value: a non-blank string as is, else its
 *  `message` when that is a non-blank string, else `fallback`. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (typeof error === "string" && error.trim()) return error;
  const message = (error as { message?: unknown } | null | undefined)?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}
