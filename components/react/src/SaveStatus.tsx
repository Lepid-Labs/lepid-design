import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { savedAgo, shouldAnnounceSave, type SaveStatusKind } from "./autosave-state.js";
import { cx } from "./cx.js";
import { SR_ONLY } from "./sr-only.js";

export const SAVE_LABELS: Record<SaveStatusKind, string> = {
  idle: "",
  pending: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  offline: "Offline: changes will save when you reconnect",
  error: "Changes not saved",
};

export interface SaveStatusProps extends HTMLAttributes<HTMLSpanElement> {
  /** From `useAutosave().status`, or `saveStatus(state)`. */
  status: SaveStatusKind;
  /** When the last save landed: "Saved 3 minutes ago". */
  savedAt?: number | Date;
  /** Shows a Retry button in the error state. */
  onRetry?: () => void;
  labels?: Partial<Record<SaveStatusKind, string>>;
  retryLabel?: string;
}

/** Autosave indicator. Its text is not live: only going offline, a failure, and
 *  the save that recovers from one are announced (politely), once each. */
export function SaveStatus({ status, savedAt, onRetry, labels, retryLabel = "Retry", className, ...rest }: SaveStatusProps) {
  const text = { ...SAVE_LABELS, ...labels };
  const [now, setNow] = useState(() => Date.now());
  const [said, setSaid] = useState("");
  const last = useRef<SaveStatusKind>(undefined);

  useEffect(() => {
    if (!shouldAnnounceSave(last.current, status)) return;
    last.current = status;
    setSaid(text[status]);
  }, [status]); // labels are read when the status changes

  useEffect(() => {
    if (status !== "saved") return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [status, savedAt]);

  const at = savedAt === undefined ? undefined : new Date(savedAt);
  const ago = status === "saved" && at ? savedAgo(+at, now) : "";
  return (
    <span className={cx("ld-save-status", className)} data-ld-save={status} {...rest}>
      <span className="ld-save-status__text">
        {text[status]}
        {ago && " "}
        {ago && at && (
          <time dateTime={at.toISOString()} title={at.toLocaleString()}>
            {ago}
          </time>
        )}
      </span>
      {status === "error" && onRetry && (
        <button type="button" className="ld-btn ld-btn--sm ld-save-status__retry" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
      <span style={SR_ONLY} role="status">
        {said}
      </span>
    </span>
  );
}
