import { useRef } from "react";
import type { HTMLAttributes, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { cx } from "./cx.js";
import { placeAtPoint } from "./floating.js";
import { LONG_PRESS_MS, LONG_PRESS_SLOP } from "./menu-nav.js";
import { MenuList, menuItems } from "./Menu.js";

export interface ContextMenuProps extends HTMLAttributes<HTMLDivElement> {
  /** The items: MenuItem, MenuCheckboxItem, MenuGroup, MenuSeparator. Every one of
   *  them must also be reachable some other way (a visible menu button): a context
   *  menu is hidden until someone thinks to look for it. */
  menu: ReactNode;
  /** The menu's name. Default "Actions". */
  menuLabel?: string;
}

/** A region with a context menu: right-click, a long press on touch, or Shift+F10 /
 *  the ContextMenu key on whatever has focus inside it opens the same menu as Menu,
 *  at the pointer (or under the focused element), kept inside the viewport. */
export function ContextMenu({ menu, menuLabel = "Actions", className, children, ...rest }: ContextMenuProps) {
  const pop = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const press = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> }>(undefined);

  const openAt = (x: number, y: number) => {
    const p = pop.current;
    if (!p || p.matches(":popover-open")) return; // a keyboard open is followed by its own contextmenu event
    back.current = document.activeElement as HTMLElement | null;
    p.showPopover();
    const at = placeAtPoint({ x, y }, p.getBoundingClientRect(), { width: innerWidth, height: innerHeight });
    Object.assign(p.style, { left: `${at.x}px`, top: `${at.y}px` });
    menuItems(p)[0]?.focus();
  };
  const close = (returnFocus: boolean) => {
    if (pop.current?.matches(":popover-open")) pop.current.hidePopover();
    if (returnFocus && back.current?.isConnected) back.current.focus();
  };
  const cancelPress = () => {
    clearTimeout(press.current?.timer);
    press.current = undefined;
  };

  return (
    <div
      {...rest}
      className={cx("ld-context-target", className)}
      onContextMenu={(e: MouseEvent<HTMLDivElement>) => {
        rest.onContextMenu?.(e);
        e.preventDefault();
        cancelPress();
        openAt(e.clientX, e.clientY);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        rest.onKeyDown?.(e);
        if (e.key !== "ContextMenu" && !(e.shiftKey && e.key === "F10")) return;
        e.preventDefault();
        const r = (e.target as HTMLElement).getBoundingClientRect();
        openAt(r.left, r.bottom);
      }}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        rest.onPointerDown?.(e);
        if (e.pointerType !== "touch") return;
        const { clientX: x, clientY: y } = e;
        cancelPress();
        press.current = { x, y, timer: setTimeout(() => openAt(x, y), LONG_PRESS_MS) };
      }}
      onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
        rest.onPointerMove?.(e);
        const p = press.current;
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > LONG_PRESS_SLOP) cancelPress();
      }}
      onPointerUp={(e: PointerEvent<HTMLDivElement>) => (rest.onPointerUp?.(e), cancelPress())}
      onPointerCancel={(e: PointerEvent<HTMLDivElement>) => (rest.onPointerCancel?.(e), cancelPress())}
    >
      {children}
      <MenuList popRef={pop} label={menuLabel} onClose={close}>
        {menu}
      </MenuList>
    </div>
  );
}
