import { useRef, useState } from "react";
import type { AriaAttributes } from "react";
import { cx } from "./cx.js";
import { fieldIds } from "./field-state.js";
import { otpActiveIndex, otpErase, otpInput, otpMove, otpTyped, type OtpStep } from "./otp-state.js";

export interface OtpInputProps {
  /** Number of cells. Default 6. */
  length?: number;
  /** The code, controlled. */
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  /** Fires when the last cell fills. */
  onComplete?: (code: string) => void;
  /** Submits the code with a form, through a hidden input. */
  name?: string;
  /** Id of the first cell. Inside a Field, the group takes the Field's label. */
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** The group's name when not inside a Field. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  "aria-errormessage"?: string;
}

/** One-time-code entry: N cells acting as one field. Paste or SMS autofill fills
 *  every cell, typing advances, Backspace steps back, arrows move, and only the
 *  next cell to fill is in the tab order. */
export function OtpInput({
  length = 6,
  value,
  defaultValue = "",
  onChange,
  onComplete,
  name,
  id,
  disabled,
  autoFocus,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  "aria-errormessage": errorMessage,
}: OtpInputProps) {
  const [inner, setInner] = useState(defaultValue);
  const code = (value ?? inner).replace(/\D/g, "").slice(0, length);
  // handlers read the latest code, not this render's: focus moves before React re-renders
  const latest = useRef(code);
  latest.current = code;
  const cells = useRef<(HTMLInputElement | null)[]>([]);
  const active = otpActiveIndex(code, length);

  const apply = ({ code: next, focus }: OtpStep) => {
    if (next !== latest.current) {
      latest.current = next;
      if (value === undefined) setInner(next);
      onChange?.(next);
      if (next.length === length) onComplete?.(next);
    }
    cells.current[focus]?.focus();
  };

  return (
    <div
      role="group"
      className={cx("ld-otp", className)}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : (labelledBy ?? (id && fieldIds(id).label))}
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            cells.current[i] = el;
          }}
          id={i === 0 ? id : undefined}
          className="ld-input ld-otp__cell"
          value={code[i] ?? ""}
          placeholder=" "
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          tabIndex={i === active ? 0 : -1}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          aria-errormessage={errorMessage}
          onFocus={(e) => {
            const first = otpActiveIndex(latest.current, length);
            if (i > first) cells.current[first]?.focus();
            else e.target.select();
          }}
          onChange={(e) => apply(otpInput(latest.current, i, otpTyped(latest.current[i] ?? "", e.target.value), length))}
          onKeyDown={(e) => {
            if (e.key === "Backspace" || e.key === "Delete") {
              e.preventDefault();
              apply(otpErase(latest.current, i, e.key));
              return;
            }
            const to = otpMove(e.key, i, latest.current, length);
            if (to === null) return;
            e.preventDefault();
            cells.current[to]?.focus();
          }}
        />
      ))}
      {name && <input type="hidden" name={name} value={code} />}
    </div>
  );
}
