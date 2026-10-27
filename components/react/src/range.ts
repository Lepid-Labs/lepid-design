// Pure maths behind Slider and RangeSlider, kept DOM-free so node:test can run it
// (so it imports nothing). The native range input already snaps and does the
// keyboard; this is for what it cannot do: snap a typed number, paint the fill,
// and keep two thumbs from crossing.

export interface RangeBounds {
  min: number;
  max: number;
  /** Default 1. */
  step?: number;
}

/** Decimal places in a step, so 0.1 + 0.2 snaps to 0.3, not 0.30000000000000004. */
const places = (step: number) => (String(step).split(".")[1] ?? "").length;

/** A value as the native input would hold it: clamped to min..max, on the nearest
 *  step counted from min. A typed 47.3 with step 1 becomes 47; NaN becomes min. */
export function snapToStep(value: number, { min, max, step = 1 }: RangeBounds): number {
  if (!Number.isFinite(value)) return min;
  const v = Math.min(max, Math.max(min, value));
  if (!(step > 0)) return v;
  const snapped = min + Math.round((v - min) / step) * step;
  // the last step may overshoot max when (max - min) is not a multiple of step
  const top = min + Math.floor((max - min) / step + 1e-9) * step;
  return Number(Math.min(snapped, top).toFixed(places(step)));
}

/** Where a value sits along the track, 0..1: what --ld-range-fill carries. */
export function rangeFraction(value: number, min: number, max: number): number {
  if (!(max > min) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** Two thumbs after `thumb` (0 low, 1 high) is moved to `next`: snapped, and held
 *  at least `gap` away from the other thumb, so the thumbs never cross. */
export function clampRange(values: readonly [number, number], thumb: 0 | 1, next: number, bounds: RangeBounds, gap = 0): [number, number] {
  const [lo, hi] = values;
  const v = snapToStep(next, bounds);
  return thumb === 0 ? [Math.min(v, snapToStep(hi - gap, bounds)), hi] : [lo, Math.max(v, snapToStep(lo + gap, bounds))];
}

/** Which thumb's input sits on top where the two overlap. Both inputs span the
 *  whole track, so the top one takes every press: the low thumb goes on top once
 *  it is past the middle, or two thumbs parked at max could never be pulled apart. */
export function rangeTopThumb([lo]: readonly [number, number], min: number, max: number): 0 | 1 {
  return rangeFraction(lo, min, max) > 0.5 ? 0 : 1;
}
