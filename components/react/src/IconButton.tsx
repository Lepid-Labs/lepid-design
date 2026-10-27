import type { ElementType, ReactNode } from "react";
import { iconButtonAttrs } from "./icon-button.js";
import type { PolyProps } from "./poly.js";
import { mergeTriggerProps, useTooltip } from "./Tooltip.js";

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
    /** Show `label` in a styled Tooltip on hover and keyboard focus instead of the
     *  native `title`; the tooltip then names the control (`aria-labelledby`). */
    tooltip?: boolean;
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
  tooltip,
  className,
  ...rest
}: IconButtonProps<E>) {
  const Tag: ElementType = as ?? "button";
  const tip = useTooltip({ content: label, kind: "label" });
  const tooltipId = tooltip ? (tip.triggerProps["aria-labelledby"] as string) : undefined;
  const attrs = iconButtonAttrs({ label, active, variant, title, isButton: Tag === "button", tooltipId, className });
  if (!tooltip) return <Tag {...attrs} {...rest} />;
  return (
    <>
      <Tag {...mergeTriggerProps({ ...attrs, ...rest }, tip.triggerProps)} />
      {tip.tooltip}
    </>
  );
}
