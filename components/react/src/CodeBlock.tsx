import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { IconButton } from "./IconButton.js";
import { COPIED_MS, copyAnnouncement, copyDataAttr, copyText, type CopyStatus } from "./copy-state.js";
import { cx } from "./cx.js";

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  /** Accessible name and tooltip of the copy button. Default "Copy code". */
  copyLabel?: string;
  /** Class for the `.ld-pre-wrap` wrapper (`className` goes on the `<pre>`). */
  wrapClassName?: string;
};

const glyph = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** `.ld-pre` with a copy-to-clipboard control in its top-right corner. Copies
 *  the block's text content; for ~1.5s the button shows a check (or a danger
 *  tint on failure) and a polite live region announces the result. */
export function CodeBlock({ copyLabel = "Copy code", wrapClassName, className, children, ...rest }: CodeBlockProps) {
  const pre = useRef<HTMLPreElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [status, setStatus] = useState<CopyStatus>("idle");

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    const result = await copyText(pre.current?.textContent ?? "");
    clearTimeout(timer.current);
    setStatus(result);
    timer.current = setTimeout(() => setStatus("idle"), COPIED_MS);
  }

  return (
    <div className={cx("ld-pre-wrap", wrapClassName)}>
      <pre ref={pre} className={cx("ld-pre", className)} {...rest}>
        {children}
      </pre>
      <IconButton label={copyLabel} className="ld-pre-copy" data-ld-copy={copyDataAttr(status)} onClick={copy}>
        <svg className="ld-pre-copy__icon" {...glyph}>
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
          <path d="M13 4.5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h.5" />
        </svg>
        <svg className="ld-pre-copy__check" {...glyph}>
          <path d="m4 10.5 4 4 8-9" />
        </svg>
      </IconButton>
      <span className="ld-pre-copy-status" aria-live="polite">
        {copyAnnouncement(status)}
      </span>
    </div>
  );
}
