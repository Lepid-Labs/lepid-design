// Pure attribute logic behind StatusCard, kept DOM-free so it can be tested
// under node:test without a renderer (so it imports nothing — Node runs the
// .ts source and cannot resolve the .js specifiers the build uses).

export type StatusTone = "info" | "success" | "warning" | "danger";

/** `true` means "warning" — the default call-to-action ring. */
export function attentionTone(attention: boolean | StatusTone | undefined): StatusTone | undefined {
  if (attention === true) return "warning";
  if (!attention) return undefined;
  return attention;
}

export interface StatusCardAttrs {
  className: string;
  "data-ld-attention"?: StatusTone;
}

/** Root class list and data attributes for a given tone/attention state. */
export function statusCardAttrs(
  tone: StatusTone | undefined,
  attention: boolean | StatusTone | undefined,
  className?: string,
): StatusCardAttrs {
  const attrs: StatusCardAttrs = {
    className: ["ld-status-card", tone && `ld-status-card--${tone}`, className].filter(Boolean).join(" "),
  };
  const ring = attentionTone(attention);
  if (ring) attrs["data-ld-attention"] = ring;
  return attrs;
}

/** Restart the change flash on `el`: drop the attribute, reflow, set it again. */
export function replayFlash(el: {
  removeAttribute(name: string): void;
  setAttribute(name: string, value: string): void;
  readonly offsetWidth: number;
}): void {
  el.removeAttribute("data-ld-changed");
  void el.offsetWidth;
  el.setAttribute("data-ld-changed", "");
}
