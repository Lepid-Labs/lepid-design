// Loading-indicator timing: nothing for short waits, no flash once shown.
// Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { LOADING_TIMING, loadingIndicator, trackLoading } from "../src/loading-delay.ts";

const T = { delay: 400, minVisible: 500 };
const run = (flips, now) => {
  let win;
  for (const [at, loading] of flips) win = trackLoading(win, loading, at, T);
  return loadingIndicator(win, now, T);
};

test("defaults: 400ms before showing, 500ms minimum once shown", () => {
  assert.deepEqual(LOADING_TIMING, { delay: 400, minVisible: 500 });
});

test("never loaded: nothing shows and nothing is scheduled", () => {
  assert.deepEqual(loadingIndicator(undefined, 1000, T), { visible: false });
});

test("a load that ends before the delay never shows the indicator", () => {
  assert.deepEqual(run([[0, true]], 100), { visible: false, next: 400 });
  assert.deepEqual(run([[0, true], [300, false]], 350), { visible: false });
  assert.deepEqual(run([[0, true], [400, false]], 450), { visible: false });
});

test("a load still running at the delay shows until it ends", () => {
  assert.deepEqual(run([[0, true]], 400), { visible: true });
  assert.deepEqual(run([[0, true]], 5000), { visible: true });
});

test("ending just after it appeared keeps it up for the minimum", () => {
  assert.deepEqual(run([[0, true], [450, false]], 460), { visible: true, next: 900 });
  assert.deepEqual(run([[0, true], [450, false]], 900), { visible: false });
});

test("a long load hides as soon as it ends", () => {
  assert.deepEqual(run([[0, true], [3000, false]], 3000), { visible: false });
});

test("loading again while the indicator is still up continues it without a blink", () => {
  assert.deepEqual(run([[0, true], [450, false], [600, true]], 650), { visible: true });
  assert.deepEqual(run([[0, true], [450, false], [600, true], [700, false]], 800), { visible: true, next: 900 });
});

test("loading again after it hid starts a fresh delay", () => {
  assert.deepEqual(run([[0, true], [100, false], [1000, true]], 1100), { visible: false, next: 1400 });
});

test("repeated flips in the same direction change nothing", () => {
  const win = trackLoading(undefined, true, 0, T);
  assert.equal(trackLoading(win, true, 200, T), win);
  const done = trackLoading(win, false, 300, T);
  assert.equal(trackLoading(done, false, 400, T), done);
  assert.equal(trackLoading(undefined, false, 0, T), undefined);
});
