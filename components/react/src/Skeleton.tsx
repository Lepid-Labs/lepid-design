import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "./cx.js";

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  /** `text` is a line of body copy, `circle` an avatar, `block` an image or card. */
  variant?: "text" | "circle" | "block";
  /** Text only: render this many lines; the last one is shorter, like a paragraph's. */
  lines?: number;
  /** Any CSS length. Circle takes `width` as its diameter. */
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
}

/** Placeholder in the shape of content that is loading. Hidden from assistive
 *  tech: put `aria-busy="true"` on the region being loaded instead. */
export function Skeleton({ variant = "text", lines = 1, width, height, className, style, ...rest }: SkeletonProps) {
  const one = (i: number) => (
    <span
      key={i}
      aria-hidden="true"
      className={cx("ld-skeleton", `ld-skeleton--${variant}`, className)}
      style={{ width: width ?? (i > 0 && i === lines - 1 ? "60%" : undefined), height, ...style }}
      {...rest}
    />
  );
  return variant === "text" && lines > 1 ? <>{Array.from({ length: lines }, (_, i) => one(i))}</> : one(0);
}
