import { useRef } from "react";
import type { ReactNode } from "react";
import { BulkActionBar } from "./BulkActionBar.js";
import { DataState, type QueryLike } from "./DataState.js";
import { EmptyState } from "./EmptyState.js";
import { Page } from "./Page.js";
import { Link, navigate } from "./Router.js";
import { isPlainClick } from "./routing.js";
import { SR_ONLY } from "./sr-only.js";
import { Table, TableRow } from "./Table.js";
import { TableSelectAll, TableSelectCell } from "./TableCells.js";
import { useRowSelection } from "./useRowSelection.js";
import { useViewActions, type ViewAction } from "./view-action.js";

export interface ListColumn<T> {
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Numbers: right-aligned on tabular figures (.ld-num). */
  numeric?: boolean;
}

export interface ListViewProps<T> {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Header buttons: "New book". */
  actions?: ReactNode;
  /** Any `{ data, error, isPending }` whose data is the rows: a react-query result. */
  query: QueryLike<readonly T[]>;
  columns: ListColumn<T>[];
  /** The row's id: React key and selection id. Default `String(row.id)`. */
  rowKey?: (row: T) => string;
  /** Names the row in "Select …" and action buttons. Default the first column's text, else the key. */
  rowLabel?: (row: T) => string;
  /** Where the row leads: the first cell becomes a link to it and a click anywhere on the row follows it. */
  rowHref?: (row: T) => string;
  /** Small buttons in the last column, each with its confirm, busy state and error toast. */
  rowActions?: ViewAction<T>[];
  /** Actions on the selected rows. Turns on the checkbox column and the bulk bar; the
   *  selection clears when one succeeds. */
  bulkActions?: ViewAction<T[]>[];
  /** Shown when there are no rows; a string becomes an EmptyState title. */
  empty?: ReactNode;
}

const idOf = (row: unknown) => String((row as { id?: unknown }).id);

/** A page listing rows in a table: loading, error and empty states, row links, row
 *  actions and bulk actions. The app gives data and actions; the view owns the interaction. */
export function ListView<T>({
  title,
  subtitle,
  actions,
  query,
  columns,
  rowKey = idOf,
  rowLabel,
  rowHref,
  rowActions = [],
  bulkActions = [],
  empty,
}: ListViewProps<T>) {
  const rows = query.data ?? [];
  const selection = useRowSelection(rows.map(rowKey));
  const selectAll = useRef<HTMLInputElement>(null);
  const act = useViewActions();
  const selectable = bulkActions.length > 0;
  const chosen = rows.filter((r) => selection.has(rowKey(r))); // ids gone from the data drop out
  const name = (row: T) => {
    if (rowLabel) return rowLabel(row);
    const first = columns[0]?.cell(row);
    return typeof first === "string" || typeof first === "number" ? String(first) : rowKey(row);
  };
  const num = (c: ListColumn<T>) => (c.numeric ? "ld-num" : undefined);

  return (
    <Page title={title} subtitle={subtitle} actions={actions}>
      <DataState query={query} empty={typeof empty === "string" ? <EmptyState title={empty} /> : empty}>
        {(rows) => (
          <>
            <div className="ld-table-scroll">
              <Table interactive={rowHref !== undefined}>
                <thead>
                  <tr>
                    {selectable && (
                      <TableSelectAll state={selection.pageState} onToggle={selection.togglePage} inputRef={selectAll} />
                    )}
                    {columns.map((c, i) => (
                      <th key={i} scope="col" className={num(c)}>
                        {c.header}
                      </th>
                    ))}
                    {rowActions.length > 0 && (
                      <th scope="col">
                        <span style={SR_ONLY}>Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const id = rowKey(row);
                    const href = rowHref?.(row);
                    return (
                      <TableRow
                        key={id}
                        selected={selectable ? selection.has(id) : undefined}
                        onActivate={href === undefined ? undefined : (e) => "button" in e && isPlainClick(e) && navigate(href)}
                        tabIndex={href === undefined ? undefined : -1} // the link is the keyboard path: one tab stop per row
                      >
                        {selectable && (
                          <TableSelectCell
                            checked={selection.has(id)}
                            label={`Select ${name(row)}`}
                            onToggle={(shift) => selection.toggle(id, shift)}
                          />
                        )}
                        {columns.map((c, i) => (
                          <td key={i} className={num(c)}>
                            {i === 0 && href !== undefined ? <Link to={href}>{c.cell(row)}</Link> : c.cell(row)}
                          </td>
                        ))}
                        {rowActions.length > 0 && (
                          <td>
                            <div className="ld-page__actions">
                              {rowActions.map((a, i) =>
                                act.button(a, row, `${id}\0${i}`, { size: "sm", "aria-label": `${a.label} ${name(row)}` }),
                              )}
                            </div>
                          </td>
                        )}
                      </TableRow>
                    );
                  })}
                </tbody>
              </Table>
            </div>
            {selectable && (
              <BulkActionBar count={chosen.length} onClear={selection.clear} returnFocusRef={selectAll}>
                {bulkActions.map((a, i) =>
                  act.button(
                    {
                      ...a,
                      run: async (rs: T[]) => {
                        await a.run(rs);
                        selection.clear();
                      },
                    },
                    chosen,
                    `\0bulk${i}`,
                    { size: "sm" },
                  ),
                )}
              </BulkActionBar>
            )}
          </>
        )}
      </DataState>
      {act.dialog}
    </Page>
  );
}
