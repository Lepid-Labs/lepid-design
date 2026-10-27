// Pure colour maths behind ColorField, kept DOM-free so node:test can run it (so
// it imports nothing). Colours travel as "#rrggbb", the form the native colour
// input reads and writes.

/** A typed hex colour as "#rrggbb": "#ABC", "abc", " #AaBbCc " all normalise;
 *  anything else (a name, rgb(), a stray character, an alpha digit pair) is
 *  undefined, so the field can say what it expects. */
export function normalizeHex(input: string): string | undefined {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return undefined;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return `#${hex.toLowerCase()}`;
}

/** WCAG 2 relative luminance of a "#rrggbb" colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio of two "#rrggbb" colours, 1..21, in either order. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastGrade = "AAA" | "AA" | "AA large" | "fail";

/** The WCAG level a ratio reaches for text: 7 (AAA), 4.5 (AA), 3 (AA for large
 *  text, and for icons and borders). Compared unrounded: 4.49 is not AA. */
export function contrastGrade(ratio: number): ContrastGrade {
  return ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large" : "fail";
}

/** A ratio as people read it: "4.5:1", truncated so a failing 4.49 never shows 4.5. */
export const formatContrast = (ratio: number) => `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`;
