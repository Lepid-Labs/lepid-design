// Pure state machine behind InlineEdit, kept DOM-free so node:test can run it
// without a renderer (so it imports nothing). Display text swaps for an input
// in the same box; Enter or blur commits, Escape restores. Saves are
// optimistic: the new text shows while the request runs, and a failure reopens
// the input with the draft kept and the reason shown.

export type InlineEditMode = "display" | "editing" | "saving" | "error";

export interface InlineEditState {
  mode: InlineEditMode;
  /** The saved value: what shows at rest, and what Escape restores. */
  value: string;
  /** What the input holds; while saving, what shows in its place. */
  draft: string;
  /** Why the last commit was refused (validation) or failed (the save). */
  error?: string;
  /** The last save landed and nothing has happened since: show a brief check. */
  saved?: boolean;
}

export type InlineEditEvent =
  | { type: "start" }
  | { type: "change"; draft: string }
  | { type: "commit" }
  | { type: "cancel" }
  | { type: "saved" }
  | { type: "failed"; error: string }
  /** The saved check has been seen. */
  | { type: "settle" }
  /** The value changed from outside (a refetch, another tab). Never clobbers a draft. */
  | { type: "sync"; value: string };

export function inlineEditState(value: string): InlineEditState {
  return { mode: "display", value, draft: value };
}

const open = (s: InlineEditState) => s.mode === "editing" || s.mode === "error";

export function inlineEdit(s: InlineEditState, e: InlineEditEvent): InlineEditState {
  switch (e.type) {
    case "start":
      return s.mode === "display" ? { ...s, mode: "editing", draft: s.value, error: undefined, saved: false } : s;
    case "change":
      // the error was about the old draft; a new one gets a fresh hearing on commit
      return open(s) ? { ...s, mode: "editing", draft: e.draft, error: undefined } : s;
    case "commit":
      if (!open(s)) return s;
      // nothing changed: close without a request
      return s.draft === s.value ? { ...s, mode: "display", error: undefined } : { ...s, mode: "saving", error: undefined };
    case "cancel":
      return open(s) ? { ...s, mode: "display", draft: s.value, error: undefined } : s;
    case "saved":
      return s.mode === "saving" ? { ...s, mode: "display", value: s.draft, saved: true } : s;
    case "failed":
      // a refused draft (while editing) or a failed save: roll back the shown
      // value, keep the draft in the reopened input, say why
      return s.mode === "saving" || open(s) ? { ...s, mode: "error", error: e.error } : s;
    case "settle":
      return s.saved ? { ...s, saved: false } : s;
    case "sync":
      return s.mode === "display" ? { ...s, value: e.value, draft: e.value } : { ...s, value: e.value };
  }
}

export interface EditKey {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
}

/** What a key does inside the editor. Escape cancels; Enter commits, except in a
 *  textarea, where Enter is a new line and Ctrl/⌘+Enter commits. Keys that end
 *  an IME composition do nothing. */
export function inlineEditKey(e: EditKey, multiline = false): "commit" | "cancel" | undefined {
  if (e.isComposing) return undefined;
  if (e.key === "Escape") return "cancel";
  if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) return "commit";
  return undefined;
}

/** How long the saved check shows before the edit affordance returns. */
export const INLINE_EDIT_SAVED_MS = 1500;
