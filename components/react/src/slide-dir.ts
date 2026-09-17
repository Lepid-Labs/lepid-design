// Pure direction logic behind the sliding indicator (Tabs underline,
// ButtonGroup pill), kept DOM-free so it can be tested under node:test without
// a renderer (so it imports nothing — Node runs the .ts source and cannot
// resolve the .js specifiers the build uses).

export type SlideDir = "forward" | "back";

/** Which way the active item moved between two child indexes. `undefined` when
 *  there is no travel to describe — nothing was active before or after (-1),
 *  or the index did not change — so the caller leaves the last direction alone. */
export function slideDir(prev: number, next: number): SlideDir | undefined {
  if (prev < 0 || next < 0 || prev === next) return undefined;
  return next > prev ? "forward" : "back";
}
