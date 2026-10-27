// Pure timing behind Tooltip, kept DOM-free so node:test can run it (so it
// imports nothing).

/** Hover or focus must rest this long before a tooltip shows. */
export const TOOLTIP_DELAY_MS = 400;
/** A tooltip that closed this recently hands off: the next one shows at once. */
export const TOOLTIP_HANDOFF_MS = 300;
/** Grace after the pointer leaves, so it can cross onto the tooltip (WCAG 1.4.13). */
export const TOOLTIP_HIDE_MS = 120;

/** How long to wait before showing a tooltip: no wait while another one is open
 *  or has just closed (moving along a toolbar), the full delay otherwise. */
export function tooltipDelay(
  now: number,
  { open, lastHiddenAt }: { open: boolean; lastHiddenAt?: number },
  delay = TOOLTIP_DELAY_MS,
  handoff = TOOLTIP_HANDOFF_MS,
): number {
  if (open) return 0;
  return lastHiddenAt !== undefined && now - lastHiddenAt < handoff ? 0 : delay;
}
