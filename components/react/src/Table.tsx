import type { HTMLAttributes, KeyboardEvent, MouseEvent, TableHTMLAttributes } from "react";
import { isRowActivationClick, isRowActivationKey, ROW_NESTED_CONTROLS, tableAttrs, tableRowAttrs } from "./table-state.js";

export type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  /** Clickable rows: pointer cursor, focus ring, selected state. Maps to .ld-table--interactive. */
  interactive?: boolean;
  /** Row height: `compact` (.ld-table--compact) or `comfortable` (.ld-table--comfortable, zebra stripes). */
  density?: "compact" | "comfortable";
  /** Keep the header row in view (.ld-table--sticky, on --ld-z-sticky). It sticks to the nearest
   *  scroll container: the page, or a `.ld-table-scroll` wrapper given a max height. */
  stickyHeader?: boolean;
};

/** Styled `<table>`. Compose with native thead/tbody/th/td; use TableRow for clickable body rows,
 *  SortHeader for sortable columns, and TableSelectAll / TableSelectCell for row selection. */
export function Table({ interactive, density, stickyHeader, className, ...rest }: TableProps) {
  return <table {...tableAttrs({ interactive, density, stickyHeader, className })} {...rest} />;
}

export type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  /** Row activation from a click or Enter/Space. Makes the row focusable. Clicks on
   *  nested controls (links, buttons, inputs) and text selections don't activate. */
  onActivate?: (event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) => void;
  /** Lit selected state (`aria-selected`). Omit for rows that can't be selected. */
  selected?: boolean;
};

/** Body row. With `onActivate` it is keyboard-operable; pair it with `<Table interactive>`
 *  so the theme shows the pointer and focus ring. */
export function TableRow({ onActivate, selected, onClick, onKeyDown, ...rest }: TableRowProps) {
  if (!onActivate) return <tr {...tableRowAttrs({ selected })} onClick={onClick} onKeyDown={onKeyDown} {...rest} />;

  function handleClick(e: MouseEvent<HTMLTableRowElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    const hit = (e.target as Element).closest(ROW_NESTED_CONTROLS);
    const nested = hit !== null && hit !== e.currentTarget && e.currentTarget.contains(hit);
    if (isRowActivationClick(nested, window.getSelection()?.toString() ?? "")) onActivate!(e);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented || !isRowActivationKey(e.key, e.target === e.currentTarget)) return;
    e.preventDefault(); // Space would scroll the page
    onActivate!(e);
  }

  return (
    <tr
      {...tableRowAttrs({ activatable: true, selected })}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
}
