import { useRef, useState } from "react";
import { pageSelection, togglePage, toggleRow, type PageSelection } from "./table-rows.js";

export interface RowSelection {
  /** Selected row ids, across every page (selection lives in state, not the DOM). */
  selected: ReadonlySet<string>;
  count: number;
  has(id: string): boolean;
  /** The header checkbox's state for the rows on screen. */
  pageState: PageSelection;
  /** A row checkbox press; `shift` selects the range from the previous press. */
  toggle(id: string, shift?: boolean): void;
  /** The header checkbox press. */
  togglePage(): void;
  /** Replace the selection: "Select all 312 matching" passes every matching id. */
  set(ids: Iterable<string>): void;
  clear(): void;
}

/** Row selection for a table showing `pageIds` (in display order) right now. */
export function useRowSelection(pageIds: readonly string[], initial?: Iterable<string>): RowSelection {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(initial));
  const anchor = useRef<string | null>(null);
  return {
    selected,
    count: selected.size,
    has: (id) => selected.has(id),
    pageState: pageSelection(selected, pageIds),
    toggle(id, shift = false) {
      const from = anchor.current;
      anchor.current = id;
      setSelected((s) => toggleRow(s, id, { shift, anchor: from, order: pageIds }).selected);
    },
    togglePage: () => setSelected((s) => togglePage(s, pageIds)),
    set: (ids) => setSelected(new Set(ids)),
    clear() {
      anchor.current = null;
      setSelected(new Set());
    },
  };
}
