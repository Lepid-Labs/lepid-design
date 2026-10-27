// Pure debouncing behind search fields, kept DOM-free so node:test can run it
// with fake timers (so it imports nothing).

/** Typing must pause this long before a query goes out. */
export const SEARCH_DEBOUNCE_MS = 250;

/** The query a field's text stands for: trimmed, inner whitespace collapsed. */
export const normalizeQuery = (text: string) => text.trim().replace(/\s+/g, " ");

export interface SearchTimers {
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

const realTimers: SearchTimers = {
  setTimeout: (run, ms) => setTimeout(run, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export interface QueryDebouncer {
  /** Feed the field's current text (every input event). */
  input(text: string): void;
  /** Send the pending query now (Enter). */
  flush(): void;
  /** Drop the pending query (unmount). */
  cancel(): void;
}

/** Turns keystrokes into queries: `onQuery` gets the normalized text `ms` after
 *  the last change, at once when the field is cleared, and never the same query
 *  twice in a row ("cat" then "cat " is no new search). */
export function debounceQuery(
  onQuery: (query: string) => void,
  ms = SEARCH_DEBOUNCE_MS,
  timers: SearchTimers = realTimers,
): QueryDebouncer {
  let sent = ""; // an empty field is where every search starts
  let pending: string | undefined;
  let timer: unknown;
  const send = () => {
    timers.clearTimeout(timer);
    if (pending === undefined) return;
    const q = pending;
    pending = undefined;
    if (q !== sent) onQuery((sent = q));
  };
  return {
    input(text) {
      timers.clearTimeout(timer);
      pending = normalizeQuery(text);
      if (pending === sent) pending = undefined;
      else if (pending === "") send();
      else timer = timers.setTimeout(send, ms);
    },
    flush: send,
    cancel() {
      timers.clearTimeout(timer);
      pending = undefined;
    },
  };
}
