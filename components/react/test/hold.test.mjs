// Behaviour of the hold-to-confirm state machine behind HoldButton. Runs the
// TypeScript source directly (Node strips types), with a fake clock, frame
// queue, and timer so every case is deterministic.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHoldController } from "../src/hold.ts";

function harness({ duration = 300, firedFor = 600 } = {}) {
  let t = 0;
  const frames = new Map();
  const timers = new Map();
  let nextId = 1;
  const progress = [];
  const states = [];
  let confirms = 0;

  const ctl = createHoldController({
    duration: () => duration,
    firedFor,
    onProgress: (p) => progress.push(p),
    onConfirm: () => confirms++,
    onStateChange: (s) => states.push(s),
    now: () => t,
    requestFrame: (cb) => {
      const id = nextId++;
      frames.set(id, cb);
      return id;
    },
    cancelFrame: (id) => frames.delete(id),
    setTimer: (cb, ms) => {
      const id = nextId++;
      timers.set(id, { cb, at: t + ms });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
  });

  /** Advance the clock by `ms`, running one frame per `step` ms. */
  const advance = (ms, step = 16) => {
    const end = t + ms;
    while (t < end) {
      t = Math.min(end, t + step);
      for (const [id, cb] of [...frames]) {
        frames.delete(id);
        cb();
      }
      for (const [id, { cb, at }] of [...timers]) {
        if (at <= t) {
          timers.delete(id);
          cb();
        }
      }
    }
  };

  return { ctl, advance, progress, states, confirms: () => confirms, pendingFrames: () => frames.size };
}

test("progress climbs to 1 and onConfirm fires exactly once at the window", () => {
  const h = harness();
  h.ctl.start();
  h.advance(150);
  const mid = h.progress.at(-1);
  assert.ok(mid > 0.3 && mid < 0.7, `mid-hold progress was ${mid}`);
  assert.equal(h.confirms(), 0);
  h.advance(200);
  assert.equal(h.confirms(), 1);
  assert.ok(h.progress.includes(1));
  assert.equal(h.ctl.state, "fired");
  h.advance(500);
  assert.equal(h.confirms(), 1, "must not fire again after completion");
});

test("releasing early resets to 0 and never fires", () => {
  const h = harness();
  h.ctl.start();
  h.advance(120);
  h.ctl.cancel();
  assert.equal(h.ctl.state, "idle");
  assert.equal(h.progress.at(-1), 0);
  assert.equal(h.pendingFrames(), 0, "frame loop must stop on cancel");
  h.advance(1000);
  assert.equal(h.confirms(), 0);
  assert.equal(h.progress.at(-1), 0);
});

test("a second start during a hold is ignored", () => {
  const h = harness();
  h.ctl.start();
  h.advance(200);
  h.ctl.start(); // e.g. keydown auto-repeat or a second pointer
  h.advance(150);
  assert.equal(h.confirms(), 1, "restarting would have pushed the window out");
});

test("fired state lingers for firedFor, then returns to idle at 0", () => {
  const h = harness({ firedFor: 500 });
  h.ctl.start();
  h.advance(320);
  assert.deepEqual(h.states, ["holding", "fired"]);
  h.advance(400);
  assert.equal(h.ctl.state, "fired");
  h.advance(200);
  assert.equal(h.ctl.state, "idle");
  assert.equal(h.progress.at(-1), 0);
});

test("cancel is a no-op while fired, and start works again once idle", () => {
  const h = harness();
  h.ctl.start();
  h.advance(320);
  h.ctl.cancel();
  assert.equal(h.ctl.state, "fired");
  h.advance(700);
  h.ctl.start();
  h.advance(320);
  assert.equal(h.confirms(), 2);
});

test("duration is resolved at start and honoured", () => {
  const h = harness({ duration: 1000 });
  h.ctl.start();
  h.advance(600);
  assert.equal(h.confirms(), 0);
  h.advance(450);
  assert.equal(h.confirms(), 1);
});

test("fire() skips the hold (keyboard-tap escape hatch) and still fires once", () => {
  const h = harness();
  h.ctl.fire();
  assert.equal(h.confirms(), 1);
  assert.equal(h.ctl.state, "fired");
  h.ctl.fire();
  assert.equal(h.confirms(), 1);
});

test("dispose drops pending frames and timers", () => {
  const h = harness();
  h.ctl.start();
  h.advance(320);
  h.ctl.dispose();
  h.advance(1000);
  assert.equal(h.ctl.state, "idle");
  assert.deepEqual(h.states, ["holding", "fired"], "no state change may fire after dispose");
});
