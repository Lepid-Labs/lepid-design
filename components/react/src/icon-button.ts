// Pure attribute logic behind IconButton, kept DOM-free so it can be tested
// under node:test without a renderer (so it imports nothing — Node runs the
// .ts source and cannot resolve the .js specifiers the build uses).

export interface IconButtonOptions {
  /** Accessible name; also the hover tooltip unless `title` is given. */
  label: string;
  /** Lit state. On a link it also sets `aria-current="page"`. */
  active?: boolean;
  /** "danger" tints the glyph red on hover. */
  variant?: "default" | "danger";
  /** Explicit tooltip; overrides the one derived from `label`. */
  title?: string;
  /** The rendered element is a native `<button>` (not `<a>` / a router Link). */
  isButton?: boolean;
  className?: string;
}

export interface IconButtonAttrs {
  className: string;
  "aria-label": string;
  title: string;
  type?: "button";
  "aria-current"?: "page";
}

/** Class list and ARIA for an icon-only control. A native button defaults to
 *  `type="button"` so it never submits a surrounding form. */
export function iconButtonAttrs({
  label,
  active,
  variant = "default",
  title,
  isButton = true,
  className,
}: IconButtonOptions): IconButtonAttrs {
  const attrs: IconButtonAttrs = {
    className: [
      "ld-icon-btn",
      active && "ld-icon-btn--active",
      variant === "danger" && "ld-icon-btn--danger",
      className,
    ]
      .filter(Boolean)
      .join(" "),
    "aria-label": label,
    title: title ?? label,
  };
  if (isButton) attrs.type = "button";
  else if (active) attrs["aria-current"] = "page";
  return attrs;
}
