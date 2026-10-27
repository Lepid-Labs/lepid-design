// Pure calendar maths behind DateField, kept DOM-free so node:test can run it (so
// it imports nothing). Dates travel as the native input's "YYYY-MM-DD" strings.
// "Today" is the reader's local calendar date, never toISOString(), which is the
// UTC date and is already tomorrow on an American evening. Day arithmetic runs in
// UTC on that date alone, where no day is 23 or 25 hours long.

/** A preset chip: its label, and the date it picks given today's date. */
export interface DatePreset {
  label: string;
  resolve: (today: string) => string;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");
const fromUTC = (d: Date) => `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** The local calendar date of `now` as "YYYY-MM-DD". */
export function localISODate(now: Date = new Date()): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Whether `iso` is a real "YYYY-MM-DD" date (not 2026-02-30). */
export function isISODate(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return !!m && fromUTC(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))) === iso;
}

/** `iso` moved by `days` (negative goes back), across months, years and leap days. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return fromUTC(new Date(Date.UTC(y, m - 1, d + days)));
}

/** Day of the week of `iso`, 0 Sunday .. 6 Saturday. */
export const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** The next `day` (0 Sunday .. 6 Saturday) strictly after `iso`. */
export function nextWeekday(iso: string, day: number): string {
  return addDays(iso, ((day - weekday(iso) + 6) % 7) + 1);
}

/** The ready-made chips. "Next week" is next Monday, the start of next week, as
 *  task apps read it; pass your own preset for "in 7 days". */
export const DATE_PRESETS = {
  today: { label: "Today", resolve: (t: string) => t },
  tomorrow: { label: "Tomorrow", resolve: (t: string) => addDays(t, 1) },
  nextWeek: { label: "Next week", resolve: (t: string) => nextWeekday(t, 1) },
} satisfies Record<string, DatePreset>;

/** Whether `iso` is inside the optional min..max (inclusive). ISO dates order as text. */
export const dateInRange = (iso: string, min?: string, max?: string) => (!min || iso >= min) && (!max || iso <= max);

/** The native input's value for a preset's date. A datetime-local value keeps the
 *  time already chosen, else takes `time`. */
export function presetValue(date: string, kind: "date" | "datetime-local", current = "", time = "09:00"): string {
  if (kind === "date") return date;
  return `${date}T${/T(\d{2}:\d{2})/.exec(current)?.[1] ?? time}`;
}

export type DateOrder = "mdy" | "dmy";

/** The typed-entry mask's digits ("03152026", or "15032026" for dmy) as an ISO date,
 *  or undefined until all eight are in and they make a real date. */
export function typedToISO(digits: string, order: DateOrder = "mdy"): string | undefined {
  if (!/^\d{8}$/.test(digits)) return undefined;
  const [a, b, year] = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)];
  const iso = order === "mdy" ? `${year}-${a}-${b}` : `${year}-${b}-${a}`;
  return isISODate(iso) ? iso : undefined;
}

/** An ISO date as the typed-entry mask's digits, the inverse of typedToISO. */
export function isoToTyped(iso: string, order: DateOrder = "mdy"): string {
  if (!isISODate(iso.slice(0, 10))) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return order === "mdy" ? `${m}${d}${y}` : `${d}${m}${y}`;
}
