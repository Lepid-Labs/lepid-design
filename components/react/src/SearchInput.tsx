import { useEffect, useRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx.js";
import { Spinner } from "./feedback.js";
import { IconButton } from "./IconButton.js";

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** One key that focuses the field from anywhere outside a text field ("/"); shown
   *  as a hint while the field is empty and unfocused. */
  shortcut?: string;
  /** What the hint shows. Default `shortcut`; pass "⌘K" when the field opens a CommandPalette. */
  hint?: ReactNode;
  /** Results are on their way: the search glyph turns into a spinner. */
  loading?: boolean;
  /** Name of the clear button. Default "Clear search". */
  clearLabel?: string;
  /** After the clear button empties the field (its `onChange` has already run). */
  onClear?: () => void;
  /** Class on the wrapper; the input itself is `.ld-search__input`. */
  className?: string;
}

const glyph = (
  <svg className="ld-search__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
    <circle cx="9" cy="9" r="5.5" />
    <path d="m13.2 13.2 3.8 3.8" />
  </svg>
);
const cross = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l8 8M14 6l-8 8" />
  </svg>
);

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** `type="search"` field with a search glyph, a clear button once it has text, an
 *  optional focus shortcut and its hint, and a loading state. Keep a placeholder:
 *  the clear button and the hint follow `:placeholder-shown`. */
export function SearchInput({
  shortcut,
  hint = shortcut,
  loading,
  clearLabel = "Clear search",
  onClear,
  className,
  placeholder = "Search",
  ...rest
}: SearchInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shortcut) return;
    const jump = (e: KeyboardEvent) => {
      if (e.key !== shortcut || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || typing(e.target)) return;
      e.preventDefault();
      ref.current?.focus();
    };
    addEventListener("keydown", jump);
    return () => removeEventListener("keydown", jump);
  }, [shortcut]);

  const clear = () => {
    const el = ref.current;
    if (!el) return;
    // set the value the way typing does, so a controlled field's onChange sees it
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
    onClear?.();
  };

  return (
    <div className={cx("ld-search", className)}>
      {loading ? <Spinner className="ld-search__icon" /> : glyph}
      <input
        ref={ref}
        type="search"
        className="ld-input ld-search__input"
        placeholder={placeholder}
        aria-keyshortcuts={shortcut}
        {...rest}
      />
      {hint !== undefined && (
        <kbd className="ld-kbd ld-search__hint" aria-hidden="true">
          {hint}
        </kbd>
      )}
      <IconButton label={clearLabel} className="ld-search__clear" onClick={clear}>
        {cross}
      </IconButton>
    </div>
  );
}
