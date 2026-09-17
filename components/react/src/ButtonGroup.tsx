import type { HTMLAttributes } from "react";
import { buttonGroupAttrs } from "./button-group.js";
import { useSlideDir } from "./useSlideDir.js";

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Stretch to the full row with equal-width segments. Maps to .ld-btn-group--block. */
  block?: boolean;
}

/** One long track with `Button`s lined up inside it. The theme strips the
 *  segments' own chrome, so children are plain `Button`s; name the group with
 *  `aria-label`. For a toggle / segmented control set `aria-pressed` on each
 *  `Button` — the theme lights the pressed segment from that attribute, and
 *  which one is pressed stays the caller's state. With a single pressed segment
 *  the theme slides one pill between segments; the group stamps `data-ld-dir`
 *  so the pill's leading edge reaches the new segment first. */
export function ButtonGroup({ block, className, ...rest }: ButtonGroupProps) {
  const ref = useSlideDir<HTMLDivElement>('.ld-btn--active, [aria-pressed="true"]');
  return <div {...buttonGroupAttrs(block, className)} {...rest} ref={ref} />;
}
