import { useEffect, useRef } from "react";
import type { MouseEvent, ReactNode, RefObject, ThHTMLAttributes } from "react";
import { cx } from "./cx.js";
import { Skeleton } from "./Skeleton.js";
import { ariaSort, nextSort, type PageSelection, type SortState } from "./table-rows.js";

export interface SortHeaderProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** The sort key this column sorts by. */
  column: string;
  /** The table's current sort (one column at a time). */
  sort: SortState | null;
  /** Called with the next sort: ascending, then descending, then null (original order). */
  onSortChange: (next: SortState | null) => void;
  /** Numbers: right-aligned with tabular figures (.ld-num). */
  numeric?: boolean;
}

const sortIcon = (
  <svg className="ld-table__sort-icon" viewBox="0 0 12 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path className="ld-table__sort-asc" d="M3 6.5 6 3.5l3 3" />
    <path className="ld-table__sort-desc" d="M3 9.5l3 3 3-3" />
  </svg>
);

/** Column header that sorts (APG sortable table): a button inside the `th`, which
 *  carries `aria-sort` while it is the sorted column. The icon shows both arrows
 *  dimmed while unsorted, so sortable columns read as sortable without a hover. */
export function SortHeader({ column, sort, onSortChange, numeric, className, children, ...rest }: SortHeaderProps) {
  return (
    <th scope="col" aria-sort={ariaSort(sort, column)} className={cx(numeric && "ld-num", className)} {...rest}>
      <button type="button" className="ld-table__sort" onClick={() => onSortChange(nextSort(sort, column))}>
        {children}
        {sortIcon}
      </button>
    </th>
  );
}

export interface TableSelectAllProps {
  /** From `pageSelection` / `useRowSelection().pageState`: unchecked, indeterminate or checked. */
  state: PageSelection;
  onToggle: () => void;
  /** Accessible name. Default "Select all rows on this page". */
  label?: string;
  /** The checkbox, for returning focus to it (BulkActionBar `returnFocusRef`). */
  inputRef?: RefObject<HTMLInputElement | null>;
}

/** Header cell with the select-all checkbox for the current page. */
export function TableSelectAll({ state, onToggle, label = "Select all rows on this page", inputRef }: TableSelectAllProps) {
  const own = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? own;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [ref, state]);
  return (
    <th scope="col" className="ld-table__select">
      <label className="ld-table__select-hit">
        <input ref={ref} type="checkbox" className="ld-checkbox" aria-label={label} checked={state === "all"} onChange={onToggle} />
      </label>
    </th>
  );
}

export interface TableSelectCellProps {
  checked: boolean;
  /** `shift` is true for a Shift+click or Shift+Space: select the range from the last press. */
  onToggle: (shift: boolean) => void;
  /** Accessible name naming the row: "Select deploy-web". */
  label: string;
}

const keep = () => {}; // the state changes in onClick, which carries shiftKey

/** Body cell with a row's checkbox. The whole cell is the hit area, and it is a
 *  nested control, so a press here never activates an interactive row. Pair it
 *  with `<TableRow selected>` so the row shows (and exposes) its selected state. */
export function TableSelectCell({ checked, onToggle, label }: TableSelectCellProps) {
  return (
    <td className="ld-table__select">
      <label className="ld-table__select-hit">
        <input
          type="checkbox"
          className="ld-checkbox"
          aria-label={label}
          checked={checked}
          onChange={keep}
          onClick={(e: MouseEvent<HTMLInputElement>) => onToggle(e.shiftKey)}
        />
      </label>
    </td>
  );
}

export interface TableSkeletonRowsProps {
  rows?: number;
  columns: number;
  /** The first column is the checkbox column: it gets a square instead of a line. */
  selectColumn?: boolean;
}

/** Placeholder rows while the first page loads. Hidden from assistive tech: put
 *  `aria-busy="true"` on the table instead. */
export function TableSkeletonRows({ rows = 5, columns, selectColumn }: TableSkeletonRowsProps): ReactNode {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} aria-hidden="true" className="ld-table__skeleton-row">
      {Array.from({ length: columns }, (_, c) =>
        selectColumn && c === 0 ? (
          <td key={c} className="ld-table__select">
            <Skeleton variant="block" width="1.1rem" height="1.1rem" />
          </td>
        ) : (
          <td key={c}>
            <Skeleton width={`${50 + ((r * 7 + c * 13) % 40)}%`} />
          </td>
        ),
      )}
    </tr>
  ));
}
