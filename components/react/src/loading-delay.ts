// Pure timing behind useLoadingIndicator, kept DOM-free so node:test can run
// it without a renderer (so it imports nothing). A wait shorter than `delay`
// shows no indicator at all; once one shows, it stays at least `minVisible`
// so it never flashes.

export interface LoadingTiming {
  /** ms of loading before any indicator appears. */
  delay: number;
  /** ms an indicator stays once it has appeared, even if loading ends sooner. */
  minVisible: number;
}

export const LOADING_TIMING: LoadingTiming = { delay: 400, minVisible: 500 };

/** One stretch of loading: when it began and, once over, when it ended. */
export interface LoadingWindow {
  start: number;
  end?: number;
}

/** Whether the indicator shows at `now`, and when that answer next changes
 *  (`next` is undefined while it only changes on the next loading flip). */
export function loadingIndicator(
  win: LoadingWindow | undefined,
  now: number,
  { delay, minVisible }: LoadingTiming = LOADING_TIMING,
): { visible: boolean; next?: number } {
  if (!win) return { visible: false };
  const showAt = win.start + delay;
  if (win.end !== undefined && win.end <= showAt) return { visible: false }; // done before it was due
  if (now < showAt) return { visible: false, next: showAt };
  if (win.end === undefined) return { visible: true };
  const hideAt = Math.max(win.end, showAt + minVisible);
  return now < hideAt ? { visible: true, next: hideAt } : { visible: false };
}

/** Fold a loading flip into the window. Loading that resumes while the indicator
 *  is still up continues the same window, so the indicator does not blink. */
export function trackLoading(
  win: LoadingWindow | undefined,
  loading: boolean,
  now: number,
  timing: LoadingTiming = LOADING_TIMING,
): LoadingWindow | undefined {
  if (!loading) return win && win.end === undefined ? { ...win, end: now } : win;
  if (win && win.end === undefined) return win; // already loading
  if (win && loadingIndicator(win, now, timing).visible) return { start: win.start };
  return { start: now };
}
