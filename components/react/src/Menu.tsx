import { cloneElement, createContext, useContext, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactElement, ReactNode, RefObject, ToggleEvent } from "react";
import { cx } from "./cx.js";
import { placeBeside, type Side } from "./floating.js";
import { menuMove, menuTypeahead, typeaheadBuffer } from "./menu-nav.js";
import { ANCHORING, anchorName, mergeTriggerProps } from "./Tooltip.js";

const ITEMS = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
export const menuItems = (menu: HTMLElement | null) => [...(menu?.querySelectorAll<HTMLElement>(ITEMS) ?? [])];

/** What an item needs from the menu around it: close it, optionally handing focus back. */
const MenuContext = createContext<{ close: (returnFocus: boolean) => void } | null>(null);

export interface MenuListProps {
  popRef: RefObject<HTMLDivElement | null>;
  id?: string;
  label?: string;
  labelledBy?: string;
  /** Hide the popover and, if asked, put focus back where it came from. */
  onClose: (returnFocus: boolean) => void;
  onToggle?: (e: ToggleEvent<HTMLDivElement>) => void;
  side?: Side;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

/** The `role="menu"` popover Menu and ContextMenu share: an auto popover (light
 *  dismiss) with roving focus, Home/End, typeahead, and Escape and Tab closing it. */
export function MenuList({ popRef, id, label, labelledBy, onClose, onToggle, side = "bottom", style, className, children }: MenuListProps) {
  const typed = useRef<{ text: string; at: number }>(undefined);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = menuItems(popRef.current);
    const current = list.indexOf(document.activeElement as HTMLElement);
    const to = menuMove(list.length, current, e.key);
    if (to !== undefined) {
      e.preventDefault();
      list[to].focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // one Escape closes the menu, not the dialog it sits in
      onClose(true);
    } else if (e.key === "Tab") {
      onClose(true); // focus goes back to the trigger first, so Tab moves on from there
    } else if (e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typed.current = typeaheadBuffer(typed.current, e.key, Date.now());
      const at = menuTypeahead(list.map((i) => i.textContent ?? ""), current, typed.current.text);
      if (at >= 0) list[at].focus();
    }
  };
  return (
    <MenuContext.Provider value={{ close: onClose }}>
      <div
        ref={popRef}
        id={id}
        role="menu"
        popover="auto"
        aria-label={label}
        aria-labelledby={label ? undefined : labelledBy}
        className={cx("ld-menu", className)}
        data-ld-side={side}
        style={style}
        onKeyDown={onKeyDown}
        onToggle={onToggle}
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export interface MenuItemProps {
  children: ReactNode;
  /** Runs on click, Enter or Space; the menu then closes and focus goes back. */
  onSelect?: () => void;
  /** Focusable and announced, but does nothing (APG keeps disabled items reachable). */
  disabled?: boolean;
  /** "danger" for destructive actions: red text, kept apart by a separator. */
  variant?: "default" | "danger";
  /** Shortcut hint shown at the end ("⌘D"). It is only a hint: wire the key yourself. */
  shortcut?: string;
  /** Leading icon (an inline `<svg>`). */
  icon?: ReactNode;
  className?: string;
}

function Item({
  role,
  checked,
  children,
  onSelect,
  disabled,
  variant,
  shortcut,
  icon,
  className,
}: MenuItemProps & { role: "menuitem" | "menuitemcheckbox" | "menuitemradio"; checked?: boolean }) {
  const menu = useContext(MenuContext);
  // Space on a checkbox or radio item flips it and keeps the menu open (APG)
  const activate = (stayOpen: boolean) => {
    if (disabled) return;
    onSelect?.();
    if (!stayOpen) menu?.close(true);
  };
  return (
    <div
      role={role}
      tabIndex={-1}
      aria-checked={role === "menuitem" ? undefined : !!checked}
      aria-disabled={disabled || undefined}
      className={cx("ld-menu__item", variant === "danger" && "ld-menu__item--danger", className)}
      onClick={() => activate(false)}
      onPointerMove={(e) => e.currentTarget !== document.activeElement && e.currentTarget.focus()}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        activate(e.key === " " && role !== "menuitem");
      }}
    >
      {icon !== undefined && (
        <span className="ld-menu__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ld-menu__label">{children}</span>
      {shortcut && <kbd className="ld-kbd ld-menu__shortcut">{shortcut}</kbd>}
    </div>
  );
}

export function MenuItem(props: MenuItemProps) {
  return <Item role="menuitem" {...props} />;
}

export interface MenuCheckboxItemProps extends Omit<MenuItemProps, "onSelect" | "icon"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/** An on/off item (`menuitemcheckbox`): the theme draws the check. */
export function MenuCheckboxItem({ checked, onCheckedChange, ...rest }: MenuCheckboxItemProps) {
  return <Item role="menuitemcheckbox" checked={checked} onSelect={() => onCheckedChange?.(!checked)} {...rest} />;
}

export interface MenuRadioItemProps extends Omit<MenuItemProps, "icon"> {
  checked: boolean;
}

/** One of a set (`menuitemradio`); put the set in a MenuGroup and set `checked` on the chosen one. */
export function MenuRadioItem({ checked, ...rest }: MenuRadioItemProps) {
  return <Item role="menuitemradio" checked={checked} {...rest} />;
}

/** Items under a heading; radio items that form one set belong in one group. */
export function MenuGroup({ label, children }: { label?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={label !== undefined ? id : undefined} className="ld-menu__group">
      {label !== undefined && (
        <div role="presentation" id={id} className="ld-menu__group-label">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="ld-menu__separator" />;
}

export interface MenuProps {
  /** The button that opens it: a Button, an IconButton or a `<button>`. It gets
   *  `popovertarget`, `aria-haspopup`, `aria-expanded` and `aria-controls`. */
  trigger: ReactElement;
  children: ReactNode;
  /** The menu's name, when the trigger's text does not say it. */
  label?: string;
  /** Side of the trigger it opens on; it flips at the viewport edge. Default "bottom". */
  side?: Side;
  className?: string;
}

/** A menu button (APG): the trigger opens a `role="menu"` popover anchored to it.
 *  Click, Enter, Space or ArrowDown open it on the first item, ArrowUp on the last;
 *  arrows, Home, End and typeahead move; Escape and Tab close it and return focus. */
export function Menu({ trigger, children, label, side = "bottom", className }: MenuProps) {
  const id = useId();
  const pop = useRef<HTMLDivElement>(null);
  const focusLast = useRef(false);
  const [open, setOpen] = useState(false);
  const own = trigger as ReactElement<Record<string, any>>;
  const triggerId: string = own.props.id ?? `${id}trigger`;
  const menuId = `${id}menu`;
  const button = () => document.getElementById(triggerId);

  const close = (returnFocus: boolean) => {
    if (pop.current?.matches(":popover-open")) pop.current.hidePopover();
    if (returnFocus) button()?.focus();
  };

  const onToggle = (e: ToggleEvent<HTMLDivElement>) => {
    setOpen(e.newState === "open");
    const menu = pop.current;
    const anchor = button();
    if (e.newState !== "open" || !menu) return;
    if (!ANCHORING && anchor) {
      // shortcut: measured after the popover shows, so it can paint once unplaced; anchor positioning has no gap
      const at = placeBeside(anchor.getBoundingClientRect(), menu.getBoundingClientRect(), { width: innerWidth, height: innerHeight }, { side });
      Object.assign(menu.style, { left: `${at.x}px`, top: `${at.y}px` });
      menu.dataset.ldSide = at.side;
    }
    const items = menuItems(menu);
    (focusLast.current ? items.at(-1) : items[0])?.focus();
    focusLast.current = false;
  };

  const triggerProps = {
    id: triggerId,
    popoverTarget: menuId,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": menuId,
    style: ANCHORING ? { anchorName: anchorName(id) } : undefined,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      focusLast.current = e.key === "ArrowUp";
      if (!pop.current?.matches(":popover-open")) pop.current?.showPopover();
      else (focusLast.current ? menuItems(pop.current).at(-1) : menuItems(pop.current)[0])?.focus();
    },
  };

  return (
    <>
      {cloneElement(own, mergeTriggerProps(own.props, triggerProps))}
      <MenuList
        popRef={pop}
        id={menuId}
        label={label}
        labelledBy={triggerId}
        side={side}
        className={className}
        style={ANCHORING ? { positionAnchor: anchorName(id) } : undefined}
        onClose={close}
        onToggle={onToggle}
      >
        {children}
      </MenuList>
    </>
  );
}
