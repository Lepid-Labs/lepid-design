// Pure state logic behind AppShell, kept DOM-free so it can be tested under
// node:test without a renderer (so it imports nothing — Node runs the .ts
// source and cannot resolve the .js specifiers the build uses).

/** Below this width the side nav leaves the grid and becomes a drawer. The
 *  theme CSS hard-codes the same 48rem (media queries cannot read tokens). */
export const SHELL_NARROW_QUERY = "(max-width: 48rem)";

export interface ShellNavState {
  /** Wide viewports: the nav is an icon-only rail. Kept across resizes. */
  collapsed: boolean;
  /** Narrow viewports: the drawer is open. Ignored by the CSS when wide. */
  open: boolean;
}

/** The one toggle button means "collapse the rail" when wide and "open the
 *  drawer" when narrow; each state survives the other viewport untouched. */
export function toggleNav(state: ShellNavState, narrow: boolean): ShellNavState {
  return narrow ? { ...state, open: !state.open } : { ...state, collapsed: !state.collapsed };
}

/** Whether the nav is visibly expanded, for the toggle's aria-expanded. */
export function navExpanded(state: ShellNavState, narrow: boolean): boolean {
  return narrow ? state.open : !state.collapsed;
}

export interface ShellAttrs {
  className: string;
  "data-ld-nav-collapsed"?: "";
  "data-ld-nav-open"?: "";
}

/** Class list and state attributes for the `.ld-shell` root. The theme CSS
 *  reads only these two presence attributes, so plain HTML can set them too. */
export function shellAttrs(state: ShellNavState, className?: string): ShellAttrs {
  const attrs: ShellAttrs = { className: ["ld-shell", className].filter(Boolean).join(" ") };
  if (state.collapsed) attrs["data-ld-nav-collapsed"] = "";
  if (state.open) attrs["data-ld-nav-open"] = "";
  return attrs;
}
