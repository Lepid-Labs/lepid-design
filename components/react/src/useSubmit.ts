import { useCallback, useRef, useState } from "react";
import { errorMessage } from "./format.js";

export interface Submit {
  /** A form's `onSubmit` (or a button's `onClick`): prevents the page load, ignores
   *  repeats while running, and catches what `action` throws into `error`. */
  onSubmit: (e?: { preventDefault(): void }) => Promise<void>;
  /** `action` is running; pass it to the submit Button's `busy`. */
  busy: boolean;
  /** The message of the last failure, cleared when the next submit starts. */
  error: string | null;
}

/** Runs `action` for a form submit with the busy flag, double-submit guard and error
 *  message every form needs. The latest `action` is used, so it may read fresh state. */
export function useSubmit(action: () => unknown): Submit {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const latest = useRef(action);
  latest.current = action;

  const onSubmit = useCallback(async (e?: { preventDefault(): void }) => {
    e?.preventDefault();
    if (running.current) return; // busy state lags a same-tick double click
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await latest.current();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);

  return { onSubmit, busy, error };
}
