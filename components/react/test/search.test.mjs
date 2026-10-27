// Debounced search queries with fake timers. Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { debounceQuery, normalizeQuery } from "../src/search-query.ts";

function fakeTimers() {
  let now = 0;
  let seq = 0;
  const timers = new Map();
  return {
    setTimeout: (run, ms) => (timers.set(++seq, { run, at: now + ms }), seq),
    clearTimeout: (id) => timers.delete(id),
    tick(ms) {
      now += ms;
      for (const [id, t] of [...timers]) if (t.at <= now) (timers.delete(id), t.run());
    },
  };
}

function setup() {
  const timers = fakeTimers();
  const sent = [];
  const q = debounceQuery((query) => sent.push(query), 250, timers);
  return { timers, sent, q };
}

test("normalizeQuery trims and collapses whitespace", () => {
  assert.equal(normalizeQuery("  deploy   web "), "deploy web");
});

test("a query goes out once typing pauses, not per keystroke", () => {
  const { timers, sent, q } = setup();
  q.input("d");
  timers.tick(100);
  q.input("de");
  timers.tick(249);
  assert.deepEqual(sent, []);
  timers.tick(1);
  assert.deepEqual(sent, ["de"]);
});

test("the same query is never sent twice in a row", () => {
  const { timers, sent, q } = setup();
  q.input("cat");
  timers.tick(250);
  q.input("cat ");
  timers.tick(250);
  q.input("cats");
  q.input("cat"); // back where it was before the pause: nothing new to ask
  timers.tick(250);
  assert.deepEqual(sent, ["cat"]);
});

test("clearing the field is sent at once; typing then deleting sends nothing", () => {
  const { timers, sent, q } = setup();
  q.input("a");
  q.input("");
  timers.tick(500);
  assert.deepEqual(sent, []);
  q.input("deploy");
  timers.tick(250);
  q.input("");
  assert.deepEqual(sent, ["deploy", ""]);
});

test("flush sends the pending query now; cancel drops it", () => {
  const { timers, sent, q } = setup();
  q.input("logs");
  q.flush();
  assert.deepEqual(sent, ["logs"]);
  q.input("logs e");
  q.cancel();
  timers.tick(500);
  assert.deepEqual(sent, ["logs"]);
});
