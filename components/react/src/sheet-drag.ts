// Pure drag-to-dismiss rule behind Sheet's grab handle, kept DOM-free so
// node:test can run it (so it imports nothing).

/** Dragged past this share of its height, a released sheet closes. */
export const SHEET_DISMISS_FRACTION = 0.3;
/** Flung down faster than this (px/ms), a released sheet closes however far it went. */
export const SHEET_FLING_SPEED = 0.6;

/** How far the sheet follows a drag: down only, never up past its open place. */
export const sheetOffset = (dragged: number) => Math.max(0, dragged);

/** Whether a released drag dismisses the sheet: far enough, or fast enough and
 *  still moving down. Anything else springs back. */
export function shouldDismissSheet(
  { offset, height, velocity }: { offset: number; height: number; velocity: number },
  fraction = SHEET_DISMISS_FRACTION,
  fling = SHEET_FLING_SPEED,
): boolean {
  return offset > height * fraction || (offset > 0 && velocity > fling);
}
