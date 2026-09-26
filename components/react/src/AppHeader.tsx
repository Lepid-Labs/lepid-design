import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { useShell } from "./AppShell.js";
import { cx } from "./cx.js";
import type { PolyProps } from "./poly.js";

export interface AppHeaderProps extends HTMLAttributes<HTMLElement> {
  /** Logo mark and/or app name. */
  brand?: ReactNode;
  /** Makes the brand a link (usually home). */
  brandHref?: string;
  /** Usually a `TopNav`. */
  nav?: ReactNode;
  /** Right-aligned: search, theme switcher, account menu. */
  actions?: ReactNode;
  /** Accessible name of the side-nav toggle. */
  toggleLabel?: string;
}

/** The shell's sticky top bar. Inside an `AppShell` with a side nav it leads
 *  with the toggle that collapses the rail (wide) or opens the drawer (narrow). */
export function AppHeader({
  brand,
  brandHref,
  nav,
  actions,
  toggleLabel = "Toggle navigation",
  className,
  children,
  ...rest
}: AppHeaderProps) {
  return (
    <header className={cx("ld-shell__header", className)} {...rest}>
      <ShellToggle label={toggleLabel} />
      {brand != null &&
        (brandHref ? (
          <a className="ld-shell__brand" href={brandHref}>
            {brand}
          </a>
        ) : (
          <span className="ld-shell__brand">{brand}</span>
        ))}
      {nav}
      {children}
      {actions != null && <div className="ld-shell__actions">{actions}</div>}
    </header>
  );
}

export interface ShellToggleProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onClick"> {
  label?: string;
}

/** The side-nav toggle: collapses the rail (wide) or opens the drawer
 *  (narrow). `AppHeader` renders one; place it yourself (e.g. in the
 *  `SideNav` footer) in a shell without a header. Renders nothing outside an
 *  `AppShell` with a nav. */
export function ShellToggle({ label = "Toggle navigation", className, children, ...rest }: ShellToggleProps) {
  const shell = useShell();
  if (!shell?.hasNav) return null;
  return (
    <button
      type="button"
      className={cx("ld-shell__toggle", className)}
      aria-label={label}
      aria-controls={shell.navId}
      aria-expanded={shell.expanded}
      onClick={shell.toggleNav}
      {...rest}
    >
      {children ?? <MenuIcon />}
    </button>
  );
}

export type TopNavProps = HTMLAttributes<HTMLElement>;

/** Horizontal page links for the header; scrolls sideways when narrow. */
export function TopNav({ className, ...rest }: TopNavProps) {
  return <nav className={cx("ld-topnav", className)} {...rest} />;
}

export type TopNavItemProps<E extends ElementType = "a"> = PolyProps<
  E,
  { active?: boolean; className?: string; children?: ReactNode }
>;

/** A header link. `active` sets `aria-current="page"` (router links that set
 *  it themselves light up the same way). */
export function TopNavItem<E extends ElementType = "a">({ as, active, className, ...rest }: TopNavItemProps<E>) {
  const Tag: ElementType = as ?? "a";
  return (
    <Tag
      className={cx("ld-topnav__item", className)}
      {...(active ? { "aria-current": "page" } : {})}
      {...rest}
    />
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}
