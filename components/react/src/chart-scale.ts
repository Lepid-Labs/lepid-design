// Pure scale, tick and geometry math behind BarChart, LineChart and Sparkline,
// kept DOM-free (and import-free) so node:test runs the source and the no-build
// demo can draw the same charts. Nothing here knows about SVG elements; it
// returns numbers and path strings.

export type Domain = readonly [number, number];

/** Map `domain` onto `range` linearly. A zero-width domain maps to the range's middle. */
export function linearScale([d0, d1]: Domain, [r0, r1]: Domain): (v: number) => number {
  const width = d1 - d0;
  return (v) => (width === 0 ? (r0 + r1) / 2 : r0 + ((v - d0) / width) * (r1 - r0));
}

/** A round step near `span / count`: 1, 2 or 5 times a power of ten. */
export function tickStep(span: number, count = 5): number {
  const raw = span / Math.max(1, count);
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f >= Math.SQRT2 * 5 ? 10 : f >= Math.sqrt(10) ? 5 : f >= Math.SQRT2 ? 2 : 1) * mag;
}

/** Digits after the point that a step needs: 0.25 → 2, 5 → 0. */
export const stepDecimals = (step: number) => Math.max(0, -Math.floor(Math.log10(step) + 1e-9));

export interface NiceScale {
  /** The data's extent widened out to whole steps. */
  domain: [number, number];
  ticks: number[];
  step: number;
  /** The axis does not reach zero (only possible with `zero: false`): draw a break. */
  broken: boolean;
}

/** A "nice" value axis for `values` (non-finite values are ignored). `zero` (the
 *  default) always takes the axis to 0, which bars need: a bar's length is its value.
 *  `zero: false` fits the data and reports `broken` when 0 is off the axis. */
export function niceScale(values: readonly (number | null)[], { count = 5, zero = true } = {}): NiceScale {
  const finite = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  let lo = finite.length ? Math.min(...finite) : 0;
  let hi = finite.length ? Math.max(...finite) : 0;
  if (zero) [lo, hi] = [Math.min(lo, 0), Math.max(hi, 0)];
  if (lo === hi) [lo, hi] = lo === 0 ? [0, 1] : zero ? [Math.min(lo, 0), Math.max(hi, 0)] : [lo - Math.abs(lo) / 10, hi + Math.abs(hi) / 10];
  const step = tickStep(hi - lo, count);
  const first = Math.floor(lo / step + 1e-9);
  const last = Math.ceil(hi / step - 1e-9);
  const digits = stepDecimals(step);
  const ticks = Array.from({ length: last - first + 1 }, (_, i) => Number(((first + i) * step).toFixed(digits)));
  const domain: [number, number] = [ticks[0], ticks[ticks.length - 1]];
  return { domain, ticks, step, broken: !zero && (domain[0] > 0 || domain[1] < 0) };
}

/** Tick label text: as many decimals as the step needs, grouped thousands. */
export function formatTick(v: number, step: number, locale?: string): string {
  const digits = stepDecimals(step);
  return v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export interface Band {
  /** Left edge of the bar. */
  x: number;
  /** Centre of the band, for its label. */
  center: number;
}

/** `n` equal bands across `[x0, x1]`; `gap` (0–1) of each band stays empty. */
export function bandLayout(n: number, [x0, x1]: Domain, gap = 0.25): { bands: Band[]; band: number; width: number } {
  const band = n > 0 ? (x1 - x0) / n : 0;
  const width = band * (1 - gap);
  const bands = Array.from({ length: n }, (_, i) => ({ x: x0 + i * band + (band - width) / 2, center: x0 + (i + 0.5) * band }));
  return { bands, band, width };
}

/** A bar's top and height under a y scale (`y` maps values to pixels, 0 included):
 *  it always grows from the zero line, down for a negative value. */
export function barExtent(value: number, y: (v: number) => number): { y: number; height: number } {
  const base = y(0);
  const end = y(value);
  return { y: Math.min(base, end), height: Math.abs(end - base) };
}

const r = (n: number) => Math.round(n * 100) / 100;

/** SVG path through `points`. A null y (no data) breaks the line instead of
 *  drawing across the gap as if the missing values were known. */
export function linePath(points: ReadonlyArray<readonly [number, number | null]>): string {
  let d = "";
  let pen = false;
  for (const [x, y] of points) {
    if (y === null || !Number.isFinite(y)) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${r(x)},${r(y)}`;
    pen = true;
  }
  return d;
}

/** Nudge label positions (pixels, any order) apart so none sit closer than `gap`,
 *  moving as little as possible and staying within `[min, max]`. Returns them in
 *  the input order. For direct labels at the ends of lines. */
export function spreadLabels(ys: readonly number[], gap: number, [min, max]: Domain = [-Infinity, Infinity]): number[] {
  const order = ys.map((y, i) => ({ y: Math.min(Math.max(y, min), max), i })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < order.length; k++) order[k].y = Math.max(order[k].y, order[k - 1].y + gap);
  // pushed past the bottom: pull the run back up from the end
  if (order.length) order[order.length - 1].y = Math.min(order[order.length - 1].y, max);
  for (let k = order.length - 2; k >= 0; k--) order[k].y = Math.min(order[k].y, order[k + 1].y - gap);
  const out: number[] = [];
  for (const o of order) out[o.i] = o.y;
  return out;
}

/** Show every `k`-th category label so labels about `labelWidth` wide never collide. */
export const labelEvery = (band: number, labelWidth: number) => Math.max(1, Math.ceil(labelWidth / Math.max(band, 1)));

export interface Extremes {
  min: number;
  max: number;
  minIndex: number;
  maxIndex: number;
  /** First and last present values, and where the last one is. */
  first: number;
  last: number;
  lastIndex: number;
}

/** Lowest, highest, first and last of the present values (null and NaN skipped),
 *  for summaries and end-of-line labels. Undefined when nothing is present. */
export function extremes(values: readonly (number | null)[]): Extremes | undefined {
  let out: Extremes | undefined;
  values.forEach((v, i) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return;
    if (!out) out = { min: v, max: v, minIndex: i, maxIndex: i, first: v, last: v, lastIndex: i };
    if (v < out.min) [out.min, out.minIndex] = [v, i];
    if (v > out.max) [out.max, out.maxIndex] = [v, i];
    [out.last, out.lastIndex] = [v, i];
  });
  return out;
}
