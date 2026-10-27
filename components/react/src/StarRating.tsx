import { useId, useRef } from "react";
import type { CSSProperties } from "react";
import { cx } from "./cx.js";
import { formatRating, ratingLabel, RATING_MAX, starFills } from "./rating.js";

export interface StarRatingProps {
  /** Input: the chosen stars, 0 for none. Read-only: the average, e.g. 4.3. */
  value: number;
  /** Makes it an input, a radio group. Without it the rating is read-only. */
  onChange?: (value: number) => void;
  /** Read-only: how many ratings the average is from, shown as "(128)". */
  count?: number;
  max?: number;
  /** Input: the group's visible legend ("Rate this guide"). Read-only: replaces
   *  the accessible name ("4.3 out of 5 stars, 128 ratings"). */
  label?: string;
  name?: string;
  /** Input: a Clear button once rated. */
  clearable?: boolean;
  clearLabel?: string;
  className?: string;
}

const fill = (f: number) => ({ "--ld-fill": f }) as CSSProperties;
const glyph = <span className="ld-rating__glyph" aria-hidden="true" />;

/** Five stars. As an input it is a native radio group: one tab stop, arrow keys
 *  choose, a hover preview where hover is real. Read-only it fills to the exact
 *  average and prints it with the count, so colour never carries the value alone. */
export function StarRating({ value, onChange, count, max = RATING_MAX, label, name, clearable = true, clearLabel = "Clear", className }: StarRatingProps) {
  const auto = useId();
  const options = useRef<HTMLSpanElement>(null);

  if (!onChange) {
    return (
      <span className={cx("ld-rating ld-rating--display", className)} role="img" aria-label={label ?? ratingLabel(value, max, count)}>
        <span className="ld-rating__stars">
          {starFills(count === 0 ? 0 : value, max).map((f, i) => (
            <span key={i} className="ld-rating__glyph" style={fill(f)} />
          ))}
        </span>
        <span className="ld-rating__value">{count === 0 ? "No ratings" : formatRating(value, max)}</span>
        {!!count && <span className="ld-rating__count">({count.toLocaleString()})</span>}
      </span>
    );
  }

  const clear = () => {
    onChange(0);
    options.current?.querySelector("input")?.focus(); // the button is about to go
  };
  return (
    <fieldset className={cx("ld-rating", className)}>
      {label && <legend className="ld-label ld-rating__legend">{label}</legend>}
      <span className="ld-rating__options" ref={options}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <label key={n} className="ld-rating__option">
            <input
              type="radio"
              className="ld-rating__input"
              name={name ?? auto}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            />
            {glyph}
          </label>
        ))}
      </span>
      <span className="ld-rating__value" aria-hidden="true">
        {value ? `${value} of ${max}` : "Not rated"}
      </span>
      {clearable && value > 0 && (
        <button type="button" className="ld-btn ld-btn--sm ld-rating__clear" onClick={clear}>
          {clearLabel}
        </button>
      )}
    </fieldset>
  );
}
