// Deferred commit with a fake clock. Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { UNDO_MS, scheduleUndoable } from "../src/undoable.ts";

/** A clock that only moves when told to. */
function fakeClock() {
  let now = 0;
  const timers = new Map();
  let seq = 0;
  return {
    now: () => now,
    setTimeout: (run, ms) => (timers.set(++seq, { run, at: now + ms }), seq),
    clearTimeout: (id) => timers.delete(id),
    tick(ms) {
      now += ms;
      for (const [id, t] of [...timers]) if (t.at <= now) (timers.delete(id), t.run());
    },
  };
}

function setup(delay) {
  const clock = fakeClock();
  const log = [];
  const op = scheduleUndoable({ commit: () => log.push("commit"), undo: () => log.push("undo"), delay }, clock);
  return { clock, log, op };
}

test("commits once the window runs out", () => {
  const { clock, log, op } = setup(5000);
  clock.tick(4999);
  assert.deepEqual(log, []);
  assert.equal(op.status, "pending");
  clock.tick(1);
  assert.deepEqual(log, ["commit"]);
  assert.equal(op.status, "committed");
});

test("undo inside the window cancels the commit and runs the undo", () => {
  const { clock, log, op } = setup(5000);
  clock.tick(3000);
  assert.equal(op.undo(), true);
  clock.tick(10000);
  assert.deepEqual(log, ["undo"]);
  assert.equal(op.status, "undone");
});

test("undo after the commit does nothing and says so", () => {
  const { clock, log, op } = setup(5000);
  clock.tick(5000);
  assert.equal(op.undo(), false);
  assert.deepEqual(log, ["commit"]);
});

test("flush commits now, once", () => {
  const { clock, log, op } = setup(5000);
  assert.equal(op.flush(), true);
  assert.equal(op.flush(), false);
  clock.tick(10000);
  assert.deepEqual(log, ["commit"]);
});

test("pause stops the clock; resume carries the time left", () => {
  const { clock, log, op } = setup(5000);
  clock.tick(2000);
  op.pause();
  clock.tick(60000);
  assert.deepEqual(log, []);
  op.resume();
  clock.tick(2999);
  assert.deepEqual(log, []);
  clock.tick(1);
  assert.deepEqual(log, ["commit"]);
});

test("pause and resume are idempotent", () => {
  const { clock, log, op } = setup(5000);
  op.pause();
  op.pause();
  clock.tick(1000);
  op.resume();
  op.resume();
  clock.tick(5000);
  assert.deepEqual(log, ["commit"]);
});

test("default window is 8s", () => {
  assert.equal(UNDO_MS, 8000);
  assert.equal(scheduleUndoable({ commit() {} }, fakeClock()).delay, 8000);
});
