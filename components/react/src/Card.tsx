import type { HTMLAttributes } from "react";
import { cx } from "./cx.js";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** One clickable card: hover lift, press, focus ring. Mark its primary link or
   *  button with `className="ld-card__link"`; that link's hit area covers the card,
   *  and nested links and buttons keep their own clicks. Maps to .ld-card--interactive. */
  interactive?: boolean;
};

export function Card({ interactive, className, ...rest }: CardProps) {
  return <div className={cx("ld-card", interactive && "ld-card--interactive", className)} {...rest} />;
}
