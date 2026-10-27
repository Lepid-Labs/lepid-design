// Pure formatting behind MaskedInput. A pattern is literal text around slots:
// "9" takes a digit, "a" a letter, "*" either. The caret is tracked by how many
// data characters sit before it, so a separator the mask inserts never moves it
// off the character just typed. DOM-free so node:test can run it (imports nothing).

const SLOTS: Record<string, RegExp> = { "9": /\d/, a: /[a-z]/i, "*": /[a-z\d]/i };

/** Ready-made patterns. Amex is "9999 999999 99999". */
export const MASKS = {
  card: "9999 9999 9999 9999",
  phone: "(999) 999-9999",
  expiry: "99/99",
  date: "99/99/9999",
} as const;

export interface MaskResult {
  /** What the field shows. */
  value: string;
  /** The data characters only: what to store and submit. */
  raw: string;
  /** Where the caret goes in `value`. */
  caret: number;
}

// shortcut: a character a slot could take is never treated as a literal, so a mask cannot
// hold data-like literals (a "+1" phone prefix); match literals by position if one needs it.
function dataTest(pattern: string): (ch: string | undefined) => boolean {
  const slots = [...new Set(pattern)].flatMap((c) => SLOTS[c] ?? []);
  return (ch) => ch !== undefined && slots.some((re) => re.test(ch));
}

/** Reformat `value` (the field's text after an edit or paste) to `pattern`,
 *  carrying the caret along. Characters no slot takes are dropped, data past the
 *  last slot is cut off, and a trailing separator is never added (so Backspace
 *  can always remove one). */
export function applyMask(value: string, pattern: string, caret = value.length): MaskResult {
  const isData = dataTest(pattern);
  let data = "";
  let before = 0;
  for (let i = 0; i < value.length; i++) {
    if (!isData(value[i])) continue;
    data += value[i];
    if (i < caret) before++;
  }
  let out = "";
  let raw = "";
  let p = 0;
  let at = before === 0 ? 0 : -1;
  for (let r = 0; r < data.length; r++) {
    let q = p;
    while (q < pattern.length && !SLOTS[pattern[q]]) q++;
    if (q === pattern.length) break; // every slot is filled: the rest is overflow
    if (SLOTS[pattern[q]].test(data[r])) {
      out += pattern.slice(p, q) + data[r];
      raw += data[r];
      p = q + 1;
    }
    if (r + 1 === before) at = out.length;
  }
  return { value: out, raw, caret: at < 0 ? out.length : at };
}

/** Where to move a collapsed caret just before the browser runs Backspace or
 *  Delete, so the key removes the data character past any separators instead
 *  of a separator that applyMask would only put back. */
export function maskDeleteCaret(value: string, pattern: string, caret: number, key: "Backspace" | "Delete"): number {
  const isData = dataTest(pattern);
  let c = caret;
  if (key === "Backspace") while (c > 0 && !isData(value[c - 1])) c--;
  else while (c < value.length && !isData(value[c])) c++;
  return c;
}
