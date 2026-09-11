import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. Maps to .ld-btn--{variant}. */
  variant?: "default" | "primary" | "accent" | "danger";
  /** Size. "sm" maps to .ld-btn--sm for inline/table-row actions; "md" is the default. */
  size?: "sm" | "md";
}

export function Button({ variant = "default", size = "md", className, ...rest }: ButtonProps) {
  const classes = ["ld-btn"];
  if (variant !== "default") classes.push(`ld-btn--${variant}`);
  if (size === "sm") classes.push("ld-btn--sm");
  if (className) classes.push(className);
  return <button className={classes.join(" ")} {...rest} />;
}
