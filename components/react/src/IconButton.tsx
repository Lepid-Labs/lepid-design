import type { ElementType, ReactNode } from "react";
import { iconButtonAttrs } from "./icon-button.js";
import type { PolyProps } from "./poly.js";

export type IconButtonProps<E extends ElementType = "button"> = PolyProps<
  E,
  {
    /** Accessible name (`aria-label`), and the tooltip unless `title` is set. Required: the control has no text. */
    label: string;
    /** Lit state. Maps to .ld-icon-btn--active; on a link also `aria-current="page"`.
     *  For a toggle button pass `aria-pressed` instead — the theme lights that too. */
    active?: boolean;
    /** "danger" tints the glyph red on hover. Maps to .ld-icon-btn--danger. */
    variant?: "default" | "danger";
    title?: string;
    className?: string;
    /** The icon (an inline `<svg>`; the theme sizes it to 1.25em). */
    children?: ReactNode;
  }
>;

/** Chromeless square icon-only control. Renders a `<button type="button">`,
 *  or `as` — `"a"` or a router Link — for navigation. */
export function IconButton<E extends ElementType = "button">({
  as,
  label,
  active,
  variant,
  title,
  className,
  ...rest
}: IconButtonProps<E>) {
  const Tag: ElementType = as ?? "button";
  const attrs = iconButtonAttrs({ label, active, variant, title, isButton: Tag === "button", className });
  return <Tag {...attrs} {...rest} />;
}
