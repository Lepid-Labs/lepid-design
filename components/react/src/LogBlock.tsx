import { forwardRef, useCallback, useLayoutEffect, useRef, type HTMLAttributes, type Ref, type UIEvent } from "react";
import { isPinnedToBottom, logAttrs } from "./log-state.js";

export type LogBlockProps = HTMLAttributes<HTMLPreElement> & {
  /** Keep the view on the newest line as content grows — but only while the
   *  reader is already at the bottom; scrolling up pauses it. */
  follow?: boolean;
  /** Height cap (number = px). Defaults to the theme's 420px. */
  maxHeight?: number | string;
  /** Announce appended lines to assistive tech (role="log"). Turn off for very
   *  chatty streams. Default true. */
  live?: boolean;
};

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** Terminal/log `<pre>`: bounded, scrolling, wrapped mono output (.ld-pre--log). */
export const LogBlock = forwardRef<HTMLPreElement, LogBlockProps>(function LogBlock(
  { follow, maxHeight, live, className, style, onScroll, children, ...rest },
  ref,
) {
  const el = useRef<HTMLPreElement | null>(null);
  const pinned = useRef(true);
  const attrs = logAttrs({ maxHeight, live, className });

  const attach = useCallback(
    (node: HTMLPreElement | null) => {
      el.current = node;
      setRef(ref, node);
    },
    [ref],
  );

  function handleScroll(e: UIEvent<HTMLPreElement>) {
    const t = e.currentTarget;
    pinned.current = isPinnedToBottom(t.scrollTop, t.scrollHeight, t.clientHeight);
    onScroll?.(e);
  }

  useLayoutEffect(() => {
    const node = el.current;
    if (follow && node && pinned.current) node.scrollTop = node.scrollHeight;
  }, [follow, children]);

  return (
    <pre
      ref={attach}
      {...attrs}
      style={{ ...attrs.style, ...style }}
      onScroll={handleScroll}
      {...rest}
    >
      {children}
    </pre>
  );
});
