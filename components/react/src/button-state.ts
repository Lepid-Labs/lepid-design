// Pure attribute logic behind Button, kept DOM-free so node:test can run it
// without a renderer (so it imports nothing).

export interface ButtonOptions {
  variant?: "default" | "primary" | "accent" | "danger";
  size?: "sm" | "md";
  /** Work in flight: sets aria-busy, which the theme turns into a spinner. */
  busy?: boolean;
  /** Id of the visible text that says why the button is unavailable. */
  reasonId?: string;
  /** The caller's own aria-disabled. */
  ariaDisabled?: boolean | "true" | "false";
  /** The caller's own aria-describedby; kept ahead of the reason. */
  describedBy?: string;
  className?: string;
}

export interface ButtonAttrs {
  className: string;
  "aria-busy"?: true;
  "aria-disabled"?: true;
  "aria-describedby"?: string;
  /** Activation must be swallowed: busy, or disabled while still focusable. */
  inert: boolean;
}

/** Class list and ARIA for `.ld-btn`. A reason makes the button aria-disabled
 *  (focusable, announced, described) instead of `disabled` (skipped and silent). */
export function buttonAttrs({
  variant = "default",
  size = "md",
  busy,
  reasonId,
  ariaDisabled,
  describedBy,
  className,
}: ButtonOptions): ButtonAttrs {
  const disabled = !!reasonId || ariaDisabled === true || ariaDisabled === "true";
  const attrs: ButtonAttrs = {
    className: ["ld-btn", variant !== "default" && `ld-btn--${variant}`, size === "sm" && "ld-btn--sm", className]
      .filter(Boolean)
      .join(" "),
    inert: disabled || !!busy,
  };
  if (busy) attrs["aria-busy"] = true;
  if (disabled) attrs["aria-disabled"] = true;
  const by = [describedBy, reasonId].filter(Boolean).join(" ");
  if (by) attrs["aria-describedby"] = by;
  return attrs;
}
