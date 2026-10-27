import { Fragment, cloneElement, isValidElement, useId } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx.js";
import { fieldControlAttrs, fieldIds } from "./field-state.js";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;
export function Input({ className, ...rest }: InputProps) {
  return <input className={cx("ld-input", className)} {...rest} />;
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
export function Textarea({ className, ...rest }: TextareaProps) {
  return <textarea className={cx("ld-textarea", className)} {...rest} />;
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;
export function Select({ className, ...rest }: SelectProps) {
  return <select className={cx("ld-select", className)} {...rest} />;
}

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}
export function Label({ className, ...rest }: LabelProps) {
  return <label className={cx("ld-label", className)} {...rest} />;
}

export interface FieldProps {
  label: ReactNode;
  /** The control's id. Defaults to the child's own id, else a generated one given to the child. */
  htmlFor?: string;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Error message. Marks the control `aria-invalid`, shown with an icon; wins over `success`. */
  error?: ReactNode;
  /** Success message, shown in the field (.ld-field--success). */
  success?: ReactNode;
  className?: string;
  /** One control element. Field adds `id`, `aria-describedby`, `aria-invalid` and
   *  `aria-errormessage` to it; a custom control must pass them to its input. */
  children: ReactNode;
}

/** Label, control, hint and a status line that reads out errors and successes as they appear. */
export function Field({ label, htmlFor, hint, error, success, className, children }: FieldProps) {
  const auto = useId();
  const child = isValidElement<Record<string, unknown>>(children) && children.type !== Fragment ? children : null;
  const id = (child?.props.id as string | undefined) ?? htmlFor ?? auto;
  const ids = fieldIds(id);
  const hasError = !!error;
  const hasSuccess = !hasError && !!success;
  const control = child
    ? cloneElement(
        child,
        fieldControlAttrs({
          id,
          hasHint: !!hint,
          hasError,
          hasSuccess,
          describedBy: child.props["aria-describedby"] as string | undefined,
        }),
      )
    : children;
  return (
    <div className={cx("ld-field", hasSuccess && "ld-field--success", className)}>
      <Label id={ids.label} htmlFor={id}>
        {label}
      </Label>
      {control}
      {hint && (
        <p className="ld-field__hint" id={ids.hint}>
          {hint}
        </p>
      )}
      {/* always rendered: a live region must exist before its text changes to be announced */}
      <p
        className={cx("ld-field__message", hasError && "ld-field__message--error", hasSuccess && "ld-field__message--success")}
        id={ids.message}
        aria-live="polite"
      >
        {hasError ? error : hasSuccess ? success : null}
      </p>
    </div>
  );
}

type ChoiceProps = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode };

function choice(kind: "checkbox" | "radio" | "switch") {
  const inputClass = `ld-${kind}`;
  const type = kind === "switch" ? "checkbox" : kind;
  return function Choice({ label, className, ...rest }: ChoiceProps) {
    const input = <input type={type} role={kind === "switch" ? "switch" : undefined} className={cx(inputClass, className)} {...rest} />;
    if (label === undefined) return input;
    return (
      <label className="ld-choice">
        {input}
        {label}
      </label>
    );
  };
}

export const Checkbox = choice("checkbox");
export const Radio = choice("radio");
export const Switch = choice("switch");
