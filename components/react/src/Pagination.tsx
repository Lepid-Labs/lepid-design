import { useId } from "react";
import type { HTMLAttributes, MouseEvent, ReactNode } from "react";
import { Button } from "./Button.js";
import { cx } from "./cx.js";
import { pageRange, pageSpan } from "./page-range.js";

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  /** Current page, 1-based. */
  page: number;
  pageCount: number;
  /** A page was picked. With `href`, call `event.preventDefault()` to route client-side. */
  onPageChange?: (page: number, event: MouseEvent<HTMLElement>) => void;
  /** URL of each page: pages render as links, so reloads, Back and shared links keep the page. */
  href?: (page: number) => string;
  /** Pages shown either side of the current one. Default 1. */
  siblings?: number;
  /** Landmark name. Default "Pagination". */
  label?: string;
  previousLabel?: ReactNode;
  nextLabel?: ReactNode;
}

const chevron = (d: string) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Numbered pages in a `nav`: previous and next, first and last, the current page's
 *  neighbours and an ellipsis for each gap (`pageRange`), `aria-current="page"` on
 *  the current one. The item count stays fixed, so controls don't move under the pointer. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  href,
  siblings = 1,
  label = "Pagination",
  previousLabel = "Previous",
  nextLabel = "Next",
  className,
  ...rest
}: PaginationProps) {
  const link = (p: number, content: ReactNode, cls: string, extra: Record<string, string | undefined> = {}) => {
    const off = p < 1 || p > pageCount;
    const props = {
      className: cx("ld-pagination__link", cls),
      onClick: off ? undefined : (e: MouseEvent<HTMLElement>) => onPageChange?.(p, e),
      ...extra,
    };
    // aria-disabled, not disabled: Next keeps focus when it reaches the last page
    // (a link without href is not focusable, so an "off" link keeps its role and tab stop)
    if (href) {
      return off ? (
        <a role="link" tabIndex={0} aria-disabled="true" {...props}>{content}</a>
      ) : (
        <a href={href(p)} {...props}>{content}</a>
      );
    }
    return <button type="button" aria-disabled={off || undefined} {...props}>{content}</button>;
  };
  let gap = 0;
  return (
    <nav aria-label={label} className={cx("ld-pagination", className)} {...rest}>
      <ul className="ld-pagination__list">
        <li>{link(page - 1, <>{chevron("M10 3.5 5.5 8l4.5 4.5")}<span className="ld-pagination__text">{previousLabel}</span></>, "ld-pagination__prev")}</li>
        {pageRange(page, pageCount, siblings).map((item) =>
          item === "ellipsis" ? (
            <li key={`gap${gap++}`} className="ld-pagination__ellipsis" aria-hidden="true">…</li>
          ) : (
            <li key={item}>
              {link(item, item, "ld-pagination__page", {
                "aria-label": `Page ${item}`,
                "aria-current": item === page ? "page" : undefined,
              })}
            </li>
          ),
        )}
        <li>{link(page + 1, <><span className="ld-pagination__text">{nextLabel}</span>{chevron("M6 3.5 10.5 8 6 12.5")}</>, "ld-pagination__next")}</li>
      </ul>
    </nav>
  );
}

export interface PageSummaryProps extends HTMLAttributes<HTMLParagraphElement> {
  page: number;
  pageSize: number;
  total: number;
  /** Default "Showing 21–40 of 312". */
  format?: (from: number, to: number, total: number) => string;
}

const showing = (from: number, to: number, total: number) =>
  total === 0 ? "No results" : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`;

/** "Showing 21–40 of 312", announced politely when the page changes. */
export function PageSummary({ page, pageSize, total, format = showing, className, ...rest }: PageSummaryProps) {
  const { from, to } = pageSpan(page, pageSize, total);
  return (
    <p role="status" className={cx("ld-pagination__summary", className)} {...rest}>
      {format(from, to, total)}
    </p>
  );
}

export interface PageSizeSelectProps {
  value: number;
  onValueChange: (size: number) => void;
  /** Default 10, 20, 50, 100. */
  options?: readonly number[];
  /** Default "Rows per page". */
  label?: ReactNode;
  className?: string;
}

/** Labelled native select for the page size. Keep the first visible row on screen
 *  when it changes: `setPage(pageAfterResize(page, old, size))`. */
export function PageSizeSelect({ value, onValueChange, options = [10, 20, 50, 100], label = "Rows per page", className }: PageSizeSelectProps) {
  const id = useId();
  return (
    <span className={cx("ld-pagination__size", className)}>
      <label className="ld-label" htmlFor={id}>{label}</label>
      <select id={id} className="ld-select" value={value} onChange={(e) => onValueChange(Number(e.target.value))}>
        {options.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </span>
  );
}

export interface LoadMoreProps {
  /** Rows on screen. */
  shown: number;
  /** Rows in all, when the source knows (a cursor often doesn't). */
  total?: number;
  /** More rows exist after the cursor. Default `shown < total`. */
  hasMore?: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  /** Default "Load more". */
  label?: ReactNode;
  /** Shown (and given as the button's reason) once there is nothing more. Default "That's everything". */
  endLabel?: string;
  className?: string;
}

/** Cursor pagination: a count and a "Load more" button that appends the next page.
 *  The button stays put and focusable (`busy` while loading, `disabledReason` at the
 *  end), so focus is never lost; the count is announced as rows arrive. */
export function LoadMore({ shown, total, hasMore = total === undefined || shown < total, loading, onLoadMore, label = "Load more", endLabel = "That's everything", className }: LoadMoreProps) {
  return (
    <div className={cx("ld-load-more", className)}>
      <p role="status" className="ld-pagination__summary">
        {total === undefined ? `Showing ${shown.toLocaleString()}` : `Showing ${shown.toLocaleString()} of ${total.toLocaleString()}`}
      </p>
      <Button busy={!!loading} busyLabel="Loading more" disabledReason={hasMore ? undefined : endLabel} onClick={onLoadMore}>
        {label}
      </Button>
    </div>
  );
}
