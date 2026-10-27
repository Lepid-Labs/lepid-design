import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "./cx.js";
import { moveCard, type SortPosition } from "./reorder.js";
import { createSortable } from "./sortable-dom.js";
import { SR_ONLY } from "./sr-only.js";

export interface SortableColumn<T> {
  id: string;
  /** Shown over the column and named in announcements: "Done". */
  title: string;
  items: T[];
}

export interface SortMove<T> {
  item: T;
  from: SortPosition;
  to: SortPosition;
}

interface SortableBase<T> {
  getKey: (item: T) => string;
  /** The item's name in the handle ("Move Task A") and in announcements. */
  getLabel: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
}

export interface SortableListProps<T> extends SortableBase<T> {
  items: T[];
  /** The list after a drop. The moved item is the same object: its state moved with it. */
  onReorder: (items: T[], move: SortMove<T>) => void;
  /** The list's accessible name: "Priorities". */
  label: string;
}

export interface SortableBoardProps<T> extends SortableBase<T> {
  columns: SortableColumn<T>[];
  /** The columns after a drop; untouched columns keep their identity. */
  onMove: (columns: SortableColumn<T>[], move: SortMove<T>) => void;
}

const grip = (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    {[4, 8, 12].flatMap((y) => [6, 10].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r={1.25} />))}
  </svg>
);

/** The controller, a keyboard preview, the instructions and the live region. */
function useSortable<T>(columns: SortableColumn<T>[], onMove: SortableBoardProps<T>["onMove"]) {
  const root = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const [preview, setPreview] = useState<{ from: SortPosition; to: SortPosition }>();
  const latest = useRef({ columns, onMove });
  latest.current = { columns, onMove };
  useEffect(
    () =>
      createSortable(root.current!, {
        live: live.current!,
        onPreview: (_, from, to) => setPreview({ from, to }),
        onCancel: () => setPreview(undefined),
        onDrop: (_, from, to) => {
          setPreview(undefined);
          const { columns: cols, onMove: move } = latest.current;
          move(moveCard(cols, from, to), { item: cols[from.list].items[from.index], from, to });
        },
      }),
    [],
  );
  const help = useId();
  const extras = (
    <>
      <p id={help} hidden>
        Press Space or Enter to pick it up. Arrow keys move it{columns.length > 1 ? " within and between columns" : ""}, Space or Enter
        drops it, Escape cancels.
      </p>
      <p ref={live} aria-live="assertive" style={SR_ONLY} />
    </>
  );
  return { root, help, extras, shown: preview ? moveCard(columns, preview.from, preview.to) : columns };
}

function Items<T>({ column, help, getKey, getLabel, renderItem, label }: SortableBase<T> & { column: SortableColumn<T>; help: string; label?: string }) {
  return (
    <ul className="ld-sortable" data-ld-sort-list="" data-ld-sort-name={label ? undefined : column.title} aria-label={label}>
      {column.items.map((item) => (
        <li key={getKey(item)} className="ld-sortable__item" data-ld-sort-key={getKey(item)} data-ld-sort-label={getLabel(item)}>
          <button type="button" className="ld-drag-handle" aria-label={`Move ${getLabel(item)}`} aria-describedby={help}>
            {grip}
          </button>
          <div className="ld-sortable__body">{renderItem(item)}</div>
        </li>
      ))}
    </ul>
  );
}

/** A list reordered by dragging each item's handle (pointer, touch or pen) or from
 *  the keyboard: Space lifts, arrows move, Space drops, Escape cancels, and every
 *  step is announced ("Moved Task A to position 3 of 5"). */
export function SortableList<T>({ items, onReorder, label, className, ...item }: SortableListProps<T>) {
  const { root, help, extras, shown } = useSortable([{ id: "list", title: label, items }], (cols, move) => onReorder(cols[0].items, move));
  return (
    <div ref={root} className={cx("ld-sortable-root", className)}>
      <Items column={shown[0]} help={help} label={label} {...item} />
      {extras}
    </div>
  );
}

/** Columns of cards moved within and between columns, by handle or keyboard (Left
 *  and Right carry a lifted card across). The target column lights up and a line
 *  marks the slot; "Moved Task A to position 3 of 5 in Done" is announced. */
export function SortableBoard<T>({ columns, onMove, className, ...item }: SortableBoardProps<T>) {
  const { root, help, extras, shown } = useSortable(columns, onMove);
  return (
    <div ref={root} className={cx("ld-board", className)}>
      {shown.map((column) => (
        <section key={column.id} className="ld-board__column" aria-labelledby={`${help}-${column.id}`}>
          <div className="ld-board__title" id={`${help}-${column.id}`}>
            {column.title} <span className="ld-board__count">{column.items.length}</span>
          </div>
          <Items column={column} help={help} {...item} />
        </section>
      ))}
      {extras}
    </div>
  );
}
