// Attribute logic behind ButtonGroup: the track's class list and role. Runs the
// TypeScript source directly (Node strips types); the React wrapper only
// spreads these.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buttonGroupAttrs } from "../src/button-group.ts";

test("buttonGroupAttrs: a bare group is the track class with role=group", () => {
  assert.deepEqual(buttonGroupAttrs(), { className: "ld-btn-group", role: "group" });
});

test("buttonGroupAttrs: block adds the --block modifier, consumer className is appended", () => {
  assert.deepEqual(buttonGroupAttrs(true, "mine"), {
    className: "ld-btn-group ld-btn-group--block mine",
    role: "group",
  });
  assert.equal(buttonGroupAttrs(false, "mine").className, "ld-btn-group mine");
});
