import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx.js";

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

/** Label + control wrapper with standard field spacing. */
export function Field({ label, htmlFor, children }: { label: ReactNode; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="ld-field">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
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
