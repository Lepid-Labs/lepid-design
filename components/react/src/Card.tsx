import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...rest }: CardProps) {
  return <div className={className ? `ld-card ${className}` : "ld-card"} {...rest} />;
}
