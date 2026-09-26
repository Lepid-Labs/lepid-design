// Attribute and follow logic behind LogBlock. Runs the TypeScript source
// directly (Node strips types); the React wrapper only spreads these and reads
// the scroll metrics it passes in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { isPinnedToBottom, LOG_PIN_TOLERANCE, logAttrs } from "../src/log-state.ts";

test("logAttrs: base + log modifier, className last, live region on by default", () => {
  assert.deepEqual(logAttrs({}), { className: "ld-pre ld-pre--log", role: "log" });
  assert.equal(logAttrs({ className: "mine" }).className, "ld-pre ld-pre--log mine");
});

test("logAttrs: live={false} drops the log role", () => {
  assert.equal(logAttrs({ live: false }).role, undefined);
});

test("logAttrs: maxHeight becomes --ld-log-max-height; numbers are px", () => {
  assert.deepEqual(logAttrs({ maxHeight: 240 }).style, { "--ld-log-max-height": "240px" });
  assert.deepEqual(logAttrs({ maxHeight: "50vh" }).style, { "--ld-log-max-height": "50vh" });
  assert.equal(logAttrs({}).style, undefined);
});

test("isPinnedToBottom: exactly at the bottom", () => {
  assert.equal(isPinnedToBottom(600, 1000, 400), true);
});

test("isPinnedToBottom: within tolerance still follows; just past it doesn't", () => {
  assert.equal(isPinnedToBottom(600 - LOG_PIN_TOLERANCE, 1000, 400), true);
  assert.equal(isPinnedToBottom(600 - LOG_PIN_TOLERANCE - 1, 1000, 400), false);
});

test("isPinnedToBottom: scrolled up to read history pauses following", () => {
  assert.equal(isPinnedToBottom(100, 1000, 400), false);
});

test("isPinnedToBottom: content shorter than the box is always pinned", () => {
  assert.equal(isPinnedToBottom(0, 200, 400), true);
});
