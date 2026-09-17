// Pure attribute logic behind ButtonGroup, kept DOM-free so it can be tested
// under node:test without a renderer (so it imports nothing — Node runs the
// .ts source and cannot resolve the .js specifiers the build uses).

export interface ButtonGroupAttrs {
  className: string;
  role: "group";
}

/** Root class list and role for the group track. `block` stretches it to the
 *  row with equal-width segments. */
export function buttonGroupAttrs(block?: boolean, className?: string): ButtonGroupAttrs {
  return {
    className: ["ld-btn-group", block && "ld-btn-group--block", className].filter(Boolean).join(" "),
    role: "group",
  };
}
