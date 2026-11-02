import { useEffect, useId, useRef } from "react";
import type { DialogHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx.js";

export interface DialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open" | "title"> {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  /** Rendered in a right-aligned action row below the content. */
  actions?: ReactNode;
}

/** Modal dialog on the native <dialog> element (showModal + ::backdrop). */
export function Dialog({ open, onClose, title, actions, className, children, ...rest }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx("ld-dialog", className)}
      aria-labelledby={title !== undefined ? titleId : undefined}
      onClose={onClose}
      {...rest}
    >
      {title !== undefined && <h2 id={titleId} className="ld-dialog__title">{title}</h2>}
      {children}
      {actions !== undefined && <div className="ld-dialog__actions">{actions}</div>}
    </dialog>
  );
}
