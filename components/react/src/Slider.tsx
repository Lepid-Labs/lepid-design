import { useId, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cx } from "./cx.js";
import { clampRange, rangeFraction, rangeTopThumb, snapToStep, type RangeBounds } from "./range.js";

interface SliderBase {
  min?: number;
  max?: number;
  /** Native step snapping; the number box snaps to it too. Default 1. */
  step?: number;
  /** Tick marks under the track: true for one per step, or the values to mark. */
  ticks?: boolean | number[];
  /** Labels under the track, at least the two ends: [{ value: 0, label: "$0" }]. */
  marks?: { value: number; label: ReactNode }[];
  /** A number box beside it for the exact value a finger cannot hit. */
  input?: boolean;
  /** How a value reads in the bubble and to screen readers: (v) => `${v}%`. */
  format?: (value: number) => string;
  hint?: ReactNode;
  disabled?: boolean;
  name?: string;
  className?: string;
}

export interface SliderProps extends SliderBase {
  label: ReactNode;
  value: number;
  onChange: (value: number) => void;
  id?: string;
}

export interface RangeSliderProps extends SliderBase {
  /** The group's legend: "Price". */
  label: ReactNode;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  /** Each thumb's name. Default ["Minimum", "Maximum"]. */
  thumbLabels?: [string, string];
  /** The least the two values may differ by. Default 0 (they may meet). */
  gap?: number;
}

const at = (f: number) => ({ "--ld-at": f }) as CSSProperties;

/** Ticks, labels and the hint shared by both sliders. */
function Scale({ bounds, ticks, marks }: { bounds: Required<RangeBounds>; ticks: SliderBase["ticks"]; marks: SliderBase["marks"] }) {
  const { min, max, step } = bounds;
  const values = ticks === true ? Array.from({ length: Math.floor((max - min) / step + 1e-9) + 1 }, (_, i) => min + i * step) : ticks || [];
  return (
    <>
      {values.length > 0 && (
        <span className="ld-slider__ticks" aria-hidden="true">
          {values.map((v) => <span key={v} className="ld-slider__tick" style={at(rangeFraction(v, min, max))} />)}
        </span>
      )}
      {marks && (
        <span className="ld-slider__marks" aria-hidden="true">
          {marks.map((m) => (
            <span key={m.value} className="ld-slider__mark" style={at(rangeFraction(m.value, min, max))}>
              {m.label}
            </span>
          ))}
        </span>
      )}
    </>
  );
}

/** The exact-entry box: typing commits as soon as the number is valid; leaving the
 *  box (or Enter) snaps whatever is left to a step inside the bounds. */
function NumberBox({ value, bounds, onCommit, labelledBy, disabled }: { value: number; bounds: Required<RangeBounds>; onCommit: (v: number) => void; labelledBy: string; disabled?: boolean }) {
  const [draft, setDraft] = useState<string>();
  const commit = () => {
    if (draft === undefined) return;
    onCommit(snapToStep(draft.trim() === "" ? value : Number(draft), bounds));
    setDraft(undefined);
  };
  return (
    <input
      type="number"
      className="ld-input ld-slider__input"
      aria-labelledby={labelledBy}
      min={bounds.min}
      max={bounds.max}
      step={bounds.step}
      disabled={disabled}
      value={draft ?? value}
      onChange={(e) => {
        setDraft(e.target.value);
        if (e.target.value !== "" && e.target.validity.valid) onCommit(Number(e.target.value));
      }}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}

/** A native range input with a filled track, a value bubble over the thumb, optional
 *  ticks and labels, and an optional number box for exact entry. The browser does
 *  the dragging, the step snapping and the keys (arrows, Page Up/Down, Home, End). */
export function Slider({ label, value, onChange, min = 0, max = 100, step = 1, ticks, marks, input, format = String, hint, disabled, name, id, className }: SliderProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const labelId = `${inputId}-label`;
  const bounds = { min, max, step };
  const f = rangeFraction(value, min, max);
  return (
    <div className={cx("ld-slider", className)} style={{ "--ld-range-fill": f } as CSSProperties}>
      <div className="ld-slider__header">
        <label className="ld-label" id={labelId} htmlFor={inputId}>
          {label}
        </label>
        {input && <NumberBox value={value} bounds={bounds} onCommit={onChange} labelledBy={labelId} disabled={disabled} />}
      </div>
      <div className="ld-slider__track">
        <output className="ld-slider__bubble" htmlFor={inputId} aria-hidden="true" style={at(f)}>
          {format(value)}
        </output>
        <input
          type="range"
          className="ld-range"
          id={inputId}
          name={name}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuetext={format === String ? undefined : format(value)}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <Scale bounds={bounds} ticks={ticks} marks={marks} />
      </div>
      {hint && <p className="ld-field__hint" id={`${inputId}-hint`}>{hint}</p>}
    </div>
  );
}

/** Two thumbs on one track for a min–max filter: two native range inputs laid over
 *  each other, so each keeps its own keys and name. The thumbs never cross
 *  (clampRange); the band between them fills. */
export function RangeSlider({ label, value, onChange, min = 0, max = 100, step = 1, gap = 0, thumbLabels = ["Minimum", "Maximum"], ticks, marks, input, format = String, hint, disabled, name, className }: RangeSliderProps) {
  const id = useId();
  const bounds = { min, max, step };
  const fr = value.map((v) => rangeFraction(v, min, max));
  const top = rangeTopThumb(value, min, max);
  const set = (thumb: 0 | 1, v: number) => onChange(clampRange(value, thumb, v, bounds, gap));
  return (
    <fieldset
      className={cx("ld-slider ld-slider--range", className)}
      style={{ "--ld-range-lo": fr[0], "--ld-range-hi": fr[1] } as CSSProperties}
      disabled={disabled}
      aria-describedby={hint ? `${id}-hint` : undefined}
    >
      <legend className="ld-label">{label}</legend>
      {input && (
        <div className="ld-slider__header">
          {([0, 1] as const).map((t) => (
            <label key={t} className="ld-slider__pair">
              <span className="ld-slider__pair-label" id={`${id}-${t}`}>{thumbLabels[t]}</span>
              <NumberBox value={value[t]} bounds={bounds} onCommit={(v) => set(t, v)} labelledBy={`${id}-${t}`} disabled={disabled} />
            </label>
          ))}
        </div>
      )}
      <div className="ld-slider__track">
        {([0, 1] as const).map((t) => (
          <output key={`b${t}`} className="ld-slider__bubble" aria-hidden="true" style={at(fr[t])}>
            {format(value[t])}
          </output>
        ))}
        {([0, 1] as const).map((t) => (
          <input
            key={t}
            type="range"
            className="ld-range"
            name={name && `${name}-${t === 0 ? "min" : "max"}`}
            min={min}
            max={max}
            step={step}
            value={value[t]}
            aria-label={thumbLabels[t]}
            aria-valuetext={format === String ? undefined : format(value[t])}
            data-ld-top={top === t || undefined}
            onChange={(e) => set(t, Number(e.target.value))}
          />
        ))}
        <Scale bounds={bounds} ticks={ticks} marks={marks} />
      </div>
      {hint && <p className="ld-field__hint" id={`${id}-hint`}>{hint}</p>}
    </fieldset>
  );
}
