// Pure tag parsing behind TagInput, kept DOM-free so it can be tested under node:test
// without a renderer (so it imports nothing — Node runs the .ts source and cannot resolve
// .js specifiers).

/** Typed or pasted text split into tags at commas and newlines, trimmed, blanks dropped. */
export function parseTags(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** `tags` plus the tags in `text` it doesn't have yet, compared case-blind, so the first
 *  spelling wins. */
export function addTags(tags: readonly string[], text: string): string[] {
  const seen = new Set(tags.map((t) => t.toLowerCase()));
  const out = [...tags];
  for (const tag of parseTags(text)) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}
