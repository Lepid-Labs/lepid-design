// State logic behind Stepper: which step is complete / current / upcoming for
// a given `current`, and the attributes each one carries. Runs the TypeScript
// source directly (Node strips types); the React wrapper only spreads these.
import assert from "node:assert/strict";
import { test } from "node:test";
import { stepAttrs, stepState } from "../src/stepper-state.ts";

test("stepState: before current is complete, at it is current, after it is upcoming", () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => stepState(i, 2)), ["complete", "complete", "current", "upcoming"]);
});

test("stepState: current past the end reads as all complete, negative as all upcoming", () => {
  assert.deepEqual([0, 1, 2].map((i) => stepState(i, 3)), ["complete", "complete", "complete"]);
  assert.deepEqual([0, 1, 2].map((i) => stepState(i, -1)), ["upcoming", "upcoming", "upcoming"]);
});

test("stepAttrs: state becomes a BEM element modifier, consumer className is appended", () => {
  assert.deepEqual(stepAttrs(0, 2, "mine"), { className: "ld-stepper__step ld-stepper__step--complete mine" });
  assert.deepEqual(stepAttrs(3, 2), { className: "ld-stepper__step ld-stepper__step--upcoming" });
});

test("stepAttrs: only the current step carries aria-current=step", () => {
  assert.deepEqual(stepAttrs(2, 2), {
    className: "ld-stepper__step ld-stepper__step--current",
    "aria-current": "step",
  });
  assert.ok(!("aria-current" in stepAttrs(1, 2)));
  assert.ok(!("aria-current" in stepAttrs(3, 2)));
});
