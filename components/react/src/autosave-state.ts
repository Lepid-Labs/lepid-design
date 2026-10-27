// Pure autosave state machine behind useAutosave and SaveStatus, kept DOM-free
// so node:test can run it without a renderer (so it imports nothing). Edits
// are debounced into one save; a save started offline waits for the network;
// "saved" only ever follows a save the server accepted.

export const AUTOSAVE_DEBOUNCE_MS = 800;
/** Longest an edit waits while typing never pauses. */
export const AUTOSAVE_MAX_WAIT_MS = 5000;

export type SaveStatusKind = "idle" | "pending" | "saving" | "saved" | "offline" | "error";

export interface AutosaveState {
  /** Edits not yet handed to a save. */
  dirty: boolean;
  /** When the oldest of those edits was made. */
  dirtySince?: number;
  inFlight: boolean;
  online: boolean;
  /** The last save failed while online. */
  failed: boolean;
  savedAt?: number;
  /** When the next save should start; undefined while there is none to schedule. */
  dueAt?: number;
  /** Bumps each time a save starts: the caller runs one save per bump. */
  attempt: number;
  debounce: number;
  maxWait: number;
}

export type AutosaveEvent =
  | { type: "edit"; now: number }
  /** The debounce timer set for `at` fired. Ignored unless `at` is still the deadline. */
  | { type: "due"; at: number }
  /** Save now: a Retry press, a blur, a Ctrl+S. */
  | { type: "retry"; now: number }
  | { type: "saved"; now: number }
  | { type: "failed"; now: number }
  | { type: "offline" }
  | { type: "online"; now: number };

export function autosaveState({
  online = true,
  debounce = AUTOSAVE_DEBOUNCE_MS,
  maxWait = AUTOSAVE_MAX_WAIT_MS,
}: { online?: boolean; debounce?: number; maxWait?: number } = {}): AutosaveState {
  return { dirty: false, inFlight: false, online, failed: false, attempt: 0, debounce, maxWait };
}

function start(s: AutosaveState): AutosaveState {
  // one save at a time: edits made meanwhile go in the next one, scheduled on success
  if (!s.online || s.inFlight || !s.dirty) return { ...s, dueAt: undefined };
  return { ...s, dirty: false, dirtySince: undefined, inFlight: true, failed: false, dueAt: undefined, attempt: s.attempt + 1 };
}

export function autosave(s: AutosaveState, e: AutosaveEvent): AutosaveState {
  switch (e.type) {
    case "edit": {
      const dirtySince = s.dirty && s.dirtySince !== undefined ? s.dirtySince : e.now;
      const dueAt = s.online ? Math.min(e.now + s.debounce, dirtySince + s.maxWait) : undefined;
      return { ...s, dirty: true, dirtySince, dueAt };
    }
    case "due":
      return e.at === s.dueAt ? start(s) : s;
    case "retry":
      return start(s);
    case "saved":
      // edits made during the save are next; if their debounce already ran out, go now
      return { ...s, inFlight: false, failed: false, savedAt: e.now, dueAt: s.dirty && s.online ? (s.dueAt ?? e.now) : undefined };
    case "failed":
      // a save that fails offline is queued, not an error
      return {
        ...s,
        inFlight: false,
        dirty: true,
        dirtySince: s.dirtySince ?? e.now,
        failed: s.online,
        dueAt: s.online ? s.dueAt : undefined,
      };
    case "offline":
      return { ...s, online: false, dueAt: undefined };
    case "online":
      return { ...s, online: true, dueAt: s.dirty && !s.inFlight ? e.now : undefined };
  }
}

export function saveStatus(s: AutosaveState): SaveStatusKind {
  if (!s.online) return "offline";
  if (s.inFlight) return "saving";
  if (s.failed) return "error";
  if (s.dirty) return "pending";
  return s.savedAt === undefined ? "idle" : "saved";
}

/** Whether a status change is worth announcing: problems once each, and the
 *  save that recovers from one. Routine saving and saved stay silent.
 *  `lastAnnounced` is the last status this returned true for. */
export function shouldAnnounceSave(lastAnnounced: SaveStatusKind | undefined, next: SaveStatusKind): boolean {
  if (next === "offline" || next === "error") return lastAnnounced !== next;
  return next === "saved" && (lastAnnounced === "offline" || lastAnnounced === "error");
}

/** "3 minutes ago" for a save at `savedAt`; empty under a minute, where "Saved" says it all. */
export function savedAgo(savedAt: number, now: number, locale?: string): string {
  const s = Math.floor((now - savedAt) / 1000);
  if (s < 60) return "";
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (s < 3600) return rtf.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), "hour");
  return rtf.format(-Math.floor(s / 86400), "day");
}
