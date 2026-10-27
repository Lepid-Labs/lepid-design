import { createContext, useContext, useId } from "react";
import type { DetailsHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx.js";

const Group = createContext<string | undefined>(undefined);

export interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  /** One item open at a time (steps, a wizard's sections). Leave off for FAQs,
   *  where readers compare answers. A string names the group yourself. */
  exclusive?: boolean | string;
}

/** A stack of disclosures. Exclusive groups use `<details name>`, so the browser
 *  closes the others itself, even before hydration. */
export function Accordion({ exclusive, className, children, ...rest }: AccordionProps) {
  const auto = useId();
  const name = exclusive === true ? auto : exclusive || undefined;
  return (
    <Group.Provider value={name}>
      <div className={cx("ld-accordion", className)} {...rest}>
        {children}
      </div>
    </Group.Provider>
  );
}

export interface AccordionItemProps extends Omit<DetailsHTMLAttributes<HTMLElement>, "title"> {
  /** The header text. The whole row is the `<summary>`, a native button that
   *  announces expanded/collapsed and toggles on Enter and Space. */
  title: ReactNode;
  children?: ReactNode;
}

/** One `<details>` row: open it with `open` (initial state); listen with `onToggle`. */
export function AccordionItem({ title, name, className, children, ...rest }: AccordionItemProps) {
  const group = useContext(Group);
  return (
    <details className={cx("ld-accordion__item", className)} name={name ?? group} {...rest}>
      {/* the theme draws the chevron (::after), so plain HTML needs no icon markup */}
      <summary className="ld-accordion__summary">{title}</summary>
      <div className="ld-accordion__panel">{children}</div>
    </details>
  );
}
