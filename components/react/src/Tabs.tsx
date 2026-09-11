import { useState } from "react";
import type { ReactNode } from "react";
import { cx } from "./cx.js";

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
  return (
    <div>
      <div role="tablist" className="ld-tabs">
        {items.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === current}
            className={cx("ld-tab", t.id === current && "ld-tab--active")}
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="ld-tabpanel">
        {activeItem?.content}
      </div>
    </div>
  );
}
