import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./Button.js";
import { Dialog } from "./Dialog.js";
import { Alert } from "./feedback.js";
import { Page } from "./Page.js";
import { useSubmit } from "./useSubmit.js";

interface FormViewBase {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Runs on submit with the fields' values (each field needs a `name`). Throw to show
   *  the message above the buttons; close the dialog or navigate away here on success. */
  onSubmit: (data: FormData) => unknown;
  /** The submit button. Default "Save". */
  submitLabel?: string;
  /** Announced while saving. Default "Saving". */
  busyLabel?: string;
  cancelLabel?: string;
  /** Clear the fields after a successful submit, for adding one item after another. */
  resetOnSuccess?: boolean;
  /** The fields: `Field`s around inputs with a `name` and `defaultValue`. */
  children: ReactNode;
}

export type FormViewProps = FormViewBase &
  (
    | { open?: undefined; /** A Cancel button. */ onCancel?: () => void }
    | {
        /** Show the form in a modal Dialog instead of a page; it starts fresh each time it opens. */
        open: boolean;
        /** Cancel, Escape, or the dialog closing any other way while open. */
        onCancel: () => void;
      }
  );

type BodyProps = Omit<FormViewBase, "title" | "subtitle"> & {
  onCancel?: () => void;
  dialog?: boolean;
  onBusy?: (busy: boolean) => void;
};

function FormBody({ onSubmit, submitLabel = "Save", busyLabel = "Saving", cancelLabel = "Cancel", resetOnSuccess, onCancel, dialog, onBusy, children }: BodyProps) {
  const form = useRef<HTMLFormElement>(null);
  const submit = useSubmit(async () => {
    onBusy?.(true);
    try {
      await onSubmit(new FormData(form.current!));
      if (resetOnSuccess) form.current?.reset();
    } finally {
      onBusy?.(false);
    }
  });
  const cancel = onCancel && (
    <Button type="button" disabled={submit.busy} onClick={onCancel}>
      {cancelLabel}
    </Button>
  );
  const save = (
    <Button type="submit" variant="primary" busy={submit.busy} busyLabel={busyLabel}>
      {submitLabel}
    </Button>
  );
  return (
    <form ref={form} onSubmit={submit.onSubmit}>
      {children}
      {submit.error && <Alert variant="danger">{submit.error}</Alert>}
      {dialog ? (
        <div className="ld-dialog__actions">
          {cancel}
          {save}
        </div>
      ) : (
        <div className="ld-page__actions">
          {save}
          {cancel}
        </div>
      )}
    </form>
  );
}

function FormDialog({ open, title, subtitle, onCancel, ...rest }: FormViewBase & { open: boolean; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      title={title}
      onCancel={(e) => busy && e.preventDefault()} // Escape mid-save would hide the outcome
      onClose={() => open && onCancel()}
    >
      {open && ( // mounted per opening, so fields and the last error start fresh
        <>
          {subtitle != null && <p>{subtitle}</p>}
          <FormBody {...rest} onCancel={onCancel} dialog onBusy={setBusy} />
        </>
      )}
    </Dialog>
  );
}

/** A form page, or with `open` a form dialog: fields read as FormData on submit, the
 *  busy button, double-submit guard and error message (useSubmit), and Cancel. */
export function FormView(props: FormViewProps) {
  if (props.open !== undefined) return <FormDialog {...props} open={props.open} />;
  const { title, subtitle, ...rest } = props;
  return (
    <Page width="narrow" title={title} subtitle={subtitle}>
      <FormBody {...rest} />
    </Page>
  );
}
