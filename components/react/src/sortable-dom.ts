// Drag-to-reorder for lists and boards, on pointer events and the keyboard. It
// touches only the DOM (no React), so plain pages can use it too; SortableList and
// SortableBoard drive it. It never moves a node itself: it reports moves and the
// owner re-renders, so a framework's view of the DOM stays true.
//
// Markup: lists marked [data-ld-sort-list] (optional data-ld-sort-name, "Done"),
// items as their children marked [data-ld-sort-key] and data-ld-sort-label, each
// with a .ld-drag-handle button. The controller writes data-ld-dragging on the
// item, data-ld-drop ("before" on an item, "end" on a list) for the insertion
// line, data-ld-drop-target on the list it would land in, and data-ld-sorting on root.
import { edgeScroll, insertionIndex, keyboardMove, sortMessage, type SortEvent, type SortPosition } from "./reorder.js";

export interface SortableOptions {
  /** Announcements go here: an element with aria-live, rendered before it is needed. */
  live: HTMLElement;
  /** Keyboard lift: show the item at `to` until it is dropped or cancelled. */
  onPreview: (key: string, from: SortPosition, to: SortPosition) => void;
  /** Dropped somewhere new, by pointer or keyboard: commit the move. */
  onDrop: (key: string, from: SortPosition, to: SortPosition) => void;
  /** Keyboard lift cancelled: drop the preview. */
  onCancel: (key: string) => void;
}

const DRAG_SLOP = 4;
const LIFT_KEYS = new Set([" ", "Enter"]);
const STEP_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]);
const same = (a: SortPosition, b: SortPosition) => a.list === b.list && a.index === b.index;

/** Make `root` sortable. Returns the function that stops it. */
export function createSortable(root: HTMLElement, options: SortableOptions): () => void {
  const lists = () => [...root.querySelectorAll<HTMLElement>("[data-ld-sort-list]")];
  const itemsOf = (list?: HTMLElement) => [...(list?.querySelectorAll<HTMLElement>(":scope > [data-ld-sort-key]") ?? [])];
  const byKey = (key: string) => root.querySelector<HTMLElement>(`[data-ld-sort-key="${CSS.escape(key)}"]`);
  const where = (item: HTMLElement): SortPosition => {
    const all = lists();
    const list = all.find((l) => l.contains(item));
    return { list: all.indexOf(list!), index: itemsOf(list).indexOf(item) };
  };
  const say = (event: SortEvent, key: string, at: SortPosition, length?: number) => {
    const list = lists()[at.list];
    const label = byKey(key)?.dataset.ldSortLabel ?? key;
    options.live.textContent = sortMessage(event, label, at, length ?? itemsOf(list).length, list?.dataset.ldSortName);
  };
  const clearDrop = () => {
    for (const el of root.querySelectorAll<HTMLElement>("[data-ld-drop], [data-ld-drop-target]")) {
      delete el.dataset.ldDrop;
      delete el.dataset.ldDropTarget;
    }
  };
  const lift = (item: HTMLElement | null, how: string) => {
    if (item) item.dataset.ldDragging = how;
    root.dataset.ldSorting = how;
  };
  const settle = () => {
    for (const el of root.querySelectorAll<HTMLElement>("[data-ld-dragging]")) {
      delete el.dataset.ldDragging;
      el.style.removeProperty("translate");
    }
    delete root.dataset.ldSorting;
    clearDrop();
  };

  // keyboard: Space or Enter lifts, arrows move, Space or Enter drops, Escape cancels
  let kbd: { key: string; from: SortPosition; at: SortPosition } | undefined;
  // after the owner re-renders the preview: the item may be a new node, so find it again
  const afterRender = (run: (item: HTMLElement | null) => void) =>
    requestAnimationFrame(() => {
      const item = kbd ? byKey(kbd.key) : null;
      if (item) lift(item, "keyboard");
      run(item);
    });
  const onKeyDown = (e: KeyboardEvent) => {
    const handle = (e.target as HTMLElement).closest<HTMLElement>(".ld-drag-handle");
    const item = handle?.closest<HTMLElement>("[data-ld-sort-key]");
    if (!handle || !item || ptr) return;
    const key = item.dataset.ldSortKey!;
    if (!kbd) {
      if (!LIFT_KEYS.has(e.key)) return;
      e.preventDefault();
      const from = where(item);
      kbd = { key, from, at: from };
      lift(item, "keyboard");
      say("grab", key, from);
      return;
    }
    if (kbd.key !== key) return;
    if (STEP_KEYS.has(e.key)) {
      e.preventDefault();
      kbd.at = keyboardMove(kbd.at, e.key, lists().map((l) => itemsOf(l).length));
      options.onPreview(key, kbd.from, kbd.at);
      afterRender((moved) => {
        moved?.querySelector<HTMLElement>(".ld-drag-handle")?.focus();
        if (kbd) say("move", key, kbd.at);
      });
    } else if (LIFT_KEYS.has(e.key)) {
      e.preventDefault();
      const { from, at } = kbd;
      kbd = undefined;
      settle();
      if (!same(from, at)) options.onDrop(key, from, at);
      say("drop", key, at);
      requestAnimationFrame(() => {
        const h = byKey(key)?.querySelector<HTMLElement>(".ld-drag-handle");
        if (h && document.activeElement !== h) h.focus(); // a re-render may have replaced it
      });
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      const { from } = kbd;
      kbd = undefined;
      settle();
      options.onCancel(key);
      if (e.key === "Escape") {
        requestAnimationFrame(() => {
          byKey(key)?.querySelector<HTMLElement>(".ld-drag-handle")?.focus();
          say("cancel", key, from);
        });
      }
    }
  };

  // pointer: the handle lifts the item, which follows the pointer; the line shows the slot
  let ptr:
    | { key: string; item: HTMLElement; from: SortPosition; x0: number; y0: number; ox: number; oy: number; x: number; y: number; tx: number; ty: number; started: boolean; to: SortPosition; frame: number }
    | undefined;
  const track = () => {
    const p = ptr!;
    const r = p.item.getBoundingClientRect();
    // the slot it left may have scrolled: place it from where its layout box is now
    p.tx += p.x - p.ox - r.left;
    p.ty += p.y - p.oy - r.top;
    p.item.style.translate = `${p.tx}px ${p.ty}px`;
    const all = lists();
    // the list under the pointer, else the nearest one (columns may wrap into rows)
    const dist = (l: HTMLElement) => {
      const b = l.getBoundingClientRect();
      return Math.hypot(Math.max(b.left - p.x, 0, p.x - b.right), Math.max(b.top - p.y, 0, p.y - b.bottom));
    };
    const list = all.reduce((best, l) => (dist(l) < dist(best) ? l : best), all[0]);
    const others = itemsOf(list).filter((el) => el !== p.item);
    const index = insertionIndex(p.y, others.map((el) => {
      const b = el.getBoundingClientRect();
      return b.top + b.height / 2;
    }));
    p.to = { list: all.indexOf(list), index };
    clearDrop();
    if (others[index]) others[index].dataset.ldDrop = "before";
    else list.dataset.ldDrop = "end";
    if (all.length > 1) list.dataset.ldDropTarget = "";
  };
  const scroll = () => {
    const p = ptr;
    if (!p?.started) return;
    const page = edgeScroll(p.y, 0, innerHeight);
    if (page) scrollBy(0, page);
    const list = lists()[p.to.list];
    const b = list?.getBoundingClientRect();
    const inner = list && list.scrollHeight > list.clientHeight ? edgeScroll(p.y, b!.top, b!.bottom) : 0;
    if (inner) list!.scrollTop += inner;
    if (page || inner) track();
    p.frame = requestAnimationFrame(scroll);
  };
  const end = (drop: boolean) => {
    const p = ptr;
    ptr = undefined;
    removeEventListener("keydown", escape, true);
    if (!p?.started) return;
    cancelAnimationFrame(p.frame);
    const length = itemsOf(lists()[p.to.list]).length + (p.to.list === p.from.list ? 0 : 1);
    settle();
    if (!drop) return say("cancel", p.key, p.from);
    if (!same(p.from, p.to)) options.onDrop(p.key, p.from, p.to);
    say("drop", p.key, p.to, length);
  };
  const escape = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    end(false);
  };
  const onPointerDown = (e: PointerEvent) => {
    const handle = (e.target as HTMLElement).closest<HTMLElement>(".ld-drag-handle");
    const item = handle?.closest<HTMLElement>("[data-ld-sort-key]");
    if (!handle || !item || e.button !== 0 || kbd || ptr) return;
    handle.setPointerCapture(e.pointerId);
    const r = item.getBoundingClientRect();
    const from = where(item);
    ptr = { key: item.dataset.ldSortKey!, item, from, x0: e.clientX, y0: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, x: e.clientX, y: e.clientY, tx: 0, ty: 0, started: false, to: from, frame: 0 };
    addEventListener("keydown", escape, true);
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = ptr;
    if (!p) return;
    Object.assign(p, { x: e.clientX, y: e.clientY });
    if (!p.started) {
      if (Math.hypot(p.x - p.x0, p.y - p.y0) < DRAG_SLOP) return;
      p.started = true;
      lift(p.item, "pointer");
      p.frame = requestAnimationFrame(scroll);
    }
    track();
  };
  const onPointerUp = (e: PointerEvent) => end(e.type === "pointerup");

  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerUp);
  return () => {
    end(false);
    root.removeEventListener("keydown", onKeyDown);
    root.removeEventListener("pointerdown", onPointerDown);
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerup", onPointerUp);
    root.removeEventListener("pointercancel", onPointerUp);
  };
}
