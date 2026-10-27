import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { filterCommands, highlight, type CommandLike } from "./command-filter.js";
import { Dialog } from "./Dialog.js";
import { EmptyState } from "./EmptyState.js";
import { Spinner } from "./feedback.js";
import { menuMove } from "./menu-nav.js";
import { Skeleton } from "./Skeleton.js";
import { SR_ONLY } from "./sr-only.js";

export interface Command extends CommandLike {
  /** Shortcut hint ("⌘N"); wire the key itself elsewhere. */
  shortcut?: string;
  /** Leading icon (an inline `<svg>`). */
  icon?: ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  /** Called to open (⌘K / Ctrl+K) and to close (Escape, backdrop, a choice). */
  onOpenChange: (open: boolean) => void;
  commands: Command[];
  /** Ids of recently used commands, newest first; listed before the rest while
   *  the query is empty. Keep it with `pushRecent` in `onSelect`. */
  recent?: string[];
  /** After a command's own `onSelect`. */
  onSelect?: (command: Command) => void;
  /** Results are on their way: skeleton rows while there are none, else a spinner. */
  loading?: boolean;
  /** For results from a server: gets every change of the query (debounce it). */
  onQueryChange?: (query: string) => void;
  /** Listen for ⌘K / Ctrl+K on the whole page. Default true. */
  hotkey?: boolean;
  /** Name of the dialog and the list. Default "Command palette". */
  label?: string;
  placeholder?: string;
  /** Shown when there are no commands at all. */
  empty?: ReactNode;
}

const searchIcon = (
  <svg className="ld-command__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
    <circle cx="9" cy="9" r="5.5" />
    <path d="m13.2 13.2 3.8 3.8" />
  </svg>
);

/** ⌘K / Ctrl+K: a modal Dialog holding a combobox and its listbox (APG combobox,
 *  `aria-activedescendant`): grouped, fuzzy-filtered results with the matched
 *  letters marked, recent commands first, shortcut hints, and loading, empty and
 *  no-results states. ArrowUp/Down move, Enter runs, Escape closes. */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  recent,
  onSelect,
  loading,
  onQueryChange,
  hotkey = true,
  label = "Command palette",
  placeholder = "Type a command or search…",
  empty = "Nothing to run yet.",
}: CommandPaletteProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const groups = useMemo(() => filterCommands(commands, query, recent), [commands, query, recent]);
  const flat = groups.flatMap((g) => g.items);
  const optionId = (i: number) => `${id}o${i}`;
  const current = Math.min(active, flat.length - 1);

  useEffect(() => {
    if (!hotkey) return;
    const toggle = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      onOpenChange(!open);
    };
    addEventListener("keydown", toggle);
    return () => removeEventListener("keydown", toggle);
  }, [hotkey, open, onOpenChange]);

  useEffect(() => document.getElementById(optionId(current))?.scrollIntoView({ block: "nearest" }), [current, query]);

  const type = (q: string) => {
    setQuery(q);
    setActive(0);
    onQueryChange?.(q);
  };
  const choose = (i: number) => {
    const command = flat[i]?.item;
    if (!command || command.disabled) return;
    onOpenChange(false);
    command.onSelect?.();
    onSelect?.(command);
  };

  let n = 0;
  const status = !query.trim() ? "" : loading && !flat.length ? "Searching…" : `${flat.length} result${flat.length === 1 ? "" : "s"}`;
  return (
    <Dialog
      open={open}
      onClose={() => (onOpenChange(false), type(""))}
      className="ld-command"
      aria-label={label}
    >
      <div className="ld-command__search">
        {loading && flat.length > 0 ? <Spinner className="ld-command__icon" /> : searchIcon}
        <input
          className="ld-command__input"
          role="combobox"
          aria-label={label}
          aria-expanded={flat.length > 0}
          aria-controls={`${id}list`}
          aria-autocomplete="list"
          aria-activedescendant={flat.length ? optionId(current) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={(e) => type(e.target.value)}
          onKeyDown={(e) => {
            const to = e.key === "ArrowDown" || e.key === "ArrowUp" ? menuMove(flat.length, current, e.key) : undefined;
            if (to !== undefined) (e.preventDefault(), setActive(to));
            else if (e.key === "Enter") (e.preventDefault(), choose(current));
          }}
        />
        <kbd className="ld-kbd">Esc</kbd>
      </div>
      <div className="ld-command__list" id={`${id}list`} role="listbox" aria-label={label} hidden={!flat.length}>
        {groups.map((g, gi) => (
          <div key={g.label ?? gi} role="group" aria-labelledby={g.label ? `${id}g${gi}` : undefined} className="ld-command__group">
            {g.label && (
              <div role="presentation" id={`${id}g${gi}`} className="ld-command__group-label">
                {g.label}
              </div>
            )}
            {g.items.map(({ item, ranges }) => {
              const i = n++;
              return (
                <div
                  key={item.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === current}
                  aria-disabled={item.disabled || undefined}
                  className="ld-command__option"
                  onPointerMove={() => i !== current && setActive(i)}
                  onClick={() => choose(i)}
                >
                  {item.icon !== undefined && <span className="ld-command__option-icon" aria-hidden="true">{item.icon}</span>}
                  <span className="ld-command__label">
                    {highlight(item.label, ranges).map((r, k) =>
                      r.match ? <mark key={k} className="ld-match">{r.text}</mark> : r.text,
                    )}
                  </span>
                  {item.shortcut && <kbd className="ld-kbd ld-command__shortcut">{item.shortcut}</kbd>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {loading && !flat.length && (
        <div className="ld-command__loading" aria-hidden="true">
          <Skeleton lines={3} />
        </div>
      )}
      {!loading && !flat.length && (
        query.trim() ? (
          <EmptyState variant="no-results" title={`No results for “${query.trim()}”`} titleAs="p">
            Check the spelling, or try a shorter word.
          </EmptyState>
        ) : (
          <EmptyState title={empty} titleAs="p" />
        )
      )}
      <div role="status" style={SR_ONLY}>
        {status}
      </div>
    </Dialog>
  );
}
