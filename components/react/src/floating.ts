// Pure placement behind Tooltip, Menu and ContextMenu, kept DOM-free so
// node:test can run it (so it imports nothing). Tooltips and menus use CSS
// anchor positioning where the browser has it; this is the fallback there and
// the only path for a context menu, which opens at the pointer.

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Side = "top" | "bottom";

export interface BesideOptions {
  /** Preferred side of the anchor. Default "bottom". */
  side?: Side;
  /** "start" lines the left edges up (menus); "center" centres on the anchor (tooltips). */
  align?: "start" | "center";
  /** Space between anchor and box. Default 4. */
  gap?: number;
  /** Space kept from the viewport edge. Default 8. */
  margin?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

/** Top-left corner for a box of `size` beside `anchor`: on `side`, flipped to the
 *  other side when it does not fit there and does on the other, then slid along
 *  the edge to stay `margin` inside the viewport. */
export function placeBeside(
  anchor: Box,
  size: Size,
  viewport: Size,
  { side = "bottom", align = "start", gap = 4, margin = 8 }: BesideOptions = {},
): { x: number; y: number; side: Side } {
  const below = anchor.y + anchor.height + gap;
  const above = anchor.y - gap - size.height;
  const fitsBelow = below + size.height <= viewport.height - margin;
  const fitsAbove = above >= margin;
  let placed = side;
  if (side === "bottom" && !fitsBelow && fitsAbove) placed = "top";
  if (side === "top" && !fitsAbove && fitsBelow) placed = "bottom";
  const x = align === "center" ? anchor.x + (anchor.width - size.width) / 2 : anchor.x;
  return { x: clamp(x, margin, viewport.width - margin - size.width), y: placed === "bottom" ? below : above, side: placed };
}

/** Top-left corner for a menu opened at a point: below and right of it, flipped
 *  up or left where it would overflow, and kept `margin` inside the viewport (a
 *  box larger than the viewport pins to the top-left margin). */
export function placeAtPoint(point: { x: number; y: number }, size: Size, viewport: Size, margin = 8) {
  const x = point.x + size.width > viewport.width - margin ? point.x - size.width : point.x;
  const y = point.y + size.height > viewport.height - margin ? point.y - size.height : point.y;
  return {
    x: clamp(x, margin, viewport.width - margin - size.width),
    y: clamp(y, margin, viewport.height - margin - size.height),
  };
}
