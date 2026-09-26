// Attribute logic behind IconButton: class list, accessible name, tooltip,
// and the button-vs-link ARIA split. Runs the TypeScript source directly
// (Node strips types); the React wrapper only spreads these.
import assert from "node:assert/strict";
import { test } from "node:test";
import { iconButtonAttrs } from "../src/icon-button.ts";

test("iconButtonAttrs: a bare button is the base class, labelled, type=button", () => {
  assert.deepEqual(iconButtonAttrs({ label: "Settings" }), {
    className: "ld-icon-btn",
    "aria-label": "Settings",
    title: "Settings",
    type: "button",
  });
});

test("iconButtonAttrs: active and danger add modifiers, consumer className is appended last", () => {
  assert.equal(
    iconButtonAttrs({ label: "x", active: true, variant: "danger", className: "mine" }).className,
    "ld-icon-btn ld-icon-btn--active ld-icon-btn--danger mine",
  );
  assert.equal(iconButtonAttrs({ label: "x", variant: "default" }).className, "ld-icon-btn");
});

test("iconButtonAttrs: an explicit title overrides the label-derived tooltip", () => {
  const a = iconButtonAttrs({ label: "Edit project", title: "Edit (E)" });
  assert.equal(a["aria-label"], "Edit project");
  assert.equal(a.title, "Edit (E)");
});

test("iconButtonAttrs: an active button gets no aria-current (toggles use aria-pressed)", () => {
  assert.equal(iconButtonAttrs({ label: "x", active: true })["aria-current"], undefined);
});

test("iconButtonAttrs: a link drops type=button and marks aria-current only when active", () => {
  const idle = iconButtonAttrs({ label: "Settings", isButton: false });
  assert.equal(idle.type, undefined);
  assert.equal(idle["aria-current"], undefined);
  assert.equal(iconButtonAttrs({ label: "Settings", isButton: false, active: true })["aria-current"], "page");
});
