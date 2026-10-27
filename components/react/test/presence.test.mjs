// Colour, glide, idle and overflow behind PresenceCursors and AvatarStack.
import assert from "node:assert/strict";
import { test } from "node:test";
import { avatarOverflow, followPoint, initials, isIdle, presenceColor, PRESENCE_COLORS } from "../src/presence-state.ts";

test("presenceColor: stable, in range, and spread across the slots", () => {
  assert.equal(presenceColor("user-42"), presenceColor("user-42"));
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const c = presenceColor(`user-${i}`);
    assert.ok(Number.isInteger(c) && c >= 1 && c <= PRESENCE_COLORS, `slot ${c}`);
    seen.add(c);
  }
  assert.equal(seen.size, PRESENCE_COLORS);
  assert.ok(presenceColor("", 3) >= 1 && presenceColor("", 3) <= 3);
});

test("followPoint: glides towards the target and settles exactly on it", () => {
  const to = { x: 100, y: 0 };
  const half = followPoint({ x: 0, y: 0 }, to, 50); // one half-life closes half the gap
  assert.ok(Math.abs(half.x - 50) < 1e-9);
  let p = { x: 0, y: 0 };
  for (let i = 0; i < 60; i++) p = followPoint(p, to, 16);
  assert.deepEqual(p, to);
  assert.deepEqual(followPoint({ x: 0, y: 0 }, to, 0), { x: 0, y: 0 });
});

test("followPoint: a first sighting or reduced motion jumps", () => {
  assert.deepEqual(followPoint(undefined, { x: 5, y: 6 }, 16), { x: 5, y: 6 });
  assert.deepEqual(followPoint({ x: 0, y: 0 }, { x: 5, y: 6 }, 16, true), { x: 5, y: 6 });
});

test("isIdle", () => {
  assert.equal(isIdle(undefined, 99_999), false);
  assert.equal(isIdle(0, 9_999), false);
  assert.equal(isIdle(0, 10_000), true);
  assert.equal(isIdle(0, 500, 500), true);
});

test("initials", () => {
  assert.equal(initials("Ada Lovelace"), "AL");
  assert.equal(initials("  grace brewster murray hopper "), "GH");
  assert.equal(initials("cher"), "C");
  assert.equal(initials("Émile Zola"), "ÉZ");
  assert.equal(initials(""), "?");
});

test("avatarOverflow: the last slot becomes +N, never +1", () => {
  const people = ["a", "b", "c", "d", "e", "f", "g", "h"];
  assert.deepEqual(avatarOverflow(people.slice(0, 4), 4), { shown: ["a", "b", "c", "d"], hidden: [] });
  assert.deepEqual(avatarOverflow(people.slice(0, 5), 4), { shown: ["a", "b", "c"], hidden: ["d", "e"] });
  assert.deepEqual(avatarOverflow(people, 4).hidden.length, 5);
});
