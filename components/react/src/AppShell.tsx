import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { navExpanded, shellAttrs, SHELL_NARROW_QUERY, toggleNav, type ShellNavState } from "./shell-state.js";

export interface ShellContextValue {
  /** The shell has a side nav (so the header shows the toggle). */
  hasNav: boolean;
  /** The viewport is below the 48rem breakpoint (drawer / tab bar mode). */
  narrow: boolean;
  /** Wide viewports: the nav is an icon rail. */
  collapsed: boolean;
  /** The nav is visibly expanded on the current viewport. */
  expanded: boolean;
  navId: string;
  toggleNav: () => void;
  closeNav: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

/** The enclosing AppShell's nav state, or null outside one. */
export function useShell(): ShellContextValue | null {
  return useContext(ShellContext);
}

const subscribeNarrow = (onChange: () => void) => {
  const mq = window.matchMedia(SHELL_NARROW_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/** True below the shell breakpoint; false during SSR. */
export function useShellNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(SHELL_NARROW_QUERY).matches,
    () => false,
  );
}

export interface AppShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Usually an `AppHeader`. Leave out for a shell without a top bar. */
  header?: ReactNode;
  /** Usually a `SideNav`. Leave out for a shell without a left-hand nav. */
  nav?: ReactNode;
  footer?: ReactNode;
  /** Page content, rendered inside `<main>`. */
  children?: ReactNode;
  /** Below 48rem the nav becomes a slide-in drawer or a bottom tab bar. The
   *  drawer opens from the header's toggle, so the default is "drawer" with a
   *  header and "tabbar" without one. */
  mobileNav?: "drawer" | "tabbar";
  /** Controlled icon-rail state for wide viewports. */
  navCollapsed?: boolean;
  defaultNavCollapsed?: boolean;
  onNavCollapsedChange?: (collapsed: boolean) => void;
  /** Text of the skip link to main content; `false` drops it. */
  skipLink?: ReactNode | false;
}

/** Application frame: optional sticky header, optional left-hand nav (icon
 *  rail when collapsed, drawer or tab bar on narrow screens), main, optional
 *  footer. Paints the theme's page background. */
export function AppShell({
  header,
  nav,
  footer,
  children,
  mobileNav = header == null ? "tabbar" : "drawer",
  navCollapsed,
  defaultNavCollapsed = false,
  onNavCollapsedChange,
  skipLink = "Skip to content",
  className,
  ...rest
}: AppShellProps) {
  const narrow = useShellNarrow();
  const [innerCollapsed, setInnerCollapsed] = useState(defaultNavCollapsed);
  const [open, setOpen] = useState(false);
  const collapsed = navCollapsed ?? innerCollapsed;
  const state: ShellNavState = { collapsed, open: open && narrow };
  const navId = useId();
  const mainId = useId();

  const toggle = useCallback(() => {
    const next = toggleNav({ collapsed, open }, narrow);
    if (next.open !== open) setOpen(next.open);
    if (next.collapsed !== collapsed) {
      if (navCollapsed === undefined) setInnerCollapsed(next.collapsed);
      onNavCollapsedChange?.(next.collapsed);
    }
  }, [collapsed, open, narrow, navCollapsed, onNavCollapsedChange]);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.open]);

  // Following a link out of the drawer closes it.
  const onNavClick = (e: MouseEvent) => {
    if (narrow && (e.target as Element).closest("a")) setOpen(false);
  };

  const ctx: ShellContextValue = {
    hasNav: nav != null,
    narrow,
    collapsed,
    expanded: navExpanded(state, narrow),
    navId,
    toggleNav: toggle,
    closeNav: close,
  };
  const modifiers = [mobileNav === "tabbar" && "ld-shell--tabbar", className];
  const attrs = shellAttrs(state, modifiers.filter(Boolean).join(" "));

  return (
    <ShellContext.Provider value={ctx}>
      <div {...attrs} {...rest}>
        {skipLink !== false && (
          <a className="ld-shell__skip" href={`#${mainId}`}>
            {skipLink}
          </a>
        )}
        {header}
        {nav != null && (
          <>
            <aside className="ld-shell__nav" id={navId} onClick={onNavClick}>
              {nav}
            </aside>
            <div className="ld-shell__scrim" aria-hidden="true" onClick={close} />
          </>
        )}
        <main className="ld-shell__main" id={mainId} tabIndex={-1}>
          {children}
        </main>
        {footer != null && <footer className="ld-shell__footer">{footer}</footer>}
      </div>
    </ShellContext.Provider>
  );
}
