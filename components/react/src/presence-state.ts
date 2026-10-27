// Pure maths behind PresenceCursors and AvatarStack, kept DOM-free so node:test
// can run it without a renderer (so it imports nothing). No networking: the app
// reports where each person's pointer is; this decides their colour, how the
// cursor glides between reports, when it fades, and who fits in the stack.

/** Colour slots per theme (--ld-presence-1..8). */
export const PRESENCE_COLORS = 8;
/** A cursor that has not moved for this long fades out. */
export const PRESENCE_IDLE_MS = 10_000;
/** Half-life of the glide towards a cursor's latest reported position. Reports
 *  arrive ~10 times a second; at 50 ms a cursor covers most of each gap before
 *  the next one lands, so it moves instead of teleporting. */
export const CURSOR_HALF_LIFE_MS = 50;

export interface Point {
  x: number;
  y: number;
}

/** A stable colour slot, 1..count, from a user id (FNV-1a): the same person gets
 *  the same colour in every session and on every client. Each theme maps the
 *  slots to a palette that holds contrast against its own background. */
export function presenceColor(id: string, count = PRESENCE_COLORS): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % count) + 1;
}

/** One frame of glide: move `from` towards `to` by the share of the gap that
 *  `dt` ms of exponential decay closes, snapping once within half a pixel. A
 *  first sighting, or reduced motion, jumps straight there. */
export function followPoint(from: Point | undefined, to: Point, dt: number, reduce = false, halfLife = CURSOR_HALF_LIFE_MS): Point {
  if (!from || reduce) return { x: to.x, y: to.y };
  const k = 1 - 2 ** (-Math.max(0, dt) / halfLife);
  const x = from.x + (to.x - from.x) * k;
  const y = from.y + (to.y - from.y) * k;
  return Math.abs(to.x - x) < 0.5 && Math.abs(to.y - y) < 0.5 ? { x: to.x, y: to.y } : { x, y };
}

/** Has this cursor sat still long enough to fade? Unknown means active. */
export function isIdle(lastSeen: number | undefined, now: number, idleMs = PRESENCE_IDLE_MS): boolean {
  return lastSeen !== undefined && now - lastSeen >= idleMs;
}

/** "Ada Lovelace" → "AL", "cher" → "C"; whole characters, so emoji and accents survive. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const first = (w: string) => Array.from(w)[0].toUpperCase();
  return words.length === 1 ? first(words[0]) : first(words[0]) + first(words[words.length - 1]);
}

/** Who fits in a stack of `max` slots. When people overflow, the last slot is the
 *  "+N" counter, so it never reads "+1" (that slot would hold the person). */
export function avatarOverflow<T>(people: readonly T[], max: number): { shown: T[]; hidden: T[] } {
  if (people.length <= max) return { shown: [...people], hidden: [] };
  const keep = Math.max(0, max - 1);
  return { shown: people.slice(0, keep), hidden: people.slice(keep) };
}
