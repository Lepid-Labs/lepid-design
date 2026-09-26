import { useId, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { useShell } from "./AppShell.js";
import { cx } from "./cx.js";
import type { PolyProps } from "./poly.js";

export interface SideNavProps extends HTMLAttributes<HTMLElement> {
  /** Pinned to the bottom of the nav: settings, account, version. */
  footer?: ReactNode;
}

/** The left-hand nav: `SideNavSection`s of `SideNavItem`s. Pass it as
 *  `AppShell`'s `nav`. Give it an `aria-label` ("Main"). */
export function SideNav({ footer, className, children, ...rest }: SideNavProps) {
  return (
    <nav className={cx("ld-sidenav", className)} {...rest}>
      {children}
      {footer != null && <div className="ld-sidenav__footer">{footer}</div>}
    </nav>
  );
}

export interface SideNavSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Group heading; hidden on the collapsed rail (a rule separates groups). */
  title?: ReactNode;
}

export function SideNavSection({ title, className, children, ...rest }: SideNavSectionProps) {
  const headingId = useId();
  return (
    <div
      className={cx("ld-sidenav__section", className)}
      role="group"
      aria-labelledby={title != null ? headingId : undefined}
      {...rest}
    >
      {title != null && (
        <div className="ld-sidenav__heading" id={headingId}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export type SideNavItemProps<E extends ElementType = "a"> = PolyProps<
  E,
  {
    /** Shown alone on the collapsed rail and the tab bar — give every item one there. */
    icon?: ReactNode;
    /** Trailing count or status, e.g. `<Badge size="sm">3</Badge>`. */
    badge?: ReactNode;
    /** Sets `aria-current="page"`. */
    active?: boolean;
    className?: string;
    children?: ReactNode;
  }
>;

/** One nav destination. Renders an `<a>`, or `as` (a router Link). On the
 *  collapsed rail a string label doubles as the hover tooltip. */
export function SideNavItem<E extends ElementType = "a">({
  as,
  icon,
  badge,
  active,
  className,
  children,
  ...rest
}: SideNavItemProps<E>) {
  const shell = useShell();
  const Tag: ElementType = as ?? "a";
  const tooltip = shell?.collapsed && !shell.narrow && typeof children === "string" ? children : undefined;
  return (
    <Tag
      className={cx("ld-sidenav__item", className)}
      title={tooltip}
      {...(active ? { "aria-current": "page" } : {})}
      {...rest}
    >
      {icon != null && (
        <span className="ld-sidenav__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ld-sidenav__label">{children}</span>
      {badge != null && <span className="ld-sidenav__badge">{badge}</span>}
    </Tag>
  );
}
