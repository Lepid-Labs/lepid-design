import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx.js";

/** Sets layout custom properties alongside any caller style. */
function vars(style: CSSProperties | undefined, entries: Record<string, string | undefined>): CSSProperties | undefined {
  const set = Object.entries(entries).filter(([, v]) => v !== undefined);
  return set.length ? ({ ...Object.fromEntries(set), ...style } as CSSProperties) : style;
}

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  /** Small line above the title: a section name or breadcrumb. */
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned buttons. */
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, subtitle, actions, className, ...rest }: PageHeaderProps) {
  return (
    <header className={cx("ld-page__header", className)} {...rest}>
      <div className="ld-page__heading">
        {eyebrow != null && <p className="ld-page__eyebrow">{eyebrow}</p>}
        <h1 className="ld-page__title">{title}</h1>
        {subtitle != null && <p className="ld-page__subtitle">{subtitle}</p>}
      </div>
      {actions != null && <div className="ld-page__actions">{actions}</div>}
    </header>
  );
}

export interface PageProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Column width: narrow 48rem (chat, prose, forms), default 72rem, wide 96rem, full. */
  width?: "narrow" | "default" | "wide" | "full";
  /** Renders a `PageHeader` when set. */
  title?: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/** A centered page column inside `AppShell`'s main. */
export function Page({ width = "default", title, eyebrow, subtitle, actions, className, children, ...rest }: PageProps) {
  return (
    <div className={cx("ld-page", width !== "default" && `ld-page--${width}`, className)} {...rest}>
      {title != null && <PageHeader title={title} eyebrow={eyebrow} subtitle={subtitle} actions={actions} />}
      {children}
    </div>
  );
}

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** Smallest column width before the grid drops a column (default 18rem). */
  min?: string;
}

/** Dashboard grid: as many equal columns of at least `min` as fit. */
export function Grid({ min, className, style, ...rest }: GridProps) {
  return <div className={cx("ld-grid", className)} style={vars(style, { "--ld-grid-min": min })} {...rest} />;
}

export interface SplitProps extends HTMLAttributes<HTMLDivElement> {
  /** The master pane. `children` is the detail. */
  list: ReactNode;
  /** Preferred list width (default 20rem). The panes stack once the detail would drop below 60%. */
  listWidth?: string;
}

/** List + detail. */
export function Split({ list, listWidth, className, style, children, ...rest }: SplitProps) {
  return (
    <div className={cx("ld-split", className)} style={vars(style, { "--ld-split-list": listWidth })} {...rest}>
      <div className="ld-split__list">{list}</div>
      <div className="ld-split__detail">{children}</div>
    </div>
  );
}

export interface AsideLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Sticky side column: table of contents, related items, filters. */
  aside: ReactNode;
  /** Preferred aside width (default 16rem). */
  asideWidth?: string;
  /** Accessible name for the aside landmark. */
  asideLabel?: string;
}

/** Content with a sticky right-hand aside; stacks when narrow. */
export function AsideLayout({ aside, asideWidth, asideLabel, className, style, children, ...rest }: AsideLayoutProps) {
  return (
    <div className={cx("ld-aside-layout", className)} style={vars(style, { "--ld-aside-w": asideWidth })} {...rest}>
      <div className="ld-aside-layout__main">{children}</div>
      <aside className="ld-aside-layout__aside" aria-label={asideLabel}>
        {aside}
      </aside>
    </div>
  );
}

export interface CenterProps extends HTMLAttributes<HTMLDivElement> {
  /** Width of the centered column (default 26rem). */
  maxWidth?: string;
}

/** One narrow column centered in the remaining height: sign in, empty states. */
export function Center({ maxWidth, className, style, ...rest }: CenterProps) {
  return <div className={cx("ld-center", className)} style={vars(style, { "--ld-center-max": maxWidth })} {...rest} />;
}
