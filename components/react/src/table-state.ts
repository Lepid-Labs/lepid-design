// Pure attribute and activation logic behind Table / TableRow, kept DOM-free
// so it can be tested under node:test without a renderer (so it imports
// nothing — Node runs the .ts source and cannot resolve .js specifiers).

/** Descendants that own their own click/keys; a row never double-fires for them. */
export const ROW_NESTED_CONTROLS =
  'a[href], button, input, select, textarea, summary, label, [role="button"], [role="link"], [contenteditable="true"]';

export interface TableOptions {
  /** Rows are clickable: pointer cursor, focus ring, selected state. */
  interactive?: boolean;
  className?: string;
}

/** Class list for the `<table>`. */
export function tableAttrs({ interactive, className }: TableOptions): { className: string } {
  return {
    className: ["ld-table", interactive && "ld-table--interactive", className].filter(Boolean).join(" "),
  };
}

export interface TableRowOptions {
  /** The row has an activation handler, so it joins the tab order. */
  activatable?: boolean;
  /** Selected state; omitted leaves aria-selected off entirely. */
  selected?: boolean;
}

export interface TableRowAttrs {
  tabIndex?: 0;
  "aria-selected"?: boolean;
}

/** Focus and selection ARIA for a body row. */
export function tableRowAttrs({ activatable, selected }: TableRowOptions): TableRowAttrs {
  const attrs: TableRowAttrs = {};
  if (activatable) attrs.tabIndex = 0;
  if (selected !== undefined) attrs["aria-selected"] = selected;
  return attrs;
}

/** Enter or Space on the focused row itself (not a control inside it) activates it. */
export function isRowActivationKey(key: string, fromRow: boolean): boolean {
  return fromRow && (key === "Enter" || key === " ");
}

/** A click activates the row unless it landed on a nested control (`hit` is the
 *  closest ROW_NESTED_CONTROLS match inside the row) or finished a text selection. */
export function isRowActivationClick(hitNestedControl: boolean, selectedText: string): boolean {
  return !hitNestedControl && selectedText === "";
}
