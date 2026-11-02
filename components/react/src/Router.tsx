import { forwardRef, useMemo, useSyncExternalStore } from "react";
import type { AnchorHTMLAttributes } from "react";
import { isPlainClick, splitHref } from "./routing.js";

const NAVIGATE_EVENT = "ld:navigate";
let hashRouting = false;

/** Route by the URL hash (`/#/books`) instead of the path, for hosts that cannot send
 *  index.html for every path. Call once, before the first render. */
export function setHashRouting(on: boolean): void {
  hashRouting = on;
}

/** The current in-app href: path plus query, from the path or the hash. */
function currentHref(): string {
  const { hash, pathname, search } = window.location;
  return hashRouting ? hash.slice(1) || "/" : pathname + search;
}

function subscribe(onChange: () => void): () => void {
  for (const type of ["popstate", "hashchange", NAVIGATE_EVENT]) window.addEventListener(type, onChange);
  return () => {
    for (const type of ["popstate", "hashchange", NAVIGATE_EVENT]) window.removeEventListener(type, onChange);
  };
}

/** Go to an in-app href ("/books/7?tab=runs"): a new history entry, or `replace` the
 *  current one. Every `useRoute` re-renders. */
export function navigate(to: string, { replace = false }: { replace?: boolean } = {}): void {
  if (to === currentHref()) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", hashRouting ? `#${to}` : to);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export interface Route {
  /** Normalized: no trailing slash, "/" at the root. Match it with `matchPath`. */
  path: string;
  query: URLSearchParams;
}

/** The current route, re-rendering on `navigate`, `Link` clicks and back/forward. */
export function useRoute(): Route {
  const href = useSyncExternalStore(subscribe, currentHref, () => "/");
  return useMemo(() => splitHref(href), [href]);
}

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /** In-app href: "/books/7". */
  to: string;
  /** Replace the current history entry instead of adding one. */
  replace?: boolean;
}

/** An in-app link: a real `<a href>` (so it can be opened in a new tab, copied and
 *  bookmarked) whose plain clicks navigate without a page load. Modified and middle
 *  clicks, `target` other than `_self`, and `download` links are left to the browser. */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, replace, onClick, ...rest }, ref) {
  return (
    <a
      ref={ref}
      href={hashRouting ? `#${to}` : to}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        const leaves = (rest.target && rest.target !== "_self") || rest.download !== undefined;
        if (leaves || !isPlainClick(e)) return;
        e.preventDefault();
        navigate(to, { replace });
      }}
    />
  );
});
