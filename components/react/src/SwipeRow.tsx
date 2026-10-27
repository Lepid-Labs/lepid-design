import { useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { ContextMenu } from "./ContextMenu.js";
import { cx } from "./cx.js";
import { IconButton } from "./IconButton.js";
import { Menu, MenuItem } from "./Menu.js";
import { createSwipe, type SwipeSide } from "./swipe-dom.js";

export interface SwipeAction {
  label: string;
  onAction: () => void;
  /** "danger" for destructive actions: red behind the swipe and in the menu. */
  variant?: "default" | "danger";
  /** Shown above the label in the revealed button (an inline `<svg>`). */
  icon?: ReactNode;
}

export interface SwipeRowProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Revealed by a swipe towards the inline end. Two at most per side: more can't be learned. */
  leading?: SwipeAction[];
  /** Revealed by a swipe towards the inline start, outermost last. */
  trailing?: SwipeAction[];
  /** Sides whose outermost action fires on a full swipe. Give a destructive one an undo toast. */
  fullSwipe?: SwipeSide[];
  /** The actions menu's name, which also labels its button: "Actions for Ana's message". */
  menuLabel: string;
  children: ReactNode;
}

const dots = (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    {[3.5, 8, 12.5].map((x) => <circle key={x} cx={x} cy={8} r={1.4} />)}
  </svg>
);

/** A list row whose actions a horizontal swipe reveals; the page still scrolls
 *  vertically. Swiping is only the shortcut: the same actions sit in a visible menu
 *  button, a context menu (right-click, long press, Shift+F10), and the keyboard. */
export function SwipeRow({ leading = [], trailing = [], fullSwipe = [], menuLabel, className, children, ...rest }: SwipeRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ leading, trailing });
  latest.current = { leading, trailing };
  const full = fullSwipe.join(" ");
  useEffect(
    () =>
      createSwipe(ref.current!, {
        full: fullSwipe,
        onFullSwipe: (side) => (side === "leading" ? latest.current.leading[0] : latest.current.trailing.at(-1))?.onAction(),
      }),
    [full], // the joined list: a new array each render is the same sides
  );

  // the revealed buttons are a pointer shortcut; keyboard and screen readers use the menu
  const reveal = (side: SwipeSide, actions: SwipeAction[]) =>
    actions.length > 0 && (
      <div className={`ld-swipe__actions ld-swipe__actions--${side}`} aria-hidden="true">
        {actions.map((a) => (
          <button key={a.label} type="button" tabIndex={-1} className={cx("ld-swipe__action", a.variant === "danger" && "ld-swipe__action--danger")} onClick={a.onAction}>
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
    );
  const items = [...leading, ...trailing].map((a) => (
    <MenuItem key={a.label} variant={a.variant} onSelect={a.onAction}>
      {a.label}
    </MenuItem>
  ));

  return (
    <div ref={ref} className={cx("ld-swipe", className)} {...rest}>
      {reveal("leading", leading)}
      {reveal("trailing", trailing)}
      <ContextMenu className="ld-swipe__content" menu={items} menuLabel={menuLabel}>
        <div className="ld-swipe__main">{children}</div>
        <Menu label={menuLabel} side="bottom" trigger={<IconButton label={menuLabel} className="ld-swipe__menu">{dots}</IconButton>}>
          {items}
        </Menu>
      </ContextMenu>
    </div>
  );
}
