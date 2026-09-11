import { useEffect, useRef } from "react";
import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx.js";
import { replayFlash, statusCardAttrs, type StatusTone } from "./status-card.js";

export interface StatusCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "prefix"> {
  title: ReactNode;
  /** Renders the title as a link. */
  href?: string;
  /** Open `href` in a new tab (adds the noopener/noreferrer rel). */
  external?: boolean;
  /** Faint lead-in before the title — an owner, group, or namespace. */
  prefix?: ReactNode;
  /** Colors the left status edge. */
  tone?: StatusTone;
  /** Outline + glow ring calling for action; `true` means warning. */
  attention?: boolean | StatusTone;
  /** Bump (e.g. `Date.now()`) whenever the card's data changes to replay the flash. */
  changedAt?: number;
  /** Faint icon in the top-left corner (a lock, a pin). */
  watermark?: ReactNode;
  /** Right side of the head: badges, icon links. */
  meta?: ReactNode;
  /** Faint trailing text after `meta` — typically a relative time. */
  note?: ReactNode;
}

export function StatusCard({
  title,
  href,
  external,
  prefix,
  tone,
  attention,
  changedAt,
  watermark,
  meta,
  note,
  className,
  children,
  ...rest
}: StatusCardProps) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (changedAt && root.current) replayFlash(root.current);
  }, [changedAt]);

  const heading = (
    <>
      {prefix !== undefined && <span className="ld-status-card__prefix">{prefix}</span>}
      {title}
    </>
  );
  return (
    <div ref={root} {...statusCardAttrs(tone, attention, className)} {...rest}>
      {watermark !== undefined && (
        <span className="ld-status-card__watermark" aria-hidden="true">
          {watermark}
        </span>
      )}
      <div className="ld-status-card__head">
        {href ? (
          <a className="ld-status-card__title" href={href} {...linkTarget(external)}>
            {heading}
          </a>
        ) : (
          <span className="ld-status-card__title">{heading}</span>
        )}
        {(meta !== undefined || note !== undefined) && (
          <div className="ld-status-card__meta">
            {meta}
            {note !== undefined && <span className="ld-status-card__note">{note}</span>}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/** `<ul>` of rows — the card's list body. */
export function StatusCardRows({ className, ...rest }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cx("ld-status-card__rows", className)} {...rest} />;
}

export interface StatusCardRowProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "prefix"> {
  /** Narrow right-aligned lead column — an id, a number. */
  leading?: ReactNode;
  /** Compact trailing cluster — badges, counts, icons. */
  trailing?: ReactNode;
  external?: boolean;
}

/** One row: `<li>` wrapping an `<a>` when `href` is set, else a `<div>`. */
export function StatusCardRow({ leading, trailing, external, href, className, children, ...rest }: StatusCardRowProps) {
  const body = (
    <>
      {leading !== undefined && <span className="ld-status-card__row-lead">{leading}</span>}
      <span className="ld-status-card__row-main">{children}</span>
      {trailing !== undefined && <span className="ld-status-card__row-trail">{trailing}</span>}
    </>
  );
  const cls = cx("ld-status-card__row", className);
  return (
    <li>
      {href ? (
        <a className={cls} href={href} {...linkTarget(external)} {...rest}>
          {body}
        </a>
      ) : (
        <div className={cls} {...(rest as HTMLAttributes<HTMLDivElement>)}>
          {body}
        </div>
      )}
    </li>
  );
}

export interface StatusCardFooterProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  external?: boolean;
}

/** Faint footer line — an overflow link ("4 more…") or a plain summary. */
export function StatusCardFooter({ external, href, className, ...rest }: StatusCardFooterProps) {
  const cls = cx("ld-status-card__footer", className);
  return href ? (
    <a className={cls} href={href} {...linkTarget(external)} {...rest} />
  ) : (
    <div className={cls} {...(rest as HTMLAttributes<HTMLDivElement>)} />
  );
}

/** Empty-state line under the head ("No open issues"). */
export function StatusCardEmpty({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx("ld-status-card__empty", className)} {...rest} />;
}

function linkTarget(external: boolean | undefined) {
  return external ? { target: "_blank", rel: "noopener noreferrer" } : {};
}
