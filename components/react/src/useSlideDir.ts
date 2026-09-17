import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { slideDir } from "./slide-dir.js";

// Layout effect on the client so data-ld-dir lands in the same frame as the
// selection change (a transition reads its timing when it starts); plain
// effect on the server, where React 18 warns about layout effects.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Ref for an indicator track (`.ld-tabs`, `.ld-btn-group`). After every render
 *  it finds the child matching `activeSelector` and, when that moved, stamps
 *  `data-ld-dir="forward" | "back"` on the track — the theme reads it to pick
 *  which edge of the sliding indicator leads. Read from the DOM, so it works
 *  when the active state lives in the children (`aria-pressed` on `Button`s). */
export function useSlideDir<T extends HTMLElement>(activeSelector: string): RefObject<T | null> {
  const ref = useRef<T>(null);
  const prev = useRef(-1);
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = Array.from(el.children).findIndex((c) => c.matches(activeSelector));
    const dir = slideDir(prev.current, next);
    if (dir) el.dataset.ldDir = dir;
    prev.current = next;
  });
  return ref;
}
