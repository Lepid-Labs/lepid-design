import { useLayoutEffect, useRef } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, MouseEvent, ReactNode } from "react";
import { cx } from "./cx.js";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** On or off (`aria-pressed`). The pressed chip fills and shows a check, so the
   *  state never rests on colour alone. */
  pressed: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

/** A toggle filter chip (`.ld-chip`). */
export function Chip({ pressed, onPressedChange, onClick, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      className={cx("ld-chip", className)}
      aria-pressed={pressed}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onPressedChange?.(!pressed);
      }}
      {...rest}
    />
  );
}

export interface FilterChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** The applied filter, as the user would say it: "Status: failed". */
  children: ReactNode;
  onRemove: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Name of the remove button: "Remove Status: failed". */
  removeLabel: string;
}

const cross = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
    <path d="M5 5l6 6M11 5l-6 6" />
  </svg>
);

/** An applied filter with a remove button (`.ld-chip--removable`). */
export function FilterChip({ children, onRemove, removeLabel, className, ...rest }: FilterChipProps) {
  return (
    <span className={cx("ld-chip", "ld-chip--removable", className)} {...rest}>
      <span className="ld-chip__label">{children}</span>
      <button type="button" className="ld-chip__remove" aria-label={removeLabel} title={removeLabel} onClick={onRemove}>
        {cross}
      </button>
    </span>
  );
}

export interface ChipGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Group name: "Status", "Applied filters". */
  label: string;
  /** Results the filters leave, announced politely as it changes ("12 results").
   *  Pass it from the first render so the live region exists before it changes. */
  count?: number;
  countLabel?: (count: number) => string;
  /** Shows a "Clear all" button. */
  onClearAll?: () => void;
  clearLabel?: string;
  /** One horizontally scrolling row (with an edge fade) instead of wrapping. */
  scroll?: boolean;
  children?: ReactNode;
}

const results = (n: number) => `${n.toLocaleString()} ${n === 1 ? "result" : "results"}`;

/** A labelled row of chips with the live result count and "Clear all". When a
 *  FilterChip's remove button takes focus with it, focus moves to the next remove
 *  button (or the previous, then "Clear all") instead of falling to the page. */
export function ChipGroup({ label, count, countLabel = results, onClearAll, clearLabel = "Clear all", scroll, className, children, ...rest }: ChipGroupProps) {
  const group = useRef<HTMLDivElement>(null);
  const removed = useRef<number | null>(null);

  useLayoutEffect(() => {
    const at = removed.current;
    removed.current = null;
    const el = group.current;
    if (at === null || !el || el.contains(document.activeElement)) return;
    const buttons = [...el.querySelectorAll<HTMLElement>(".ld-chip__remove, .ld-chip-group__clear")];
    (buttons[Math.min(at, buttons.length - 1)] ?? el.querySelector<HTMLElement>(".ld-chip"))?.focus();
  });

  return (
    <div
      ref={group}
      role="group"
      aria-label={label}
      className={cx("ld-chip-group", scroll && "ld-chip-group--scroll", className)}
      onClickCapture={(e) => {
        const hit = (e.target as Element).closest(".ld-chip__remove");
        if (hit) removed.current = [...e.currentTarget.querySelectorAll(".ld-chip__remove")].indexOf(hit);
      }}
      {...rest}
    >
      <div className="ld-chip-group__chips">{children}</div>
      {count !== undefined && (
        <span role="status" className="ld-chip-group__count">
          {countLabel(count)}
        </span>
      )}
      {onClearAll && (
        <button type="button" className="ld-btn ld-btn--sm ld-chip-group__clear" onClick={onClearAll}>
          {clearLabel}
        </button>
      )}
    </div>
  );
}
