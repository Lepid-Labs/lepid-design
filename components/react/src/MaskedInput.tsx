import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cx } from "./cx.js";
import { applyMask, maskDeleteCaret } from "./mask.js";

export interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> {
  /** "9" a digit, "a" a letter, "*" either; anything else is a literal. See MASKS. */
  mask: string;
  /** The raw value (data characters only), controlled. */
  value?: string;
  /** The initial raw value, uncontrolled. */
  defaultValue?: string;
  /** After every edit: the raw value to store, and what the field shows. */
  onValueChange?: (raw: string, formatted: string) => void;
}

/** Text input that formats as you type (card groups, phone, expiry, date) without
 *  moving the caret off the character just typed. `name` submits the raw value
 *  through a hidden input; the visible field carries no name. */
export function MaskedInput({ mask, value, defaultValue = "", onValueChange, name, className, inputMode, onKeyDown, ...rest }: MaskedInputProps) {
  const [inner, setInner] = useState(() => applyMask(defaultValue, mask).value);
  const shown = value !== undefined ? applyMask(value, mask).value : inner;
  return (
    <>
      <input
        {...rest}
        className={cx("ld-input", className)}
        inputMode={inputMode ?? (/[a*]/.test(mask) ? undefined : "numeric")}
        value={shown}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          const el = e.currentTarget;
          if ((e.key === "Backspace" || e.key === "Delete") && el.selectionStart === el.selectionEnd) {
            const caret = maskDeleteCaret(el.value, mask, el.selectionStart ?? 0, e.key);
            el.setSelectionRange(caret, caret);
          }
        }}
        onChange={(e) => {
          const el = e.target;
          const next = applyMask(el.value, mask, el.selectionStart ?? el.value.length);
          // write the formatted text and caret now: React then finds nothing to change
          // and leaves the caret alone, even when the edit was rejected outright
          el.value = next.value;
          if (document.activeElement === el) el.setSelectionRange(next.caret, next.caret);
          if (value === undefined) setInner(next.value);
          onValueChange?.(next.raw, next.value);
        }}
      />
      {name && <input type="hidden" name={name} value={applyMask(shown, mask).raw} />}
    </>
  );
}
