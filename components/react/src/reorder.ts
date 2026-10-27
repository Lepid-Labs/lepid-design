// Pure reordering behind SortableList and SortableBoard, kept DOM-free so node:test
// can run it (so it imports nothing). A move takes the item itself from one place
// to another: the same object, with everything it carries (its checkbox, its
// progress, its comments), lands in the new slot. Nothing is rebuilt from a label.

/** A slot: which list (column), and the index the item has once it is there. */
export interface SortPosition {
  list: number;
  index: number;
}

/** `items` with the one at `from` moved to `to` (its index after the move). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

/** Columns with one item moved between (or within) them. Columns it did not touch
 *  keep their identity, so a renderer can skip them. */
export function moveCard<C extends { items: readonly unknown[] }>(columns: readonly C[], from: SortPosition, to: SortPosition): C[] {
  const item = columns[from.list]?.items[from.index];
  if (item === undefined || !columns[to.list]) return [...columns];
  if (from.list === to.list) {
    return columns.map((c, i) => (i === from.list ? { ...c, items: moveItem(c.items, from.index, to.index) } : c));
  }
  return columns.map((c, i) => {
    if (i === from.list) return { ...c, items: c.items.filter((_, j) => j !== from.index) };
    if (i !== to.list) return c;
    const items = [...c.items];
    items.splice(Math.max(0, Math.min(to.index, items.length)), 0, item);
    return { ...c, items };
  });
}

/** Where an arrow key takes a lifted item. `lengths` are the lists as shown, the
 *  item counted where it is now. Up and Down step within its list; Left and Right
 *  carry it to the neighbouring list at the same height (or its end); Home and End
 *  go to the top and bottom. At an edge it stays put. */
export function keyboardMove(at: SortPosition, key: string, lengths: readonly number[]): SortPosition {
  const last = (lengths[at.list] ?? 1) - 1;
  switch (key) {
    case "ArrowUp":
      return { ...at, index: Math.max(0, at.index - 1) };
    case "ArrowDown":
      return { ...at, index: Math.min(last, at.index + 1) };
    case "Home":
      return { ...at, index: 0 };
    case "End":
      return { ...at, index: last };
    case "ArrowLeft":
    case "ArrowRight": {
      const list = at.list + (key === "ArrowLeft" ? -1 : 1);
      if (list < 0 || list >= lengths.length) return at;
      return { list, index: Math.min(at.index, lengths[list]) }; // its length is the slot past the end
    }
    default:
      return at;
  }
}

/** The index a dragged item would take: how many of the other items' midpoints
 *  (in order, along the list's axis) the pointer has passed. */
export function insertionIndex(pointer: number, midpoints: readonly number[]): number {
  let i = 0;
  while (i < midpoints.length && pointer > midpoints[i]) i++;
  return i;
}

/** Auto-scroll speed in px per frame while dragging near an edge of a scroller
 *  spanning `start`..`end`: 0 outside the `edge` band, ramping up to `max` at the
 *  very edge (negative scrolls back). */
export function edgeScroll(pointer: number, start: number, end: number, edge = 48, max = 18): number {
  const band = Math.min(edge, (end - start) / 3);
  if (pointer < start + band) return -Math.round(max * Math.min(1, (start + band - pointer) / band));
  if (pointer > end - band) return Math.round(max * Math.min(1, (pointer - (end - band)) / band));
  return 0;
}

export type SortEvent = "grab" | "move" | "drop" | "cancel";

/** What a screen reader hears: "Moved Task A to position 3 of 5 in Done". `list`
 *  names the column; leave it out for a single list. */
export function sortMessage(event: SortEvent, label: string, at: SortPosition, length: number, list?: string): string {
  const where = `position ${at.index + 1} of ${length}${list ? ` in ${list}` : ""}`;
  switch (event) {
    case "grab":
      return `Picked up ${label}, ${where}. Arrow keys move it, Space drops it, Escape cancels.`;
    case "move":
      return `Moved ${label} to ${where}.`;
    case "drop":
      return `Dropped ${label} at ${where}.`;
    case "cancel":
      return `Cancelled. ${label} is back at ${where}.`;
  }
}
