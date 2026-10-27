// Pure sort and selection rules behind SortHeader, the selection cells and
// useRowSelection, kept DOM-free (and import-free) so node:test runs the source.

export type SortDirection = "ascending" | "descending";

/** The one sorted column, or null for the data's own order. */
export interface SortState {
  key: string;
  direction: SortDirection;
}

/** The sort after a press on column `key`. One column sorts at a time; each press
 *  cycles ascending → descending → off, so the original order is always one press away. */
export function nextSort(current: SortState | null, key: string): SortState | null {
  if (current?.key !== key) return { key, direction: "ascending" };
  return current.direction === "ascending" ? { key, direction: "descending" } : null;
}

/** `aria-sort` for column `key`: only the sorted column carries it (APG sortable table). */
export function ariaSort(sort: SortState | null, key: string): SortDirection | undefined {
  return sort?.key === key ? sort.direction : undefined;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const isEmpty = (v: unknown) => v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));

/** Ascending order of two non-empty cell values: numbers and dates by value, text in
 *  natural order ("run 9" before "run 10"), case and accents ignored. */
export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return collator.compare(String(a), String(b));
}

/** A sorted copy of `rows`. Stable in both directions (equal values keep their
 *  original order), and empty values (null, undefined, "", NaN) always sink to the end. */
export function sortRows<T>(rows: readonly T[], sort: SortState | null, value: (row: T, key: string) => unknown): T[] {
  if (!sort) return [...rows];
  const sign = sort.direction === "ascending" ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i, v: value(row, sort.key) }))
    .sort((a, b) => {
      const ea = isEmpty(a.v);
      const eb = isEmpty(b.v);
      if (ea || eb) return ea === eb ? a.i - b.i : ea ? 1 : -1;
      return sign * compareValues(a.v, b.v) || a.i - b.i;
    })
    .map((d) => d.row);
}

/** How much of the current page is selected: the header checkbox is unchecked,
 *  indeterminate ("some") or checked. An empty page is "none". */
export type PageSelection = "none" | "some" | "all";

export function pageSelection(selected: ReadonlySet<string>, pageIds: readonly string[]): PageSelection {
  const n = pageIds.filter((id) => selected.has(id)).length;
  return n === 0 ? "none" : n === pageIds.length ? "all" : "some";
}

/** The header checkbox: a fully selected page clears; none or some selects the whole
 *  page. Rows on other pages keep their state. */
export function togglePage(selected: ReadonlySet<string>, pageIds: readonly string[]): Set<string> {
  const next = new Set(selected);
  const clear = pageSelection(selected, pageIds) === "all";
  for (const id of pageIds) clear ? next.delete(id) : next.add(id);
  return next;
}

/** A press on row `id`'s checkbox. With `shift` and the previous press (`anchor`) on
 *  this page, every row between the two, in display `order`, takes the state the
 *  pressed row moves to. The pressed row becomes the next anchor. */
export function toggleRow(
  selected: ReadonlySet<string>,
  id: string,
  { shift = false, anchor = null, order }: { shift?: boolean; anchor?: string | null; order: readonly string[] },
): { selected: Set<string>; anchor: string } {
  const next = new Set(selected);
  const on = !selected.has(id);
  const from = anchor === null ? -1 : order.indexOf(anchor);
  const to = order.indexOf(id);
  const range = shift && from >= 0 && to >= 0 ? order.slice(Math.min(from, to), Math.max(from, to) + 1) : [id];
  for (const r of range) on ? next.add(r) : next.delete(r);
  return { selected: next, anchor: id };
}
