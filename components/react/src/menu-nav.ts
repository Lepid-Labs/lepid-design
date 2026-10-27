// Pure keyboard logic behind Menu and ContextMenu (APG menu pattern), kept
// DOM-free so node:test can run it (so it imports nothing).

/** A touch held this long opens a context menu. */
export const LONG_PRESS_MS = 500;
/** A touch that moves further than this (px) is a scroll or drag, not a long press. */
export const LONG_PRESS_SLOP = 10;

/** Typed characters further apart than this start a new typeahead string. */
export const TYPEAHEAD_RESET_MS = 500;

/** Index focus moves to for a navigation key in a menu of `count` items, or
 *  undefined for any other key. Arrows wrap; Home and End jump to the ends; from
 *  no focus (-1) ArrowDown goes to the first item and ArrowUp to the last. */
export function menuMove(count: number, current: number, key: string): number | undefined {
  if (count === 0) return undefined;
  switch (key) {
    case "ArrowDown":
      return current < 0 ? 0 : (current + 1) % count;
    case "ArrowUp":
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
  }
  return undefined;
}

/** The typeahead string after a printable key: appended inside the reset window,
 *  started over after it. */
export function typeaheadBuffer(
  prev: { text: string; at: number } | undefined,
  char: string,
  now: number,
  reset = TYPEAHEAD_RESET_MS,
): { text: string; at: number } {
  return { text: prev && now - prev.at < reset ? prev.text + char : char, at: now };
}

/** Index of the item a typed string lands on, or -1. One character, or the same
 *  one repeated, cycles through the items starting with it, beginning after the
 *  current one; a longer string matches a prefix, beginning at the current one so
 *  typing on refines in place. Case and leading space are ignored. */
export function menuTypeahead(labels: string[], current: number, typed: string): number {
  const text = typed.toLowerCase();
  const cycle = [...text].every((c) => c === text[0]);
  const prefix = cycle ? text[0] : text;
  const start = cycle ? current + 1 : Math.max(current, 0);
  for (let i = 0; i < labels.length; i++) {
    const at = (start + i) % labels.length;
    if (labels[at].trim().toLowerCase().startsWith(prefix)) return at;
  }
  return -1;
}
