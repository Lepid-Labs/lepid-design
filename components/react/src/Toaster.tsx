import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";
import { IconButton } from "./IconButton.js";
import { cx } from "./cx.js";
import { followTopModal } from "./follow-modal.js";
import { SR_ONLY } from "./sr-only.js";
import {
  addToast,
  dismissToast,
  expiredToasts,
  nextToastExpiry,
  pauseToasts,
  toastDuration,
  toastQueue,
  visibleToasts,
  type QueuedToast,
  type ToastQueue,
  type ToastVariant,
} from "./toast-queue.js";
import type { Undoable } from "./undoable.js";

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastOptions {
  /** Reuse an id to replace that toast in place ("Saving…" → "Saved"). */
  id?: string;
  message: ReactNode;
  title?: ReactNode;
  variant?: ToastVariant;
  /** ms it stays once shown; null keeps it until dismissed. Default 5s, warning 7s,
   *  10s with an action; errors stay. Errors and actions never get less than 6s. */
  duration?: number | null;
  /** One button beside the message; the toast closes when it is pressed. */
  action?: ToastAction;
  /** A pending `scheduleUndoable()`: shows an Undo button (instead of `action`) with a
   *  countdown, keeps the undo window in step with the toast, and commits it when the
   *  toast closes any other way. */
  undo?: Undoable;
  undoLabel?: string;
}

type CloseReason = "dismiss" | "timeout" | "action";

// One stack per page, so toast() works from anywhere, React or not.
let queue: ToastQueue<ToastOptions> = toastQueue();
const listeners = new Set<() => void>();
let seq = 0;

function update(next: ToastQueue<ToastOptions>) {
  queue = next;
  // an undo window only runs while its toast does
  for (const t of queue.items) t.data.undo?.[t.runningSince === undefined ? "pause" : "resume"]();
  for (const l of listeners) l();
}

function close(id: string, reason: CloseReason) {
  const item = queue.items.find((t) => t.id === id);
  if (!item) return;
  update(dismissToast(queue, id, Date.now()));
  const { undo, action } = item.data;
  if (reason !== "action") undo?.flush();
  else if (undo) undo.undo();
  else action?.onAction();
}

/** Show a toast; needs one `<Toaster />` on the page. Returns its id. */
export function toast(options: ToastOptions): string {
  const id = options.id ?? `ld-toast-${++seq}`;
  const replaced = queue.items.find((t) => t.id === id)?.data.undo;
  const duration = options.undo
    ? options.undo.delay
    : toastDuration({ variant: options.variant, duration: options.duration, hasAction: !!options.action });
  update(addToast(queue, { id, duration, data: options }, Date.now()));
  if (replaced && replaced !== options.undo) replaced.flush(); // what it was holding back goes through
  return id;
}
toast.dismiss = (id: string) => close(id, "dismiss");

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
const snapshot = () => queue;

export interface ToasterProps {
  /** Name of the notifications landmark; the hotkey is appended. Default "Notifications". */
  label?: string;
  /** `KeyboardEvent.key` that moves focus to the newest toast. Default "F8". */
  hotkey?: string;
  className?: string;
}

/** Renders what `toast()` queues: bottom-right, top on narrow screens, at most three
 *  at a time. Clocks stop while the stack is hovered or focused and while the tab is
 *  hidden. Info, success and warning are read politely; errors assertively. It stays
 *  above, and usable in, an open modal dialog. Mount once. */
export function Toaster({ label = "Notifications", hotkey = "F8", className }: ToasterProps) {
  const q = useSyncExternalStore(subscribe, snapshot, snapshot);
  const shown = visibleToasts(q);
  const region = useRef<HTMLElement>(null);
  const home = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [tick, setTick] = useState(0);
  const empty = shown.length === 0;
  const paused = hidden || (!empty && (hovered || focused));

  useEffect(() => update(pauseToasts(queue, paused, Date.now())), [paused]);

  // The stack is a manual popover, in the top layer above whatever was there when it
  // showed, and its box follows an open modal inside, so toasts stay visible and usable.
  // React still finds the box: it only touches its children, and it is home before
  // React removes it (layout cleanups run first).
  const raise = () => {
    const s = region.current;
    if (s?.isConnected && !s.matches(":popover-open")) s.showPopover();
  };
  useLayoutEffect(raise, [empty]);
  useLayoutEffect(() => followTopModal(box.current!, home.current!, raise), []);

  useEffect(() => {
    // the region unmounts without a pointerleave or blur
    if (empty) (setHovered(false), setFocused(false));
  }, [empty]);

  useEffect(() => {
    const wait = nextToastExpiry(q, Date.now());
    if (wait === undefined) return;
    const id = setTimeout(() => {
      const ids = expiredToasts(queue, Date.now());
      if (ids.length) ids.forEach((t) => close(t, "timeout"));
      else setTick((n) => n + 1); // the timer beat the clock by a hair: look again
    }, wait);
    return () => clearTimeout(id);
  }, [q, tick]);

  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    // leaving the page commits every pending undo, so what the user saw happen sticks
    const leave = () => queue.items.forEach((t) => t.data.undo?.flush());
    const jump = (e: KeyboardEvent) => {
      if (e.key !== hotkey || e.defaultPrevented || !region.current) return;
      const newest = [...region.current.querySelectorAll<HTMLElement>(".ld-toast")].at(-1);
      if (!newest) return;
      e.preventDefault();
      if (!region.current.contains(document.activeElement)) back.current = document.activeElement as HTMLElement | null;
      newest.querySelector<HTMLElement>("button")?.focus();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    addEventListener("pagehide", leave);
    addEventListener("keydown", jump);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      removeEventListener("pagehide", leave);
      removeEventListener("keydown", jump);
    };
  }, [hotkey]);

  // A keyboard user closing the toast they are in lands on the next one, or back
  // where F8 took them from. After a click focus is let go (explicitly: removing
  // a focused node fires no blur), so the stack can resume.
  const closeFrom = (id: string, reason: CloseReason, el: Element | null) => {
    const active = document.activeElement;
    if (el && active instanceof HTMLElement && el.contains(active)) {
      const others = [...(region.current?.querySelectorAll<HTMLElement>(".ld-toast") ?? [])].filter((t) => t !== el);
      const next = active.matches(":focus-visible")
        ? (others.at(-1)?.querySelector<HTMLElement>("button") ?? (back.current?.isConnected ? back.current : null))
        : null;
      if (next) next.focus();
      else active.blur();
    }
    close(id, reason);
  };

  const spoken = (danger: boolean) =>
    shown
      .filter((t) => (t.data.variant === "danger") === danger)
      .map((t) => <Announcement key={`${t.id}:${t.createdAt}`} item={t} hotkey={hotkey} />);

  return (
    <>
      <span ref={home} hidden />
      {/* moves into an open modal (follow-modal.ts) */}
      <div ref={box} style={{ display: "contents" }}>
        {!empty && (
          <section
            ref={region}
            popover="manual"
            className={cx("ld-toaster", className)}
            aria-label={`${label} (${hotkey})`}
            data-ld-paused={paused || undefined}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
          >
            {shown.map((t) => (
              <ToastView key={t.id} item={t} onClose={(reason, el) => closeFrom(t.id, reason, el)} />
            ))}
          </section>
        )}
        {/* always mounted, so a new toast is a change screen readers pick up */}
        <div role="status" aria-atomic="false" style={SR_ONLY}>
          {spoken(false)}
        </div>
        <div role="alert" aria-atomic="false" style={SR_ONLY}>
          {spoken(true)}
        </div>
      </div>
    </>
  );
}

const actionLabel = ({ undo, undoLabel = "Undo", action }: ToastOptions) => (undo ? undoLabel : action?.label);

function Announcement({ item, hotkey }: { item: QueuedToast<ToastOptions>; hotkey: string }) {
  const { title, message } = item.data;
  const act = actionLabel(item.data);
  return (
    <p>
      {title}
      {title !== undefined && " "}
      {message}
      {act && ` (${act}, ${hotkey})`}
    </p>
  );
}

const cross = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
    <path d="M5 5l10 10M15 5 5 15" />
  </svg>
);

function ToastView({
  item,
  onClose,
}: {
  item: QueuedToast<ToastOptions>;
  onClose: (reason: CloseReason, el: Element | null) => void;
}) {
  const labelId = useId();
  const { title, message, variant = "info" } = item.data;
  const act = actionLabel(item.data);
  const from = (e: { currentTarget: Element }) => e.currentTarget.closest(".ld-toast");
  return (
    <div
      className={cx("ld-toast", `ld-toast--${variant}`)}
      role="group"
      aria-labelledby={labelId}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault(); // dismiss the toast, not the dialog it may sit in
        e.stopPropagation();
        onClose("dismiss", e.currentTarget);
      }}
    >
      <div className="ld-toast__body" id={labelId}>
        {title !== undefined && <div className="ld-toast__title">{title}</div>}
        <div className="ld-toast__message">{message}</div>
      </div>
      {act !== undefined && (
        <button type="button" className="ld-btn ld-btn--sm ld-toast__action" onClick={(e) => onClose("action", from(e))}>
          {act}
        </button>
      )}
      <IconButton label="Dismiss" className="ld-toast__close" onClick={(e) => onClose("dismiss", from(e))}>
        {cross}
      </IconButton>
      {act !== undefined && item.duration !== null && (
        <span
          key={item.createdAt}
          className="ld-toast__countdown"
          aria-hidden="true"
          style={{ "--ld-toast-duration": `${item.duration}ms` } as CSSProperties}
        />
      )}
    </div>
  );
}
