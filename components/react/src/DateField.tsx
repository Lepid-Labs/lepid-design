import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { Chip } from "./Chip.js";
import { cx } from "./cx.js";
import { DATE_PRESETS, dateInRange, isoToTyped, localISODate, presetValue, typedToISO, type DateOrder, type DatePreset } from "./date-presets.js";
import { fieldControlAttrs, fieldIds } from "./field-state.js";
import { MaskedInput } from "./MaskedInput.js";
import { MASKS } from "./mask.js";

export interface DateFieldProps {
  label: ReactNode;
  /** "YYYY-MM-DD" ("YYYY-MM-DDTHH:mm" for datetime-local), "" for none. */
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "datetime-local";
  /** Inclusive bounds, in the value's format. Presets outside them are disabled. */
  min?: string;
  max?: string;
  /** One-click chips. Default Today, Tomorrow, Next week; [] for none. */
  presets?: DatePreset[];
  /** Typed entry (a masked text field) instead of the native picker, for dates people
   *  know by heart, like a birthday. Date only. */
  typed?: boolean;
  /** Typed entry order: "mdy" (03/15/2026, default) or "dmy" (15/03/2026). */
  order?: DateOrder;
  /** Today, for the presets; default the reader's local date. */
  today?: string;
  hint?: ReactNode;
  /** An error of your own; wins over the built-in range and typed-date errors. */
  error?: ReactNode;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_PRESETS = [DATE_PRESETS.today, DATE_PRESETS.tomorrow, DATE_PRESETS.nextWeek];
const readable = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });

/** The native date (or date-and-time) input, led by preset chips for the dates
 *  people pick most, with min/max and a typed-entry mode. The browser's own picker
 *  brings the calendar, the keyboard, the locale and the phone's wheel. */
export function DateField({
  label, value, onChange, type = "date", min, max, presets = DEFAULT_PRESETS, typed = false, order = "mdy",
  today = localISODate(), hint, error, id, name, required, disabled, className,
}: DateFieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const ids = fieldIds(inputId);
  const [digits, setDigits] = useState(() => isoToTyped(value, order));
  // a preset or the app changed the date: show it in the typed field
  useEffect(() => {
    if (typed && (typedToISO(digits, order) ?? "") !== value.slice(0, 10)) setDigits(isoToTyped(value, order));
  }, [value]);

  const day = value.slice(0, 10);
  const [lo, hi] = [min?.slice(0, 10), max?.slice(0, 10)];
  const builtIn =
    typed && digits.length === 8 && !typedToISO(digits, order)
      ? `Enter a real date, like ${order === "mdy" ? "03/15" : "15/03"}/${today.slice(0, 4)}.`
      : day && !dateInRange(day, lo, hi)
        ? lo && day < lo
          ? `Pick ${readable(lo)} or later.`
          : `Pick ${readable(hi!)} or earlier.`
        : undefined;
  const shown = error ?? builtIn;
  const attrs = fieldControlAttrs({ id: inputId, hasHint: !!hint, hasError: !!shown });

  return (
    <div className={cx("ld-field ld-date", className)}>
      <label className="ld-label" id={ids.label} htmlFor={inputId}>
        {label}
      </label>
      {presets.length > 0 && (
        <div className="ld-date__presets" role="group" aria-labelledby={ids.label}>
          {presets.map((p) => {
            const date = p.resolve(today);
            return (
              <Chip key={p.label} pressed={day === date} disabled={disabled || !dateInRange(date, lo, hi)} onClick={() => onChange(presetValue(date, type, value))}>
                {p.label}
              </Chip>
            );
          })}
        </div>
      )}
      {typed ? (
        <MaskedInput
          {...attrs}
          className="ld-date__input"
          mask={MASKS.date}
          value={digits}
          name={name}
          required={required}
          disabled={disabled}
          placeholder={order === "mdy" ? "MM/DD/YYYY" : "DD/MM/YYYY"}
          onValueChange={(raw) => {
            setDigits(raw);
            const iso = typedToISO(raw, order);
            if (iso || raw === "") onChange(iso ?? "");
          }}
        />
      ) : (
        <input
          {...attrs}
          type={type}
          className="ld-input ld-date__input"
          value={value}
          min={min}
          max={max}
          name={name}
          required={required}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && (
        <p className="ld-field__hint" id={ids.hint}>
          {hint}
        </p>
      )}
      <p className={cx("ld-field__message", !!shown && "ld-field__message--error")} id={ids.message} aria-live="polite">
        {shown}
      </p>
    </div>
  );
}
