// Deferred commit behind the undo toast, kept DOM-free so node:test can run it
// with a fake clock (so it imports nothing). The action has already happened
// on screen; the commit (the request, the purge) waits out the undo window.

/** Default undo window: long enough to read the toast and reach the button. */
export const UNDO_MS = 8000;

export type UndoStatus = "pending" | "committed" | "undone";

export interface Undoable {
  /** The undo window, in ms. */
  readonly delay: number;
  readonly status: UndoStatus;
  /** Cancel the commit and run `undo`. False once it has committed. */
  undo(): boolean;
  /** Commit now instead of at the end of the window. False once settled. */
  flush(): boolean;
  /** Stop the clock (the toast is hovered, focused or waiting); `resume` picks it up. */
  pause(): void;
  resume(): void;
}

export interface UndoClock {
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
  now(): number;
}

const realClock: UndoClock = {
  setTimeout: (run, ms) => setTimeout(run, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
};

/** Run `commit` after `delay` ms unless `undo()` comes first. The clock starts
 *  running at once; pause and resume carry the time left across stops. */
export function scheduleUndoable(
  { commit, undo, delay = UNDO_MS }: { commit: () => void; undo?: () => void; delay?: number },
  clock: UndoClock = realClock,
): Undoable {
  let status: UndoStatus = "pending";
  let remaining = delay;
  let since: number | undefined;
  let timer: unknown;
  const settle = (next: UndoStatus, run?: () => void) => {
    if (status !== "pending") return false;
    status = next;
    clock.clearTimeout(timer);
    run?.();
    return true;
  };
  const handle: Undoable = {
    delay,
    get status() {
      return status;
    },
    undo: () => settle("undone", undo),
    flush: () => settle("committed", commit),
    pause() {
      if (status !== "pending" || since === undefined) return;
      clock.clearTimeout(timer);
      remaining -= clock.now() - since;
      since = undefined;
    },
    resume() {
      if (status !== "pending" || since !== undefined) return;
      since = clock.now();
      timer = clock.setTimeout(handle.flush, Math.max(0, remaining));
    },
  };
  handle.resume();
  return handle;
}
