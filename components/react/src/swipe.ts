// Pure gesture rules behind SwipeRow, kept DOM-free so node:test can run it (so it
// imports nothing). Offsets are logical: positive pulls the row towards the
// inline end and shows the leading actions, negative shows the trailing ones
// (the controller flips the sign in right-to-left text).

/** Movement before the gesture picks an axis. */
export const SWIPE_SLOP = 10;
/** Released past this share of the actions' width, the row stays open. */
export const SWIPE_OPEN_FRACTION = 0.5;
/** Released past this share of the row, a full swipe fires the outermost action. */
export const SWIPE_FULL_FRACTION = 0.6;
/** A flick faster than this (px/ms) opens or closes however far it went. */
export const SWIPE_FLING = 0.5;

/** Which way a touch is going once it has moved past `slop`: "x" is a swipe, "y"
 *  a scroll (the browser keeps it, thanks to touch-action: pan-y), null undecided. */
export function swipeAxis(dx: number, dy: number, slop = SWIPE_SLOP): "x" | "y" | null {
  if (Math.hypot(dx, dy) < slop) return null;
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
}

/** Resistance past a limit: the further it goes, the less it follows, and it
 *  never travels more than `dimension` (the curve iOS uses for overscroll). */
export function rubberBand(excess: number, dimension: number, c = 0.55): number {
  if (excess <= 0 || dimension <= 0) return 0;
  return (excess * dimension * c) / (dimension + c * excess);
}

export interface SwipeLimits {
  /** How far each side may travel freely: the actions' width, the row's width
   *  when that side has a full swipe, 0 when it has no actions. */
  leading: number;
  trailing: number;
  /** The row's width: the most a rubber band can stretch. */
  width: number;
}

/** Where the row sits for a raw drag: 1:1 up to a side's limit, rubber-banded past it. */
export function swipeOffset(raw: number, { leading, trailing, width }: SwipeLimits): number {
  if (raw >= 0) return raw <= leading ? raw : leading + rubberBand(raw - leading, width);
  return -raw <= trailing ? raw : -(trailing + rubberBand(-raw - trailing, width));
}

export type SwipeSettle = "closed" | "leading" | "trailing" | "full-leading" | "full-trailing";

export interface SwipeRelease {
  /** Where the row was let go (logical px). */
  offset: number;
  /** Speed at release, px/ms, positive towards the inline end. */
  velocity: number;
  /** Width of each side's actions; 0 when it has none. */
  leading: number;
  trailing: number;
  width: number;
  /** Sides whose outermost action fires on a full swipe. */
  fullLeading?: boolean;
  fullTrailing?: boolean;
}

/** Where a released row settles. A full swipe needs the distance, never just a
 *  flick, so a fast brush cannot delete anything; a flick only opens or closes. */
export function swipeSettle({ offset, velocity, leading, trailing, width, fullLeading, fullTrailing }: SwipeRelease): SwipeSettle {
  const side = offset > 0 ? "leading" : "trailing";
  const reach = offset > 0 ? leading : trailing;
  const dist = Math.abs(offset);
  const toward = Math.sign(velocity) === Math.sign(offset);
  if (offset === 0 || reach === 0) return "closed";
  if ((side === "leading" ? fullLeading : fullTrailing) && dist > width * SWIPE_FULL_FRACTION) return `full-${side}`;
  if (Math.abs(velocity) > SWIPE_FLING) return toward ? side : "closed";
  return dist > reach * SWIPE_OPEN_FRACTION ? side : "closed";
}
