// Pure state logic behind Stepper, kept DOM-free so it can be tested under
// node:test without a renderer (so it imports nothing — Node runs the .ts
// source and cannot resolve the .js specifiers the build uses).

export type StepState = "complete" | "current" | "upcoming";

/** Where step `index` sits relative to `current`: before it is complete, at it
 *  is current, after it is upcoming. A `current` past the last step therefore
 *  reads as "all complete"; a negative one as "all upcoming". */
export function stepState(index: number, current: number): StepState {
  if (index < current) return "complete";
  if (index === current) return "current";
  return "upcoming";
}

export interface StepAttrs {
  className: string;
  "aria-current"?: "step";
}

/** Class list and aria attributes for step `index`. The theme CSS derives
 *  the rail fill from the state modifiers, so nothing else is written. */
export function stepAttrs(index: number, current: number, className?: string): StepAttrs {
  const state = stepState(index, current);
  const attrs: StepAttrs = {
    className: ["ld-stepper__step", `ld-stepper__step--${state}`, className].filter(Boolean).join(" "),
  };
  if (state === "current") attrs["aria-current"] = "step";
  return attrs;
}
