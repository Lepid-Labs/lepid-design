import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./Button.js";
import { Dialog } from "./Dialog.js";

export interface ConfirmOptions {
  /** The question, naming the thing: "Delete nightly-backup?" */
  title: ReactNode;
  /** What happens, in a sentence: "Its 14 runs are deleted too. This can't be undone." */
  message?: ReactNode;
  /** The action as a verb: "Delete job". Default "Confirm". */
  confirmLabel?: string;
  /** Default "Cancel". */
  cancelLabel?: string;
  /** Destructive: the confirm button turns danger. */
  danger?: boolean;
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  /** The Cancel button, Escape, or the dialog closing any other way while open. */
  onCancel: () => void;
  /** The confirmed action is running: the confirm button spins and the dialog stays up
   *  until `open` turns false. Pass it (true or false) for the dialog's whole life so the
   *  announcement region exists early. */
  busy?: boolean;
}

/** A yes/no question before an action, on the native dialog (`role="alertdialog"`). Cancel
 *  comes first, so it takes the focus and Enter is always the safe answer. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const messageId = useId();
  return (
    <Dialog
      open={open}
      title={title}
      role="alertdialog"
      aria-describedby={message !== undefined ? messageId : undefined}
      onCancel={(e) => busy && e.preventDefault()}
      onClose={() => open && onCancel()}
      actions={
        <>
          <Button disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} busy={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message !== undefined && <p id={messageId}>{message}</p>}
    </Dialog>
  );
}

/** `confirm(options)` resolves true or false once the person answers; render `dialog`
 *  somewhere in the component. The promise version of `window.confirm`:
 *
 *  const [confirm, dialog] = useConfirm();
 *  if (await confirm({ title: "Delete nightly-backup?", confirmLabel: "Delete", danger: true })) remove();
 *
 *  A second `confirm` while one is open answers the first with false. */
export function useConfirm(): [confirm: (options: ConfirmOptions) => Promise<boolean>, dialog: ReactNode] {
  const [shown, setShown] = useState<{ options: ConfirmOptions; open: boolean }>();
  const answer = useRef<(ok: boolean) => void>(undefined);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        answer.current?.(false);
        answer.current = resolve;
        setShown({ options, open: true });
      }),
    [],
  );
  useEffect(() => () => answer.current?.(false), []); // unmounting answers, so no caller hangs

  const settle = (ok: boolean) => {
    answer.current?.(ok);
    answer.current = undefined;
    setShown((s) => s && { ...s, open: false }); // keep the options so the text holds while it closes
  };

  const dialog = shown && (
    <ConfirmDialog {...shown.options} open={shown.open} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
  );
  return [confirm, dialog];
}
