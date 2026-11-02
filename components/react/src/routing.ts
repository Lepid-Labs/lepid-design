// Pure path matching and click filtering behind Router, kept DOM-free so it can be tested
// under node:test without a renderer (so it imports nothing — Node runs the .ts source and
// cannot resolve .js specifiers).

/** One path per route: "/books/" and "books" are "/books"; "" is "/". */
export function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  if (trimmed === "") return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** An in-app href ("/books?sort=title") split into its normalized path and query. */
export function splitHref(href: string): { path: string; query: URLSearchParams } {
  const at = href.indexOf("?");
  return at === -1
    ? { path: normalizePath(href), query: new URLSearchParams() }
    : { path: normalizePath(href.slice(0, at)), query: new URLSearchParams(href.slice(at + 1)) };
}

/** The params when `path` matches `pattern` ("/books/:id"), else null. Plain segments
 *  match exactly and each ":name" takes one whole segment, decoded. A malformed escape
 *  ("%E0") matches nothing rather than throwing. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const want = normalizePath(pattern).split("/");
  const got = normalizePath(path).split("/");
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(":")) {
      try {
        params[want[i].slice(1)] = decodeURIComponent(got[i]);
      } catch {
        return null;
      }
    } else if (want[i] !== got[i]) return null;
  }
  return params;
}

export interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

/** Whether a link click is the app's to handle: the main button, no modifier, not already
 *  handled. Cmd/Ctrl-click, Shift-click and middle-click stay with the browser (new tab,
 *  new window). */
export function isPlainClick(e: ClickLike): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented;
}
