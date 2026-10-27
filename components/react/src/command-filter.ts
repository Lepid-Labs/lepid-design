// Pure filtering, scoring and highlighting behind CommandPalette, kept DOM-free
// so node:test can run it (so it imports nothing).

/** Half-open [start, end) span of matched characters in a label. */
export type Range = [number, number];

export interface FuzzyMatch {
  score: number;
  ranges: Range[];
}

export interface CommandLike {
  id: string;
  label: string;
  /** Heading the command is listed under. */
  group?: string;
  /** Other words it answers to ("theme" for "Dark mode"); matched, not highlighted. */
  keywords?: string[];
}

export interface CommandResult<T> {
  item: T;
  ranges: Range[];
}

export interface CommandGroup<T> {
  label?: string;
  items: CommandResult<T>[];
}

const SUBSTRING = 1000; // any contiguous match beats any scattered one
const wordStart = (text: string, i: number) =>
  i === 0 || /[\s\-_./:(]/.test(text[i - 1]) || (/[a-z]/.test(text[i - 1]) && /[A-Z]/.test(text[i]));

/** Case-insensitive fuzzy match of `query` in `text`, or null. A contiguous
 *  substring scores best, more at the start or a word start and in a shorter
 *  text; otherwise every query character must appear in order (whitespace in the
 *  query ignored), scoring runs and word starts. */
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase();
  if (!q) return { score: 0, ranges: [] };
  const lower = text.toLowerCase();
  const at = lower.indexOf(q);
  if (at >= 0) {
    const bonus = at === 0 ? 200 : wordStart(text, at) ? 100 : 0;
    return { score: SUBSTRING + bonus - at - text.length / 100, ranges: [[at, at + q.length]] };
  }
  const chars = q.replace(/\s+/g, "");
  const ranges: Range[] = [];
  let score = 0;
  let from = 0;
  for (const c of chars) {
    const i = lower.indexOf(c, from);
    if (i < 0) return null;
    const last = ranges.at(-1);
    if (last && last[1] === i) (last[1] = i + 1), (score += 4);
    else ranges.push([i, i + 1]);
    score += 1 + (wordStart(text, i) ? 3 : 0);
    from = i + 1;
  }
  return { score: score - text.length / 100, ranges };
}

function score<T extends CommandLike>(item: T, query: string): FuzzyMatch | null {
  const label = fuzzyMatch(query, item.label);
  if (label) return label;
  const best = (item.keywords ?? []).reduce<number | null>((top, k) => {
    const m = fuzzyMatch(query, k);
    return m && (top === null || m.score > top) ? m.score : top;
  }, null);
  return best === null ? null : { score: best / 2, ranges: [] };
}

/** The groups to show for `query`. With no query: the `recent` ids first (in that
 *  order, under `recentLabel`), then every other item under its group, in input
 *  order. With one: only items whose label or a keyword matches, best first;
 *  groups are ordered by their best item. */
export function filterCommands<T extends CommandLike>(
  items: T[],
  query: string,
  recent: string[] = [],
  recentLabel = "Recent",
): CommandGroup<T>[] {
  const groups = new Map<string | undefined, CommandGroup<T> & { top: number }>();
  const add = (label: string | undefined, item: T, ranges: Range[], s: number) => {
    const g = groups.get(label) ?? { label, items: [], top: -Infinity };
    groups.set(label, g);
    g.items.push({ item, ranges });
    g.top = Math.max(g.top, s);
  };
  if (!query.trim()) {
    const byId = new Map(items.map((i) => [i.id, i]));
    const shown = recent.filter((id) => byId.has(id));
    for (const id of shown) add(recentLabel, byId.get(id)!, [], 0);
    for (const item of items) if (!shown.includes(item.id)) add(item.group, item, [], 0);
    return [...groups.values()].map(({ label, items }) => ({ label, items }));
  }
  const scored = items
    .map((item) => ({ item, m: score(item, query) }))
    .filter((r): r is { item: T; m: FuzzyMatch } => r.m !== null)
    .sort((a, b) => b.m.score - a.m.score); // stable: ties keep input order
  for (const { item, m } of scored) add(item.group, item, m.ranges, m.score);
  return [...groups.values()].sort((a, b) => b.top - a.top).map(({ label, items }) => ({ label, items }));
}

/** `text` cut into runs; `match` marks the ones inside `ranges` (sorted, disjoint). */
export function highlight(text: string, ranges: Range[]): Array<{ text: string; match: boolean }> {
  const out: Array<{ text: string; match: boolean }> = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) out.push({ text: text.slice(at, start), match: false });
    out.push({ text: text.slice(start, end), match: true });
    at = end;
  }
  if (at < text.length) out.push({ text: text.slice(at), match: false });
  return out;
}

/** `recent` with `id` moved to the front, at most `max` long. */
export const pushRecent = (recent: string[], id: string, max = 5) => [id, ...recent.filter((r) => r !== id)].slice(0, max);
