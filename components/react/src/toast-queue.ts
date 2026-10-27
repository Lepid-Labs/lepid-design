// Pure queue and clock behind Toaster, kept DOM-free so node:test can run it
// without a renderer (so it imports nothing). Toasts show oldest first, at most
// `max` at a time; the rest wait. Only shown toasts run their clock, and every
// clock stops while the stack is paused (hover, focus, hidden tab).

export type ToastVariant = "info" | "success" | "warning" | "danger";

/** Default lifetime per variant. Errors stay until dismissed. */
export const TOAST_MS = { info: 5000, success: 5000, warning: 7000 } as const;
/** Default lifetime of a toast that carries an action. */
export const TOAST_ACTION_MS = 10000;
/** Shortest lifetime an error or an action toast may be given (WCAG 2.2.1). */
export const TOAST_MIN_ATTENTION_MS = 6000;
export const TOAST_MAX_VISIBLE = 3;

/** ms a toast stays once shown; null = until dismissed. An explicit duration
 *  wins, but errors and action toasts are never cut shorter than the floor. */
export function toastDuration({
  variant = "info",
  duration,
  hasAction = false,
}: {
  variant?: ToastVariant;
  duration?: number | null;
  hasAction?: boolean;
}): number | null {
  if (duration === null) return null;
  const needsTime = variant === "danger" || hasAction;
  if (duration === undefined) return variant === "danger" ? null : hasAction ? TOAST_ACTION_MS : TOAST_MS[variant];
  return needsTime ? Math.max(duration, TOAST_MIN_ATTENTION_MS) : duration;
}

export interface QueuedToast<T> {
  id: string;
  duration: number | null;
  /** ms left on the clock at `runningSince` (or now, while stopped); null never times out. */
  remaining: number | null;
  /** Start of the current running stretch; undefined while waiting or paused. */
  runningSince?: number;
  /** When this content was queued; a replacement gets a new one. */
  createdAt: number;
  data: T;
}

export interface ToastQueue<T> {
  items: QueuedToast<T>[];
  paused: boolean;
  max: number;
}

export function toastQueue<T>(max = TOAST_MAX_VISIBLE): ToastQueue<T> {
  return { items: [], paused: false, max };
}

/** Start or stop clocks so exactly the shown, timed toasts run while unpaused. */
function settle<T>(q: ToastQueue<T>, now: number): ToastQueue<T> {
  const items = q.items.map((t, i) => {
    const run = !q.paused && i < q.max && t.remaining !== null;
    if (run && t.runningSince === undefined) return { ...t, runningSince: now };
    if (!run && t.runningSince !== undefined) {
      return { ...t, remaining: toastTimeLeft(t, now), runningSince: undefined };
    }
    return t;
  });
  return { ...q, items };
}

/** Queue a toast. Reusing an id replaces that toast in place with a fresh clock. */
export function addToast<T>(
  q: ToastQueue<T>,
  { id, duration, data }: { id: string; duration: number | null; data: T },
  now: number,
): ToastQueue<T> {
  const fresh: QueuedToast<T> = { id, duration, remaining: duration, createdAt: now, data };
  const at = q.items.findIndex((t) => t.id === id);
  const items = at < 0 ? [...q.items, fresh] : q.items.map((t, i) => (i === at ? fresh : t));
  return settle({ ...q, items }, now);
}

/** Remove a toast; the next waiting one moves up and starts its clock. */
export function dismissToast<T>(q: ToastQueue<T>, id: string, now: number): ToastQueue<T> {
  return settle({ ...q, items: q.items.filter((t) => t.id !== id) }, now);
}

export function pauseToasts<T>(q: ToastQueue<T>, paused: boolean, now: number): ToastQueue<T> {
  return paused === q.paused ? q : settle({ ...q, paused }, now);
}

export function visibleToasts<T>(q: ToastQueue<T>): QueuedToast<T>[] {
  return q.items.slice(0, q.max);
}

/** ms until this toast times out (Infinity when it never does). */
export function toastTimeLeft<T>(t: QueuedToast<T>, now: number): number {
  if (t.remaining === null) return Infinity;
  return t.runningSince === undefined ? t.remaining : t.remaining - (now - t.runningSince);
}

/** Ids whose clock has run out. */
export function expiredToasts<T>(q: ToastQueue<T>, now: number): string[] {
  return q.items.filter((t) => t.runningSince !== undefined && toastTimeLeft(t, now) <= 0).map((t) => t.id);
}

/** ms until the next running toast times out; undefined when none is running. */
export function nextToastExpiry<T>(q: ToastQueue<T>, now: number): number | undefined {
  const left = q.items.filter((t) => t.runningSince !== undefined).map((t) => toastTimeLeft(t, now));
  return left.length ? Math.max(0, Math.min(...left)) : undefined;
}
