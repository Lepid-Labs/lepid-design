import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx.js";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** `first-use`: nothing made yet, invite the first one. `no-results`: a search or
   *  filter matched nothing, offer the way out. `cleared`: everything is done. */
  variant?: "first-use" | "no-results" | "cleared";
  /** Decorative glyph (an inline `<svg>`); hidden from assistive tech. */
  icon?: ReactNode;
  title: ReactNode;
  /** Heading element for the title, to fit the page outline. Default `h3`. */
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** The next step: one primary `Button`, optionally a second, quieter one. */
  actions?: ReactNode;
  /** Body copy: what this space is for, or why it is empty. */
  children?: ReactNode;
}

/** What a list, table or panel shows when it has nothing in it. */
export function EmptyState({
  variant,
  icon,
  title,
  titleAs: Title = "h3",
  actions,
  className,
  children,
  ...rest
}: EmptyStateProps) {
  return (
    <div className={cx("ld-empty", variant && `ld-empty--${variant}`, className)} {...rest}>
      {icon !== undefined && (
        <span className="ld-empty__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <Title className="ld-empty__title">{title}</Title>
      {children !== undefined && <div className="ld-empty__body">{children}</div>}
      {actions !== undefined && <div className="ld-empty__actions">{actions}</div>}
    </div>
  );
}
