// Pure copy logic behind CodeBlock, kept DOM-free so it can be tested under
// node:test without a renderer (so it imports nothing — Node runs the .ts
// source and cannot resolve the .js specifiers the build uses).

/** How long the copied / failed state holds before the control reverts. */
export const COPIED_MS = 1500;

export type CopyStatus = "idle" | "copied" | "failed";

/** The slice of `navigator.clipboard` the copy control needs. */
export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

/** Write `text` to the clipboard. Never throws: a missing clipboard (insecure
 *  context, old browser) or a rejected write (permission denied) is "failed". */
export async function copyText(
  text: string,
  clipboard: ClipboardLike | undefined = (globalThis as { navigator?: { clipboard?: ClipboardLike } }).navigator
    ?.clipboard,
): Promise<"copied" | "failed"> {
  if (!clipboard) return "failed";
  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Value for the button's `data-ld-copy` hook; absent while idle. */
export function copyDataAttr(status: CopyStatus): "copied" | "failed" | undefined {
  return status === "idle" ? undefined : status;
}

/** Text for the polite live region; empty while idle so nothing is announced. */
export function copyAnnouncement(status: CopyStatus): string {
  if (status === "copied") return "Copied to clipboard";
  if (status === "failed") return "Copy failed";
  return "";
}
