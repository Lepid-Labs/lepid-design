// Swipe-to-reveal for one list row, on pointer events. It touches only the DOM
// (no React), so plain pages can use it too; SwipeRow drives it. A swipe is only a
// shortcut: every action it reveals must also be in the row's menu.
//
// Markup: .ld-swipe holding .ld-swipe__actions--leading and/or --trailing (the
// buttons, outermost last on the trailing side and first on the leading side) and
// .ld-swipe__content. The row needs touch-action: pan-y (the theme sets it), so a
// vertical drag still scrolls the page. The controller writes --ld-swipe-x (px),
// --ld-swipe-reveal (px shown), data-ld-side, data-ld-swipe ("dragging", "leading",
// "trailing", "full") and data-ld-swipe-full while a release would fire.
import { swipeAxis, swipeOffset, swipeSettle, SWIPE_FULL_FRACTION } from "./swipe.js";

export type SwipeSide = "leading" | "trailing";

export interface SwipeOptions {
  /** Sides whose outermost action fires on a full swipe (the theme stretches it as the row is pulled). */
  full?: SwipeSide[];
  /** A full swipe was released: run that side's outermost action. Pair a destructive
   *  one with an undo toast; the row closes again by itself. */
  onFullSwipe?: (side: SwipeSide) => void;
}

const OPENED = "ld-swipe-open";

/** Make `row` swipeable. Returns the function that stops it. */
export function createSwipe(row: HTMLElement, { full = [], onFullSwipe }: SwipeOptions = {}): () => void {
  const content = row.querySelector<HTMLElement>(".ld-swipe__content")!;
  const sides = { leading: row.querySelector<HTMLElement>(".ld-swipe__actions--leading"), trailing: row.querySelector<HTMLElement>(".ld-swipe__actions--trailing") };
  let offset = 0;
  let swallowUntil = 0;
  let drag: { x0: number; y0: number; start: number; axis: "x" | "y" | null; x: number; t: number; v: number; dir: number; lead: number; trail: number; width: number } | undefined;

  const place = (off: number, dir: number, state?: string) => {
    offset = off;
    row.style.setProperty("--ld-swipe-x", `${off * dir}px`);
    row.style.setProperty("--ld-swipe-reveal", `${Math.abs(off)}px`);
    if (off) row.dataset.ldSide = off > 0 ? "leading" : "trailing";
    if (state) row.dataset.ldSwipe = state;
    else delete row.dataset.ldSwipe;
  };
  const close = () => {
    if (!offset && !row.dataset.ldSwipe) return;
    delete row.dataset.ldSwipeFull;
    place(0, 1);
  };
  const widthOf = (side: SwipeSide) => sides[side]?.offsetWidth ?? 0;

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".ld-swipe__actions")) return;
    const dir = getComputedStyle(row).direction === "rtl" ? -1 : 1;
    // measured at rest or open, before anything is stretched
    drag = { x0: e.clientX, y0: e.clientY, start: offset, axis: null, x: e.clientX, t: e.timeStamp, v: 0, dir, lead: widthOf("leading"), trail: widthOf("trailing"), width: row.offsetWidth };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag;
    if (!d) return;
    if (!d.axis) {
      d.axis = swipeAxis(e.clientX - d.x0, e.clientY - d.y0);
      if (d.axis === "y") drag = undefined; // a scroll: the browser has it
      if (d.axis !== "x") return;
      content.setPointerCapture(e.pointerId);
      document.dispatchEvent(new CustomEvent(OPENED, { detail: row }));
    }
    d.v = ((e.clientX - d.x) / Math.max(1, e.timeStamp - d.t)) * d.dir;
    Object.assign(d, { x: e.clientX, t: e.timeStamp });
    const limits = {
      leading: full.includes("leading") ? d.width : d.lead,
      trailing: full.includes("trailing") ? d.width : d.trail,
      width: d.width,
    };
    const off = swipeOffset(d.start + (e.clientX - d.x0) * d.dir, limits);
    const side = off > 0 ? "leading" : "trailing";
    row.toggleAttribute("data-ld-swipe-full", full.includes(side) && (side === "leading" ? d.lead : d.trail) > 0 && Math.abs(off) > d.width * SWIPE_FULL_FRACTION);
    place(off, d.dir, "dragging");
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = drag;
    drag = undefined;
    if (!d) return;
    if (d.axis !== "x") {
      // a tap on an open row closes it instead of opening the row's link
      if (offset && e.type === "pointerup") {
        swallowUntil = e.timeStamp + 400;
        close();
      }
      return;
    }
    swallowUntil = e.timeStamp + 400; // the click that ends a swipe is not a tap
    delete row.dataset.ldSwipeFull;
    if (e.type !== "pointerup") return place(d.start, d.dir, d.start ? (d.start > 0 ? "leading" : "trailing") : undefined);
    const settle = swipeSettle({
      offset, velocity: d.v, leading: d.lead, trailing: d.trail, width: d.width,
      fullLeading: full.includes("leading"), fullTrailing: full.includes("trailing"),
    });
    if (settle === "closed") return place(0, d.dir);
    if (settle === "leading" || settle === "trailing") return place(settle === "leading" ? d.lead : -d.trail, d.dir, settle);
    const side: SwipeSide = settle === "full-leading" ? "leading" : "trailing";
    place(side === "leading" ? d.width : -d.width, d.dir, "full");
    // fire once the row has slid away (at once under reduced motion), then come back
    const wait = parseFloat(getComputedStyle(content).transitionDuration) * 1000 || 0;
    setTimeout(() => {
      onFullSwipe?.(side);
      if (row.isConnected) close();
    }, wait);
  };
  const onClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(".ld-swipe__actions")) {
      requestAnimationFrame(close); // an action ran: put the row back
    } else if (e.timeStamp < swallowUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && offset) close();
  };
  const onOpened = (e: Event) => (e as CustomEvent).detail !== row && close();
  const onOutside = (e: PointerEvent) => offset && !row.contains(e.target as Node) && close();

  row.addEventListener("pointerdown", onPointerDown);
  row.addEventListener("pointermove", onPointerMove);
  row.addEventListener("pointerup", onPointerUp);
  row.addEventListener("pointercancel", onPointerUp);
  row.addEventListener("click", onClick, true);
  row.addEventListener("keydown", onKeyDown);
  document.addEventListener(OPENED, onOpened);
  document.addEventListener("pointerdown", onOutside, true);
  return () => {
    row.removeEventListener("pointerdown", onPointerDown);
    row.removeEventListener("pointermove", onPointerMove);
    row.removeEventListener("pointerup", onPointerUp);
    row.removeEventListener("pointercancel", onPointerUp);
    row.removeEventListener("click", onClick, true);
    row.removeEventListener("keydown", onKeyDown);
    document.removeEventListener(OPENED, onOpened);
    document.removeEventListener("pointerdown", onOutside, true);
  };
}
