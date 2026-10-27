import { cloneElement, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, PointerEvent, ReactElement, ReactNode, SyntheticEvent } from "react";
import { cx } from "./cx.js";
import { placeBeside, type Side } from "./floating.js";
import { TOOLTIP_HIDE_MS, tooltipDelay } from "./tooltip-state.js";

/** CSS anchor positioning is there: place with it, else measure (floating.ts). */
export const ANCHORING = typeof CSS !== "undefined" && CSS.supports("anchor-name: --ld-a");
/** A dashed ident from a React id (`useId` output carries colons or guillemets). */
export const anchorName = (id: string) => `--ld-${id.replace(/[^\w-]/g, "")}`;

const HINT =
  typeof document !== "undefined" &&
  (() => {
    const probe = document.createElement("div");
    probe.popover = "hint";
    return probe.popover === "hint";
  })();

// When any tooltip last closed, so moving along a toolbar hands off at once.
let lastHiddenAt: number | undefined;
const restDelay = () =>
  tooltipDelay(Date.now(), { open: !!document.querySelector(".ld-tooltip:popover-open"), lastHiddenAt });

export interface TooltipOptions {
  /** Short text. Never the only place something essential is said: touch has no hover. */
  content: ReactNode;
  /** "description" (default) adds it to the trigger's description (`aria-describedby`);
   *  "label" makes it the trigger's name (`aria-labelledby`), for icon-only controls. */
  kind?: "description" | "label";
  /** Preferred side; it flips when there is no room. Default "top". */
  side?: Side;
  className?: string;
}

type TriggerProps = Record<string, unknown> & { style?: CSSProperties };

/** Tooltip behaviour for one trigger: spread `triggerProps` on it and render `tooltip`
 *  next to it. It shows after a rest on hover or keyboard focus (at once when handing
 *  off from another tooltip), stays while the pointer is over it, and Escape, a press
 *  or leaving hides it (WCAG 1.4.13). `show(el)` opens it now, e.g. on a tap. */
export function useTooltip({ content, kind = "description", side = "top", className }: TooltipOptions) {
  const id = useId();
  const tip = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (HINT && tip.current) tip.current.popover = "hint"; // manual is the fallback it renders with
    return () => clearTimeout(timer.current);
  }, []);

  const conceal = () => {
    clearTimeout(timer.current);
    if (tip.current?.matches(":popover-open")) tip.current.hidePopover();
  };
  const reveal = () => {
    const t = tip.current;
    if (!t || !trigger.current?.isConnected || t.matches(":popover-open")) return;
    t.showPopover();
    if (ANCHORING) return;
    const at = placeBeside(trigger.current.getBoundingClientRect(), t.getBoundingClientRect(), {
      width: innerWidth,
      height: innerHeight,
    }, { side, align: "center", gap: 6 });
    Object.assign(t.style, { left: `${at.x}px`, top: `${at.y}px` });
    t.dataset.ldSide = at.side;
  };
  const show = (el: HTMLElement, wait = 0) => {
    trigger.current = el;
    clearTimeout(timer.current);
    timer.current = setTimeout(reveal, wait);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(conceal, TOOLTIP_HIDE_MS);
  };

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault(); // dismiss the tooltip only, not the dialog around it
      conceal();
    };
    const away = (e: globalThis.PointerEvent) =>
      !trigger.current?.contains(e.target as Node) && !tip.current?.contains(e.target as Node) && conceal();
    document.addEventListener("keydown", esc, true);
    document.addEventListener("pointerdown", away, true);
    return () => {
      document.removeEventListener("keydown", esc, true);
      document.removeEventListener("pointerdown", away, true);
    };
  }, [open]);

  const triggerProps: TriggerProps = {
    [kind === "label" ? "aria-labelledby" : "aria-describedby"]: id,
    style: ANCHORING ? { anchorName: anchorName(id) } : undefined,
    onPointerEnter: (e: PointerEvent<HTMLElement>) => e.pointerType !== "touch" && show(e.currentTarget, restDelay()),
    onPointerLeave: hide,
    onPointerDown: conceal, // a press means the user has moved on
    onFocus: (e: FocusEvent<HTMLElement>) => e.currentTarget.matches(":focus-visible") && show(e.currentTarget, restDelay()),
    onBlur: conceal,
  };

  const tooltip = (
    <span
      ref={tip}
      id={id}
      role="tooltip"
      popover="manual"
      className={cx("ld-tooltip", className)}
      data-ld-side={side}
      style={ANCHORING ? { positionAnchor: anchorName(id) } : undefined}
      onPointerEnter={() => clearTimeout(timer.current)}
      onPointerLeave={hide}
      onToggle={(e) => {
        if (e.newState !== "open") lastHiddenAt = Date.now();
        setOpen(e.newState === "open");
      }}
    >
      {content}
    </span>
  );

  return { triggerProps, tooltip, show: (el: HTMLElement) => show(el), hide: conceal };
}

const IDS = new Set(["aria-describedby", "aria-labelledby"]);

/** `own` with `extra` layered on: handlers both run (own first), styles merge,
 *  describedby/labelledby ids join. */
export function mergeTriggerProps(own: Record<string, any>, extra: TriggerProps): Record<string, any> {
  const out = { ...own };
  for (const [key, value] of Object.entries(extra)) {
    const mine = own[key];
    if (typeof value === "function" && typeof mine === "function") {
      out[key] = (e: SyntheticEvent) => (mine(e), (value as (e: SyntheticEvent) => void)(e));
    } else if (key === "style") {
      // a menu button with a tooltip anchors both: keep every name
      const names = [mine?.anchorName, (value as CSSProperties | undefined)?.anchorName].filter(Boolean).join(", ");
      out.style = { ...(value as CSSProperties), ...mine, ...(names && { anchorName: names }) };
    } else if (IDS.has(key) && mine) out[key] = String(mine).split(" ").includes(String(value)) ? mine : `${mine} ${value}`;
    else if (mine === undefined) out[key] = value;
  }
  return out;
}

export interface TooltipProps extends TooltipOptions {
  /** One focusable element: a button, a link, an input. */
  children: ReactElement;
}

/** A label or description shown beside one control on hover and keyboard focus, in
 *  the top layer (Popover API: `hint` where supported, else `manual`), placed by CSS
 *  anchor positioning with a measured fallback. */
export function Tooltip({ children, ...options }: TooltipProps) {
  const { triggerProps, tooltip } = useTooltip(options);
  const child = children as ReactElement<Record<string, any>>;
  return (
    <>
      {cloneElement(child, mergeTriggerProps(child.props, triggerProps))}
      {tooltip}
    </>
  );
}
