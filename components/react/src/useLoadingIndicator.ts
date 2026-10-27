import { useEffect, useState } from "react";
import { LOADING_TIMING, loadingIndicator, trackLoading, type LoadingTiming, type LoadingWindow } from "./loading-delay.js";

/** Whether to show a loading indicator (spinner, skeleton) for `loading`:
 *  false for waits under `timing.delay`, and once true it stays true for at
 *  least `timing.minVisible`, so a fast response never flashes one. */
export function useLoadingIndicator(loading: boolean, timing: LoadingTiming = LOADING_TIMING): boolean {
  const [win, setWin] = useState<LoadingWindow>();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = Date.now();
    setWin((w) => trackLoading(w, loading, t, timing));
    setNow(t);
  }, [loading]); // timing is read at each flip; a new object per render must not count as one
  const { visible, next } = loadingIndicator(win, now, timing);
  useEffect(() => {
    if (next === undefined) return;
    const id = setTimeout(() => setNow(Date.now()), Math.max(0, next - Date.now()));
    return () => clearTimeout(id);
  }, [next]);
  return visible;
}
