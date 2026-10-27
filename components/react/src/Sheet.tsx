import { useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { cx } from "./cx.js";
import type { DialogProps } from "./Dialog.js";
import { sheetOffset, shouldDismissSheet } from "./sheet-drag.js";

export interface SheetProps extends DialogProps {
  /** Edge it slides in from: "bottom" (a bottom sheet, the default) or "start" /
   *  "end" (a side drawer, left / right in left-to-right text). */
  side?: "bottom" | "start" | "end";
}

const outside = (e: MouseEvent<HTMLDialogElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
};

/** A modal sheet on the native <dialog>: a bottom sheet with a grab handle, or a side
 *  drawer. It slides in and out on the theme's motion tokens, clears the safe area,
 *  and closes on Escape, a click on the backdrop, or (bottom) dragging the handle down. */
export function Sheet({ open, onClose, side = "bottom", title, actions, className, onClick, children, ...rest }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ start: number; y: number; t: number; v: number }>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  const grab = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: e.clientY, y: e.clientY, t: e.timeStamp, v: 0 };
    ref.current?.style.setProperty("transition", "none");
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !ref.current) return;
    d.v = (e.clientY - d.y) / Math.max(1, e.timeStamp - d.t);
    Object.assign(d, { y: e.clientY, t: e.timeStamp });
    ref.current.style.translate = `0 ${sheetOffset(e.clientY - d.start)}px`;
  };
  const release = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ref.current;
    drag.current = undefined;
    if (!d || !el) return;
    // clearing both in one go animates from where the finger left it: back up, or away
    el.style.removeProperty("transition");
    el.style.removeProperty("translate");
    const offset = sheetOffset(e.clientY - d.start);
    if (e.type === "pointerup" && shouldDismissSheet({ offset, height: el.offsetHeight, velocity: d.v })) el.close();
  };

  return (
    <dialog
      ref={ref}
      className={cx("ld-dialog", side === "bottom" ? "ld-dialog--sheet" : `ld-dialog--drawer ld-dialog--drawer-${side}`, className)}
      onClose={onClose}
      onClick={(e) => {
        onClick?.(e);
        if (e.target === e.currentTarget && outside(e)) e.currentTarget.close();
      }}
      {...rest}
    >
      {side === "bottom" && (
        <div
          className="ld-dialog__handle"
          aria-hidden="true"
          onPointerDown={grab}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
        />
      )}
      {title !== undefined && <h2 className="ld-dialog__title">{title}</h2>}
      {children}
      {actions !== undefined && <div className="ld-dialog__actions">{actions}</div>}
    </dialog>
  );
}
