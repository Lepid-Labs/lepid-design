// Button attribute logic: variants, busy, and the focusable disabled-with-a-reason
// state. Runs the TS source directly; the React wrapper only spreads these.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buttonAttrs } from "../src/button-state.ts";

test("a plain button is the base class and nothing else", () => {
  assert.deepEqual(buttonAttrs({}), { className: "ld-btn", inert: false });
});

test("variant, size, then the caller's class", () => {
  assert.equal(buttonAttrs({ variant: "primary", size: "sm", className: "mine" }).className, "ld-btn ld-btn--primary ld-btn--sm mine");
});

test("busy sets aria-busy and swallows activation, but stays enabled", () => {
  assert.deepEqual(buttonAttrs({ busy: true }), { className: "ld-btn", "aria-busy": true, inert: true });
  assert.deepEqual(buttonAttrs({ busy: false }), { className: "ld-btn", inert: false });
});

test("a reason makes the button aria-disabled and describes it, after the caller's description", () => {
  assert.deepEqual(buttonAttrs({ reasonId: "why", describedBy: "own" }), {
    className: "ld-btn",
    "aria-disabled": true,
    "aria-describedby": "own why",
    inert: true,
  });
});

test("a caller's own aria-disabled also swallows activation", () => {
  assert.equal(buttonAttrs({ ariaDisabled: "true" }).inert, true);
  assert.equal(buttonAttrs({ ariaDisabled: true })["aria-disabled"], true);
  assert.equal(buttonAttrs({ ariaDisabled: false }).inert, false);
});
