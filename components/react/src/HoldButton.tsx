import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent, ReactNode } from "react";
import type { ButtonProps } from "./Button.js";
import { cx } from "./cx.js";
import { createHoldController, type HoldController, type HoldState } from "./hold.js";

export interface HoldButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Commitment window in ms. Defaults to the theme's --ld-hold-duration (300 ms). */
  duration?: number;
  /** Fires once when the hold completes. */
  onConfirm: () => void;
  /** Optional secondary text under the label (announced via aria-describedby). */
  hint?: ReactNode;
  /** Show the live percentage. Default true. */
  showMeter?: boolean;
  /** Content of the circular well the ring wraps — usually an icon. */
  icon?: ReactNode;
  /** Keyboard escape hatch: a plain Space/Enter tap fires immediately instead
   * of requiring a held key. Pair with a confirm dialog in onConfirm. */
  confirmOnKeyboardTap?: boolean;
  /** Announced to assistive tech once the hold fires. Default "Confirmed". */
  confirmedLabel?: string;
}

const SR_ONLY: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const HOLD_KEYS = new Set([" ", "Enter"]);

/** Parse a CSS <time> ("300ms" | "0.3s") into ms; undefined if unparseable. */
function parseCssTime(raw: string): number | undefined {
  const m = raw.trim().match(/^([\d.]+)\s*(ms|s)$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2] === "s" ? n * 1000 : n;
}

/** Hold-to-confirm button: the ring around the icon fills over the commitment
 * window and the action fires only when it completes. Releasing early cancels.
 * Renders .ld-btn.ld-btn--hold with the ring/body/meter subparts. */
export function HoldButton({
  duration,
  onConfirm,
  hint,
  showMeter = true,
  icon,
  confirmOnKeyboardTap = false,
  confirmedLabel = "Confirmed",
  variant = "default",
  size = "md",
  className,
  style,
  children,
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...rest
}: HoldButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const ctl = useRef<HoldController | null>(null);
  const latest = useRef({ duration, onConfirm });
  latest.current = { duration, onConfirm };
  const hintId = useId();
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<HoldState>("idle");

  useEffect(() => {
    const c = createHoldController({
      duration: () => {
        const explicit = latest.current.duration;
        if (explicit !== undefined) return explicit;
        const el = ref.current;
        const fromTheme = el && parseCssTime(getComputedStyle(el).getPropertyValue("--ld-hold-duration"));
        return fromTheme ?? 300;
      },
      onProgress: setProgress,
      onConfirm: () => latest.current.onConfirm(),
      onStateChange: setState,
    });
    ctl.current = c;
    return () => c.dispose();
  }, []);

  const start = useCallback(() => {
    if (!disabled) ctl.current?.start();
  }, [disabled]);
  const cancel = useCallback(() => ctl.current?.cancel(), []);

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(e);
    if (e.defaultPrevented || e.button !== 0 || !e.isPrimary) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start();
  };
  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerUp?.(e);
    cancel();
  };
  const handlePointerCancel = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerCancel?.(e);
    cancel();
  };
  const handleLostCapture = (e: PointerEvent<HTMLButtonElement>) => {
    onLostPointerCapture?.(e);
    cancel();
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Escape") {
      cancel();
      return;
    }
    if (!HOLD_KEYS.has(e.key)) return;
    e.preventDefault(); // suppress the native click that Space/Enter would synthesize
    if (e.repeat) return;
    if (confirmOnKeyboardTap) {
      if (!disabled) ctl.current?.fire();
    } else {
      start();
    }
  };
  const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyUp?.(e);
    if (HOLD_KEYS.has(e.key)) {
      e.preventDefault();
      cancel();
    }
  };
  const handleBlur = (e: FocusEvent<HTMLButtonElement>) => {
    onBlur?.(e);
    cancel();
  };

  const percent = Math.round(progress * 100);
  const classes = cx(
    "ld-btn",
    "ld-btn--hold",
    variant !== "default" && `ld-btn--${variant}`,
    size === "sm" && "ld-btn--sm",
    className
  );

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      style={{ ...style, "--ld-hold": progress } as CSSProperties}
      data-ld-hold={state === "idle" ? undefined : state}
      aria-describedby={hint !== undefined ? hintId : undefined}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostCapture}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={handleBlur}
      {...rest}
    >
      <span className="ld-btn__ring" aria-hidden="true">
        {icon}
      </span>
      <span className="ld-btn__body">
        <span className="ld-btn__label">{children}</span>
        {hint !== undefined && (
          <span className="ld-btn__hint" id={hintId}>
            {hint}
          </span>
        )}
      </span>
      {showMeter && (
        <span className="ld-btn__meter" aria-hidden="true">
          {percent}%
        </span>
      )}
      <span style={SR_ONLY} aria-live="polite">
        {state === "fired" ? confirmedLabel : ""}
      </span>
    </button>
  );
}
