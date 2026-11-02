import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "./Button.js";
import { useConfirm, type ConfirmOptions } from "./ConfirmDialog.js";
import { errorMessage } from "./format.js";
import { toast } from "./Toaster.js";

/** A button a view runs on its target: one row, the selected rows, or the item shown. */
export interface ViewAction<T> {
  /** The verb on the button: "Delete". */
  label: string;
  /** Does the work; refetch or navigate here. A rejection shows as an error toast. */
  run: (target: T) => unknown;
  /** Ask first: the question ("Delete nightly-backup?"), full ConfirmOptions, or either
   *  built from the target. The confirm button takes `label` and `danger` unless the options set them. */
  confirm?: string | ConfirmOptions | ((target: T) => string | ConfirmOptions);
  /** Destructive: a danger button and a danger confirm. */
  danger?: boolean;
}

export interface ViewActions {
  /** The action's button: confirms if asked, spins while `run` runs, toasts a failure.
   *  `key` names the running instance ("row 7, action 0"), so each button spins alone. */
  button<T>(action: ViewAction<T>, target: T, key: string, props?: ButtonProps): ReactNode;
  /** The confirm dialog; render it once. */
  dialog: ReactNode;
}

/** The confirm, busy and error handling behind every view action. */
export function useViewActions(): ViewActions {
  const [confirm, dialog] = useConfirm();
  const running = useRef(new Set<string>()); // a ref, so a same-tick second click is ignored
  const [, rerender] = useState(0);
  const mark = (key: string, on: boolean) => {
    on ? running.current.add(key) : running.current.delete(key);
    rerender((n) => n + 1);
  };

  async function run<T>(action: ViewAction<T>, target: T, key: string) {
    if (running.current.has(key)) return;
    const ask = typeof action.confirm === "function" ? action.confirm(target) : action.confirm;
    if (ask !== undefined) {
      const options = typeof ask === "string" ? { title: ask } : ask;
      if (!(await confirm({ confirmLabel: action.label, danger: action.danger, ...options }))) return;
    }
    mark(key, true);
    try {
      await action.run(target);
    } catch (err) {
      toast({ variant: "danger", title: `${action.label} failed`, message: errorMessage(err) });
    } finally {
      mark(key, false);
    }
  }

  return {
    button: (action, target, key, props) => (
      <Button
        key={key}
        variant={action.danger ? "danger" : undefined}
        busy={running.current.has(key)}
        onClick={() => void run(action, target, key)}
        {...props}
      >
        {action.label}
      </Button>
    ),
    dialog,
  };
}
