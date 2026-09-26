// Pure attribute and follow logic behind LogBlock, kept DOM-free so it can be
// tested under node:test without a renderer (so it imports nothing — Node runs
// the .ts source and cannot resolve .js specifiers).

/** How close to the bottom (px) still counts as "reading the tail". */
export const LOG_PIN_TOLERANCE = 8;

export interface LogOptions {
  /** Cap on the block's height (number = px); sets --ld-log-max-height. */
  maxHeight?: number | string;
  /** Announce appended lines to assistive tech (role="log"). Default true. */
  live?: boolean;
  className?: string;
}

export interface LogAttrs {
  className: string;
  role?: "log";
  style?: Record<string, string>;
}

/** Class list, live-region role, and height variable for the `<pre>`. */
export function logAttrs({ maxHeight, live = true, className }: LogOptions): LogAttrs {
  const attrs: LogAttrs = { className: ["ld-pre", "ld-pre--log", className].filter(Boolean).join(" ") };
  if (live) attrs.role = "log";
  if (maxHeight !== undefined) {
    attrs.style = { "--ld-log-max-height": typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight };
  }
  return attrs;
}

/** True when the viewport sits at (or within tolerance of) the bottom — the
 *  reader is following the tail, so new output should keep it there. Content
 *  that doesn't overflow is always pinned. */
export function isPinnedToBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  tolerance: number = LOG_PIN_TOLERANCE,
): boolean {
  return scrollHeight - clientHeight - scrollTop <= tolerance;
}
