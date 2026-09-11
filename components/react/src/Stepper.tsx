import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx.js";
import { stepAttrs, stepState } from "./stepper-state.js";

export interface StepItem {
  id: string;
  label: ReactNode;
  /** Icon inside the node. Defaults to a check mark once complete, else the step number. */
  icon?: ReactNode;
}

export interface StepperProps extends HTMLAttributes<HTMLOListElement> {
  steps: StepItem[];
  /** Index of the step in progress. Earlier steps are complete, later ones upcoming;
   *  pass `steps.length` when everything is done. */
  current: number;
  /** Extra class for every step `<li>`. */
  stepClassName?: string;
}

/** Horizontal milestone rail: labelled step nodes on a progress track. The
 *  theme CSS fills the rail up to the current node from the state modifiers,
 *  so `current` is the only piece of state. */
export function Stepper({ steps, current, stepClassName, className, ...rest }: StepperProps) {
  return (
    <ol className={cx("ld-stepper", className)} {...rest}>
      {steps.map((step, index) => (
        <li key={step.id} {...stepAttrs(index, current, stepClassName)}>
          <span className="ld-stepper__node" aria-hidden="true">
            {step.icon ?? (stepState(index, current) === "complete" ? <CheckIcon /> : index + 1)}
          </span>
          <span className="ld-stepper__label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}
