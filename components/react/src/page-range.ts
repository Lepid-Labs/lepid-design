// Pure page arithmetic behind Pagination, PageSummary and PageSizeSelect, kept
// DOM-free (and import-free) so node:test runs the source.

export type PageItem = number | "ellipsis";

const span = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

/** The page links to show (1-based): the first and last page, `siblings` either side
 *  of `current`, and an ellipsis for each gap. Past `siblings * 2 + 5` pages the list
 *  always has exactly that many items, so the controls never shift under the pointer,
 *  and an ellipsis never stands for a single page (that page is shown instead). */
export function pageRange(current: number, total: number, siblings = 1): PageItem[] {
  const slots = siblings * 2 + 5;
  if (total <= slots) return span(1, total);
  const page = Math.min(Math.max(current, 1), total);
  const left = page - siblings;
  const right = page + siblings;
  if (left <= 3) return [...span(1, slots - 2), "ellipsis", total];
  if (right >= total - 2) return [1, "ellipsis", ...span(total - slots + 3, total)];
  return [1, "ellipsis", ...span(left, right), "ellipsis", total];
}

export interface PageSpan {
  /** The page, clamped into 1..pages (a delete can leave you past the end). */
  page: number;
  pages: number;
  /** 1-based first and last row on the page; both 0 when there are no rows. */
  from: number;
  to: number;
}

/** Which rows a page holds: "Showing {from}–{to} of {total}". */
export function pageSpan(page: number, pageSize: number, total: number): PageSpan {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(Math.trunc(page) || 1, 1), pages);
  const from = total === 0 ? 0 : (p - 1) * pageSize + 1;
  return { page: p, pages, from, to: Math.min(p * pageSize, total) };
}

/** The page that still shows the first row on screen after the page size changes. */
export function pageAfterResize(page: number, oldSize: number, newSize: number): number {
  return Math.floor(((page - 1) * oldSize) / newSize) + 1;
}
