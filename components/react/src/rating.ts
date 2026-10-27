// Pure star-rating maths behind StarRating, kept DOM-free so node:test can run
// it without a renderer (so it imports nothing). An average is shown honestly:
// one decimal, the stars filled to exactly that number, and never rounded up to
// a perfect score it did not earn.

export const RATING_MAX = 5;

/** An average as people should read it: clamped to 0..max, rounded to one
 *  decimal, but only a perfect score reads as `max` (4.97 shows 4.9, not 5.0). */
export function roundRating(value: number, max = RATING_MAX): number {
  if (!Number.isFinite(value)) return 0;
  const v = Math.min(max, Math.max(0, value));
  const r = Math.round((v + Number.EPSILON) * 10) / 10;
  return r >= max && v < max ? (max * 10 - 1) / 10 : r;
}

/** How full each star is, 0..1 in tenths, from the rounded value — so the stars
 *  match the number printed beside them. */
export function starFills(value: number, max = RATING_MAX): number[] {
  const r = roundRating(value, max);
  return Array.from({ length: max }, (_, i) => Math.round(Math.min(1, Math.max(0, r - i)) * 10) / 10);
}

/** The number beside the stars: "4.3". */
export function formatRating(value: number, max = RATING_MAX): string {
  return roundRating(value, max).toFixed(1);
}

/** The display's accessible name: "4.3 out of 5 stars, 128 ratings". With a count
 *  of zero there is no average to state. */
export function ratingLabel(value: number, max = RATING_MAX, count?: number): string {
  if (count === 0) return "No ratings yet";
  const base = `${formatRating(value, max)} out of ${max} stars`;
  return count === undefined ? base : `${base}, ${count.toLocaleString("en-US")} ${count === 1 ? "rating" : "ratings"}`;
}
