import { useLayoutEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode, RefObject } from "react";
import { cx } from "./cx.js";
import { SR_ONLY } from "./sr-only.js";

export interface BulkActionBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Selected rows. The bar shows while this is above 0. */
  count: number;
  /** Rows matching the current filters, on every page. With `onSelectAll`, the bar
   *  offers "Select all {total} matching" while fewer are selected. */
  total?: number;
  onSelectAll?: () => void;
  onClear: () => void;
  /** The edge it sticks to. Put it after the table for "bottom", before it for "top". */
  position?: "bottom" | "top";
  /** Where focus goes when the bar hides with focus inside it (Clear, or an action
   *  that empties the selection): usually the select-all checkbox. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Region name. Default "Bulk actions". */
  label?: string;
  /** Count text. Default "3 selected" / "All 312 selected". */
  countLabel?: (count: number, total?: number) => string;
  clearLabel?: string;
  /** Action buttons (`Button size="sm"`). Put destructive ones last. */
  children?: ReactNode;
}

const defaultCount = (n: number, total?: number) => (total !== undefined && n >= total && n > 1 ? `All ${total} selected` : `${n} selected`);

/** Actions for the selected rows. It sticks to the bottom (or top) edge on
 *  `--ld-z-sticky` but stays in the flow, so it reserves its own space and never
 *  covers the last row; the page's scroll padding keeps focused rows clear of it.
 *  The count is announced politely from a region that is always mounted. */
export function BulkActionBar({
  count,
  total,
  onSelectAll,
  onClear,
  position = "bottom",
  returnFocusRef,
  label = "Bulk actions",
  countLabel = defaultCount,
  clearLabel = "Clear",
  className,
  children,
  ...rest
}: BulkActionBarProps) {
  const bar = useRef<HTMLDivElement>(null);
  const clear = useRef<HTMLButtonElement>(null);
  const hadFocus = useRef(false);
  const text = countLabel(count, total);

  // Before a render hides the bar or drops the focused button ("Select all" once all
  // are selected), note whether focus was inside, then move it somewhere real.
  if (typeof document !== "undefined") hadFocus.current = !!bar.current?.contains(document.activeElement);
  useLayoutEffect(() => {
    if (!hadFocus.current) return;
    if (count === 0) returnFocusRef?.current?.focus(); // a hidden button can still be activeElement
    else if (!bar.current?.contains(document.activeElement)) clear.current?.focus();
  }, [count, total, returnFocusRef]);

  return (
    <>
      <div role="status" style={SR_ONLY}>
        {count > 0 ? text : ""}
      </div>
      <div
        ref={bar}
        role="region"
        aria-label={label}
        hidden={count === 0}
        className={cx("ld-bulk-bar", position === "top" && "ld-bulk-bar--top", className)}
        {...rest}
      >
        <span className="ld-bulk-bar__count">{text}</span>
        <div className="ld-bulk-bar__actions">{children}</div>
        {onSelectAll && total !== undefined && count < total && (
          <button type="button" className="ld-btn ld-btn--sm ld-bulk-bar__all" onClick={onSelectAll}>
            Select all {total} matching
          </button>
        )}
        <button ref={clear} type="button" className="ld-btn ld-btn--sm ld-bulk-bar__clear" onClick={onClear}>
          {clearLabel}
        </button>
      </div>
    </>
  );
}
