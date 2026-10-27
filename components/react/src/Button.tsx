import { useId } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { buttonAttrs } from "./button-state.js";
import { SR_ONLY } from "./sr-only.js";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. Maps to .ld-btn--{variant}. */
  variant?: "default" | "primary" | "accent" | "danger";
  /** Size. "sm" maps to .ld-btn--sm for inline/table-row actions; "md" is the default. */
  size?: "sm" | "md";
  /** Work in flight. Sets `aria-busy`: the theme draws a spinner over the label at the
   *  same width, clicks are ignored, focus stays, and `busyLabel` is announced. Pass it
   *  (true or false) for the button's whole life so the announcement region exists early. */
  busy?: boolean;
  /** Announced politely when `busy` turns on. Default "Loading". */
  busyLabel?: string;
  /** Why the button can't be used yet. Makes it `aria-disabled` (still focusable and
   *  announced, clicks ignored) and shows this text right after it, tied by aria-describedby. */
  disabledReason?: ReactNode;
}

const swallow = (e: MouseEvent) => e.preventDefault(); // also stops a submit button submitting

export function Button({
  variant,
  size,
  busy,
  busyLabel = "Loading",
  disabledReason,
  className,
  onClick,
  "aria-disabled": ariaDisabled,
  "aria-describedby": describedBy,
  ...rest
}: ButtonProps) {
  const reasonId = useId();
  const hasReason = !!disabledReason;
  const { inert, ...attrs } = buttonAttrs({
    variant,
    size,
    busy,
    reasonId: hasReason ? reasonId : undefined,
    ariaDisabled,
    describedBy,
    className,
  });
  // always a fragment, so the button keeps its place (and focus) when a reason comes or goes
  return (
    <>
      <button {...rest} {...attrs} onClick={inert ? swallow : onClick} />
      {busy !== undefined && (
        <span style={SR_ONLY} role="status">
          {busy ? busyLabel : ""}
        </span>
      )}
      {hasReason && (
        <span className="ld-btn-reason" id={reasonId}>
          {disabledReason}
        </span>
      )}
    </>
  );
}
