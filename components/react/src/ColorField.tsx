import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { contrastGrade, contrastRatio, formatContrast, normalizeHex } from "./color.js";
import { cx } from "./cx.js";
import { SR_ONLY } from "./sr-only.js";

export interface Swatch {
  /** "#rrggbb" (or "#rgb"). */
  value: string;
  /** What a screen reader says for it, and its tooltip: "Ocean blue". */
  name: string;
}

export interface ColorFieldProps {
  /** The group's legend: "Label colour". */
  label: ReactNode;
  /** "#rrggbb". */
  value: string;
  onChange: (hex: string) => void;
  /** Preset colours, as a radio group. */
  swatches?: Swatch[];
  /** The colour the preview checks contrast against. Default: the theme's --ld-surface. */
  against?: string;
  /** Preview text. Default "Aa Sample text". */
  sample?: string;
  className?: string;
}

const GRADE_TEXT = { AAA: "AAA", AA: "AA", "AA large": "Large text only", fail: "Fails" } as const;
const swatch = (hex: string) => ({ "--ld-swatch": hex }) as CSSProperties;

/** Preset swatches, the native colour picker as a swatch button, a hex field that
 *  validates and normalises, and a live preview with its contrast ratio against
 *  the surface it will sit on. */
export function ColorField({ label, value, onChange, swatches, against, sample = "Aa Sample text", className }: ColorFieldProps) {
  const id = useId();
  const ref = useRef<HTMLFieldSetElement>(null);
  const [draft, setDraft] = useState<string>();
  const [surface, setSurface] = useState(against);
  // the theme decides the surface; read it after each render so a theme switch shows
  useEffect(() => {
    const next = against ?? normalizeHex(getComputedStyle(ref.current!).getPropertyValue("--ld-surface"));
    if (next !== surface) setSurface(next);
  });

  const hex = normalizeHex(value) ?? "#000000";
  const invalid = draft !== undefined && !normalizeHex(draft);
  const ratio = surface ? contrastRatio(hex, surface) : undefined;
  const grade = ratio === undefined ? undefined : contrastGrade(ratio);
  const commit = () => {
    if (draft === undefined || invalid) return;
    onChange(normalizeHex(draft)!);
    setDraft(undefined);
  };

  return (
    <fieldset ref={ref} className={cx("ld-color", className)} style={swatch(hex)}>
      <legend className="ld-label" id={`${id}-legend`}>
        {label}
      </legend>
      {swatches && (
        <div className="ld-swatches" role="radiogroup" aria-labelledby={`${id}-legend`}>
          {swatches.map((s) => {
            const v = normalizeHex(s.value) ?? s.value;
            return (
              <label key={v} className="ld-swatch" style={swatch(v)} title={s.name}>
                <input type="radio" className="ld-swatch__input" name={`${id}-swatch`} checked={hex === v} aria-label={s.name} onChange={() => onChange(v)} />
                <span className="ld-swatch__chip" aria-hidden="true" />
              </label>
            );
          })}
        </div>
      )}
      <div className="ld-color__row">
        <label className="ld-color__swatch" title="Pick any colour">
          <input type="color" className="ld-color__picker" value={hex} aria-label="Custom colour" onChange={(e) => onChange(e.target.value)} />
        </label>
        <input
          className="ld-input ld-color__hex"
          aria-label="Hex code"
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-message`}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          value={draft ?? hex}
          onChange={(e) => {
            setDraft(e.target.value);
            // a full six digits is unambiguous: show it at once
            const full = normalizeHex(e.target.value);
            if (full && e.target.value.replace("#", "").trim().length === 6) onChange(full);
          }}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
        />
      </div>
      <p className={cx("ld-field__message", invalid && "ld-field__message--error")} id={`${id}-message`} aria-live="polite">
        {invalid ? "Use a hex code: # and 3 or 6 digits from 0–9 and a–f, like #3366ff." : null}
      </p>
      <div className="ld-color__preview">
        <span className="ld-color__sample">{sample}</span>
        {ratio !== undefined && (
          <span className="ld-color__contrast" data-ld-contrast={grade === "fail" ? "fail" : grade === "AA large" ? "large" : "pass"}>
            {formatContrast(ratio)} {GRADE_TEXT[grade!]}
            <span style={SR_ONLY}> against the surface</span>
          </span>
        )}
      </div>
    </fieldset>
  );
}
