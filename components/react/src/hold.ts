/** Hold-to-confirm state machine, framework-free so it can be unit-tested
 * without a DOM. HoldButton drives it from pointer/keyboard events. */

export type HoldState = "idle" | "holding" | "fired";

export interface HoldOptions {
  /** Commitment window in ms, resolved at the moment a hold starts. */
  duration: () => number;
  /** Called with progress in [0, 1] on every frame, and with 0 on reset. */
  onProgress: (progress: number) => void;
  /** Fires exactly once per completed hold. */
  onConfirm: () => void;
  onStateChange?: (state: HoldState) => void;
  /** How long the "fired" state lingers before returning to idle (ms). */
  firedFor?: number;
  /* Injectable clocks — defaults are the browser globals. */
  now?: () => number;
  requestFrame?: (cb: () => void) => number;
  cancelFrame?: (id: number) => void;
  setTimer?: (cb: () => void, ms: number) => number;
  clearTimer?: (id: number) => void;
}

export interface HoldController {
  readonly state: HoldState;
  /** Begin a hold. Ignored unless idle. */
  start(): void;
  /** Abort an in-progress hold without firing. Ignored unless holding. */
  cancel(): void;
  /** Skip the hold and fire immediately (keyboard-tap escape hatch). */
  fire(): void;
  /** Cancel everything and drop pending timers. */
  dispose(): void;
}

export function createHoldController(opts: HoldOptions): HoldController {
  const now = opts.now ?? (() => performance.now());
  const requestFrame = opts.requestFrame ?? ((cb) => requestAnimationFrame(cb));
  const cancelFrame = opts.cancelFrame ?? ((id) => cancelAnimationFrame(id));
  const setTimer = opts.setTimer ?? ((cb, ms) => setTimeout(cb, ms) as unknown as number);
  const clearTimer = opts.clearTimer ?? ((id) => clearTimeout(id));
  const firedFor = opts.firedFor ?? 600;

  let state: HoldState = "idle";
  let startedAt = 0;
  let duration = 0;
  let frame: number | undefined;
  let timer: number | undefined;

  const setState = (next: HoldState) => {
    if (state === next) return;
    state = next;
    opts.onStateChange?.(next);
  };

  const stopFrame = () => {
    if (frame !== undefined) cancelFrame(frame);
    frame = undefined;
  };

  const fire = () => {
    stopFrame();
    setState("fired");
    opts.onProgress(1);
    opts.onConfirm();
    timer = setTimer(() => {
      timer = undefined;
      setState("idle");
      opts.onProgress(0);
    }, firedFor);
  };

  const tick = () => {
    frame = undefined;
    if (state !== "holding") return;
    const elapsed = now() - startedAt;
    if (elapsed >= duration) {
      fire();
      return;
    }
    opts.onProgress(Math.max(0, elapsed / duration));
    frame = requestFrame(tick);
  };

  return {
    get state() {
      return state;
    },
    start() {
      if (state !== "idle") return;
      duration = Math.max(0, opts.duration());
      startedAt = now();
      setState("holding");
      opts.onProgress(0);
      frame = requestFrame(tick);
    },
    cancel() {
      if (state !== "holding") return;
      stopFrame();
      setState("idle");
      opts.onProgress(0);
    },
    fire() {
      if (state === "fired") return;
      fire();
    },
    dispose() {
      stopFrame();
      if (timer !== undefined) clearTimer(timer);
      timer = undefined;
      state = "idle";
    },
  };
}
