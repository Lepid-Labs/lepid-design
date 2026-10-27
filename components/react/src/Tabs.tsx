import { useId, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "./cx.js";
import { menuMove } from "./menu-nav.js";
import { useSlideDir } from "./useSlideDir.js";

// APG tabs, horizontal with automatic activation: Left/Right step and wrap, Home/End
// jump. menuMove speaks the vertical arrows, so translate.
const STEP: Record<string, string> = { ArrowRight: "ArrowDown", ArrowLeft: "ArrowUp", Home: "Home", End: "End" };

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** Controlled active tab id; omit for uncontrolled. */
  active?: string;
  defaultActive?: string;
  onChange?: (id: string) => void;
}

export function Tabs({ items, active, defaultActive, onChange }: TabsProps) {
  const [internal, setInternal] = useState(defaultActive ?? items[0]?.id);
  const current = active ?? internal;
  const select = (id: string) => {
    setInternal(id);
    onChange?.(id);
  };
  const activeItem = items.find((t) => t.id === current);
  const base = useId();
  const tabId = (i: number) => `${base}-tab-${i}`; // by index: item ids may hold spaces
  const panelId = `${base}-panel`;
  // roving tabindex: one tab stop for the whole list (the first tab if none is active)
  const stop = activeItem ?? items[0];
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const key = STEP[e.key];
    const next = key ? menuMove(items.length, items.findIndex((t) => t.id === current), key) : undefined;
    if (next === undefined) return;
    e.preventDefault();
    select(items[next].id);
    (e.currentTarget.children[next] as HTMLElement).focus();
  };
  // data-ld-dir for the theme's sliding underline: which edge leads
  const tablist = useSlideDir<HTMLDivElement>('[aria-selected="true"]');
  return (
    <div>
      <div ref={tablist} role="tablist" className="ld-tabs" onKeyDown={onKeyDown}>
        {items.map((t, i) => (
          <button
            key={t.id}
            id={tabId(i)}
            role="tab"
            type="button"
            aria-selected={t.id === current}
            aria-controls={panelId}
            tabIndex={t === stop ? 0 : -1}
            className={cx("ld-tab", t.id === current && "ld-tab--active")}
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="ld-tabpanel" id={panelId} aria-labelledby={activeItem && tabId(items.indexOf(activeItem))}>
        {activeItem?.content}
      </div>
    </div>
  );
}
