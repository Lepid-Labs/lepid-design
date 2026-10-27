// Toast lifetimes, the visible cap, and the pausable clock. Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TOAST_ACTION_MS,
  TOAST_MIN_ATTENTION_MS,
  addToast,
  dismissToast,
  expiredToasts,
  nextToastExpiry,
  pauseToasts,
  toastDuration,
  toastQueue,
  visibleToasts,
} from "../src/toast-queue.ts";

const add = (q, id, duration, now = 0) => addToast(q, { id, duration, data: id }, now);
const ids = (items) => items.map((t) => t.id);

test("toastDuration: info and success 5s, warning 7s, errors stay", () => {
  assert.equal(toastDuration({}), 5000);
  assert.equal(toastDuration({ variant: "success" }), 5000);
  assert.equal(toastDuration({ variant: "warning" }), 7000);
  assert.equal(toastDuration({ variant: "danger" }), null);
});

test("toastDuration: an action buys time, and errors and actions have a floor", () => {
  assert.equal(toastDuration({ hasAction: true }), TOAST_ACTION_MS);
  assert.equal(toastDuration({ hasAction: true, duration: 2000 }), TOAST_MIN_ATTENTION_MS);
  assert.equal(toastDuration({ variant: "danger", duration: 3000 }), TOAST_MIN_ATTENTION_MS);
  assert.equal(toastDuration({ duration: 2000 }), 2000);
  assert.equal(toastDuration({ hasAction: true, duration: null }), null);
});

test("at most max show; the rest wait with their clock stopped", () => {
  let q = toastQueue(2);
  q = add(add(add(q, "a", 5000), "b", 5000), "c", 5000);
  assert.deepEqual(ids(visibleToasts(q)), ["a", "b"]);
  assert.equal(q.items[2].runningSince, undefined);
  assert.deepEqual(expiredToasts(q, 6000), ["a", "b"]);
});

test("dismissing a shown toast moves the next one up and starts its clock then", () => {
  let q = add(add(add(toastQueue(2), "a", 5000), "b", 5000), "c", 5000);
  q = dismissToast(q, "a", 1000);
  assert.deepEqual(ids(visibleToasts(q)), ["b", "c"]);
  assert.deepEqual(expiredToasts(q, 5000), ["b"]);
  assert.deepEqual(expiredToasts(q, 6000), ["b", "c"]);
});

test("pausing stops every clock; resuming carries the time left", () => {
  let q = add(toastQueue(), "a", 5000);
  q = pauseToasts(q, true, 2000);
  assert.equal(nextToastExpiry(q, 9000), undefined);
  assert.deepEqual(expiredToasts(q, 9000), []);
  q = pauseToasts(q, false, 9000);
  assert.equal(nextToastExpiry(q, 9000), 3000);
  assert.deepEqual(expiredToasts(q, 11999), []);
  assert.deepEqual(expiredToasts(q, 12000), ["a"]);
});

test("a toast added while paused waits for the resume to start", () => {
  let q = pauseToasts(toastQueue(), true, 0);
  q = add(q, "a", 5000, 100);
  q = pauseToasts(q, false, 4000);
  assert.equal(nextToastExpiry(q, 4000), 5000);
});

test("an untimed toast never expires and schedules nothing", () => {
  const q = add(toastQueue(), "err", null);
  assert.equal(nextToastExpiry(q, 1e9), undefined);
  assert.deepEqual(expiredToasts(q, 1e9), []);
});

test("nextToastExpiry picks the soonest running toast", () => {
  const q = add(add(toastQueue(), "a", 7000), "b", 5000, 1000);
  assert.equal(nextToastExpiry(q, 2000), 4000);
});

test("reusing an id replaces the toast in place with a fresh clock", () => {
  let q = add(add(toastQueue(), "save", 5000), "other", 5000);
  q = addToast(q, { id: "save", duration: 5000, data: "saved" }, 4000);
  assert.deepEqual(ids(q.items), ["save", "other"]);
  assert.equal(q.items[0].data, "saved");
  assert.equal(q.items[0].createdAt, 4000);
  assert.deepEqual(expiredToasts(q, 5000), ["other"]);
});

test("pausing to the same state is a no-op", () => {
  const q = add(toastQueue(), "a", 5000);
  assert.equal(pauseToasts(q, false, 100), q);
});
