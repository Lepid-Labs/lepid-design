import { useCallback, useEffect, useReducer, useRef } from "react";
import { autosave, autosaveState, saveStatus, type AutosaveState, type SaveStatusKind } from "./autosave-state.js";

export interface AutosaveOptions {
  /** ms of quiet after the last edit before saving. Default 800. */
  debounce?: number;
  /** Longest an edit waits while typing never pauses. Default 5000. */
  maxWait?: number;
}

export interface Autosave {
  state: AutosaveState;
  /** Pass to `<SaveStatus status>`, with `state.savedAt` and `retry`. */
  status: SaveStatusKind;
  /** Call on every change. */
  edit: () => void;
  /** Save now: the Retry button, a blur, Ctrl+S. */
  retry: () => void;
}

/** Debounced autosave around `save` (which sends the latest content and rejects on
 *  failure). One save runs at a time; offline, edits wait and go when the network
 *  is back; leaving the page with unsaved edits asks first. */
export function useAutosave(save: () => Promise<unknown>, { debounce, maxWait }: AutosaveOptions = {}): Autosave {
  const [state, send] = useReducer(autosave, undefined, () =>
    autosaveState({ online: typeof navigator === "undefined" || navigator.onLine, debounce, maxWait }),
  );
  const latest = useRef(save);
  useEffect(() => {
    latest.current = save;
  });

  useEffect(() => {
    const at = state.dueAt;
    if (at === undefined) return;
    const id = setTimeout(() => send({ type: "due", at }), Math.max(0, at - Date.now()));
    return () => clearTimeout(id);
  }, [state.dueAt]);

  useEffect(() => {
    if (!state.attempt) return;
    Promise.resolve()
      .then(() => latest.current())
      .then(
        () => send({ type: "saved", now: Date.now() }),
        () => send({ type: "failed", now: Date.now() }),
      );
  }, [state.attempt]);

  useEffect(() => {
    const on = () => send({ type: "online", now: Date.now() });
    const off = () => send({ type: "offline" });
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);

  const unsaved = state.dirty || state.inFlight;
  useEffect(() => {
    if (!unsaved) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // Safari still wants it
    };
    addEventListener("beforeunload", guard);
    return () => removeEventListener("beforeunload", guard);
  }, [unsaved]);

  const edit = useCallback(() => send({ type: "edit", now: Date.now() }), []);
  const retry = useCallback(() => send({ type: "retry", now: Date.now() }), []);
  return { state, status: saveStatus(state), edit, retry };
}
