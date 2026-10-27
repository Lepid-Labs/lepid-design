// Pure state behind Field: the ids that tie a control to its hint and status
// message, the ARIA that follows from them, and when to (re)validate. Kept
// DOM-free so node:test runs it without a renderer (so it imports nothing).

export interface FieldIds {
  label: string;
  hint: string;
  message: string;
}

/** The ids Field gives its label, hint and status message, derived from the control's id. */
export function fieldIds(id: string): FieldIds {
  return { label: `${id}-label`, hint: `${id}-hint`, message: `${id}-message` };
}

export interface FieldControlOptions {
  /** The control's id. */
  id: string;
  hasHint?: boolean;
  /** An error message is showing. Wins over success. */
  hasError?: boolean;
  hasSuccess?: boolean;
  /** The control's own aria-describedby; kept, after the field's ids. */
  describedBy?: string;
}

// a type alias, not an interface, so it spreads into cloneElement's props
export type FieldControlAttrs = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-errormessage"?: string;
};

/** ARIA for the control inside a Field. The message rides in aria-describedby as
 *  well as aria-errormessage, because several screen readers still ignore the latter. */
export function fieldControlAttrs({ id, hasHint, hasError, hasSuccess, describedBy }: FieldControlOptions): FieldControlAttrs {
  const ids = fieldIds(id);
  const attrs: FieldControlAttrs = { id };
  const by = [hasHint && ids.hint, (hasError || hasSuccess) && ids.message, describedBy].filter(Boolean).join(" ");
  if (by) attrs["aria-describedby"] = by;
  if (hasError) {
    attrs["aria-invalid"] = true;
    attrs["aria-errormessage"] = ids.message;
  }
  return attrs;
}

/** What a field shows: nothing yet, a success mark, or an error. */
export type FieldStatus = "idle" | "valid" | "invalid";
export type ValidationEvent = "input" | "blur" | "submit";

/** Reward early, punish late. Blur and submit always validate. While a field
 *  shows an error, every keystroke re-validates so the error clears the moment
 *  it is fixed; otherwise typing never raises a new error (that waits for blur),
 *  and a success mark the value no longer earns goes away. */
export function nextFieldStatus(prev: FieldStatus, event: ValidationEvent, valid: boolean): FieldStatus {
  if (event !== "input" || prev === "invalid") return valid ? "valid" : "invalid";
  return valid ? prev : "idle";
}
