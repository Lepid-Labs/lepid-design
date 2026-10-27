import { useEffect, useId, useReducer, useRef } from "react";
import type { KeyboardEvent } from "react";
import { cx } from "./cx.js";
import { fieldControlAttrs, fieldIds } from "./field-state.js";
import { INLINE_EDIT_SAVED_MS, inlineEdit, inlineEditKey, inlineEditState } from "./inline-edit.js";
import { SR_ONLY } from "./sr-only.js";

export interface InlineEditProps {
  /** The saved value. A change from outside shows at once unless a draft is open. */
  value: string;
  /** Persist the draft. Reject to roll back: the error's message is shown under the reopened input. */
  onSave: (value: string) => unknown;
  /** What the value is ("Display name"): names the input and the trigger ("Edit display name"). */
  label: string;
  /** Refuse a draft before it is saved by returning the reason. */
  validate?: (draft: string) => string | undefined;
  /** A textarea: Enter is a new line, Ctrl/⌘+Enter or blur saves. */
  multiline?: boolean;
  /** Shown, faint, while the value is empty. */
  placeholder?: string;
  type?: "text" | "email" | "url" | "tel";
  /** Announced while the save runs. */
  savingLabel?: string;
  savedLabel?: string;
  className?: string;
}

const FAILED = "Couldn't save. Try again.";

/** Text that becomes an input in the same box: click, Enter or F2 to edit; Enter or
 *  blur saves (optimistically), Escape restores, and focus returns to the text. */
export function InlineEdit({
  value,
  onSave,
  label,
  validate,
  multiline,
  placeholder,
  type = "text",
  savingLabel = "Saving",
  savedLabel = "Saved",
  className,
}: InlineEditProps) {
  const [s, send] = useReducer(inlineEdit, value, inlineEditState);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const height = useRef<number>(undefined); // the text's height, so a textarea opens at the same size
  const returnFocus = useRef(false);
  const mode = useRef(s.mode); // read by blur, which can fire mid-commit with a stale closure
  mode.current = s.mode;
  const save = useRef(onSave);
  useEffect(() => {
    save.current = onSave;
  });

  useEffect(() => send({ type: "sync", value }), [value]);

  const editing = s.mode === "editing" || s.mode === "error";
  useEffect(() => {
    const at = document.activeElement;
    if (editing) {
      // a save that fails after the reader moved on must not pull focus back
      if (at && at !== document.body && at !== trigger.current) return;
      field.current?.focus();
      field.current?.select();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      trigger.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (s.mode !== "saving") return;
    let live = true;
    Promise.resolve()
      .then(() => save.current(s.draft))
      .then(
        () => live && send({ type: "saved" }),
        (err) => live && send({ type: "failed", error: (err instanceof Error && err.message) || FAILED }),
      );
    return () => {
      live = false;
    };
  }, [s.mode]);

  useEffect(() => {
    if (!s.saved) return;
    const t = setTimeout(() => send({ type: "settle" }), INLINE_EDIT_SAVED_MS);
    return () => clearTimeout(t);
  }, [s.saved]);

  const start = () => {
    height.current = trigger.current?.offsetHeight;
    send({ type: "start" });
  };
  const commit = (focusBack: boolean) => {
    if (mode.current !== "editing" && mode.current !== "error") return;
    const refused = validate?.(s.draft);
    if (refused) return send({ type: "failed", error: refused });
    returnFocus.current = focusBack;
    send({ type: "commit" });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const act = inlineEditKey({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, isComposing: e.nativeEvent.isComposing }, multiline);
    if (!act) return;
    e.preventDefault(); // no form submit, no new line
    e.stopPropagation(); // Escape here must not also close a surrounding dialog
    if (act === "commit") return commit(true);
    returnFocus.current = true;
    send({ type: "cancel" });
  };

  const ids = fieldIds(id);
  const control = {
    ref: field,
    className: "ld-inline-edit__input",
    value: s.draft,
    placeholder,
    "aria-label": label,
    onChange: (e: { currentTarget: { value: string } }) => send({ type: "change", draft: e.currentTarget.value }),
    onKeyDown,
    onBlur: () => commit(false),
    ...fieldControlAttrs({ id, hasError: s.mode === "error" }),
  };
  const shown = s.mode === "saving" ? s.draft : s.value;
  return (
    <div
      className={cx("ld-inline-edit", multiline && "ld-inline-edit--multiline", className)}
      data-ld-edit={s.mode}
      data-ld-saved={s.saved || undefined}
    >
      {editing ? (
        multiline ? (
          <textarea {...control} style={{ minHeight: height.current }} />
        ) : (
          <input {...control} type={type} />
        )
      ) : (
        <button
          type="button"
          ref={trigger}
          className="ld-inline-edit__display"
          aria-busy={s.mode === "saving" || undefined}
          onClick={start}
          onKeyDown={(e) => e.key === "F2" && (e.preventDefault(), start())}
        >
          <span style={SR_ONLY}>{`Edit ${label}: `}</span>
          <span className={cx("ld-inline-edit__text", !shown && "ld-inline-edit__text--empty")}>{shown || placeholder}</span>
          <span className="ld-inline-edit__icon" aria-hidden="true" />
        </button>
      )}
      {/* always rendered: a live region must exist before its text changes to be announced */}
      <p className="ld-field__message ld-field__message--error" id={ids.message} aria-live="polite">
        {s.mode === "error" ? s.error : null}
      </p>
      <span style={SR_ONLY} role="status">
        {s.mode === "saving" ? savingLabel : s.saved ? savedLabel : ""}
      </span>
    </div>
  );
}
