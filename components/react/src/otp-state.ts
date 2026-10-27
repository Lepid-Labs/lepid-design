// Pure cell logic behind OtpInput. The code is one string of digits, filled
// left to right with no gaps; the cells are only a view of it. DOM-free so
// node:test can run it (so it imports nothing).

export interface OtpStep {
  code: string;
  /** The cell to focus next. */
  focus: number;
}

/** The cell that takes the next digit: the first empty one, or the last cell. */
export function otpActiveIndex(code: string, length: number): number {
  return Math.min(code.length, length - 1);
}

/** What the user put into a cell, from its new value: drops the digit it already
 *  held when the caret sat beside that digit instead of selecting it. */
export function otpTyped(old: string, raw: string): string {
  if (!old || raw.length <= old.length) return raw;
  if (raw.startsWith(old)) return raw.slice(old.length);
  if (raw.endsWith(old)) return raw.slice(0, -old.length);
  return raw;
}

/** Cell `index` received `text`: one typed digit, a paste, or an autofill. A
 *  full-length code fills every cell from the first; anything shorter overwrites
 *  from `index` (or the first empty cell, if that comes sooner). Non-digits are
 *  dropped; empty `text` (a mobile keyboard's delete) clears the cell. */
export function otpInput(code: string, index: number, text: string, length: number): OtpStep {
  if (text === "") return otpErase(code, index, "Delete");
  const digits = text.replace(/\D/g, "");
  if (!digits) return { code, focus: index };
  if (digits.length >= length) return { code: digits.slice(0, length), focus: length - 1 };
  const at = Math.min(index, code.length);
  const next = (code.slice(0, at) + digits + code.slice(at + digits.length)).slice(0, length);
  return { code: next, focus: Math.min(at + digits.length, length - 1) };
}

/** Backspace clears the cell's digit, or on an empty cell steps back and clears
 *  the one before. Delete clears the cell's digit and stays. Later digits close the gap. */
export function otpErase(code: string, index: number, key: "Backspace" | "Delete"): OtpStep {
  if (index < code.length) return { code: code.slice(0, index) + code.slice(index + 1), focus: index };
  if (key === "Delete" || !code) return { code, focus: Math.min(index, code.length) };
  return { code: code.slice(0, -1), focus: code.length - 1 };
}

/** The cell an arrow, Home or End key moves to, or null for any other key.
 *  Movement stops at the active cell: there is nothing to edit beyond it. */
export function otpMove(key: string, index: number, code: string, length: number): number | null {
  const last = otpActiveIndex(code, length);
  if (key === "ArrowLeft") return Math.max(0, index - 1);
  if (key === "ArrowRight") return Math.min(last, index + 1);
  if (key === "Home") return 0;
  if (key === "End") return last;
  return null;
}
