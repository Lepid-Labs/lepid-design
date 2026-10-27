// Autosave state machine: debounce, one save at a time, offline queueing, and
// quiet announcements. Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { autosave, autosaveState, saveStatus, savedAgo, shouldAnnounceSave } from "../src/autosave-state.ts";

const play = (events, s = autosaveState()) => events.reduce(autosave, s);
const edit = (now) => ({ type: "edit", now });
const due = (at) => ({ type: "due", at });

test("a fresh document is idle", () => {
  assert.equal(saveStatus(autosaveState()), "idle");
  assert.equal(saveStatus(autosaveState({ online: false })), "offline");
});

test("edits debounce into one save after the pause", () => {
  let s = play([edit(0), edit(300), edit(600)]);
  assert.equal(saveStatus(s), "pending");
  assert.equal(s.dueAt, 1400);
  s = autosave(s, due(800)); // a timer set for an older deadline is ignored
  assert.equal(s.attempt, 0);
  s = autosave(s, due(1400));
  assert.equal(saveStatus(s), "saving");
  assert.equal(s.attempt, 1);
  s = autosave(s, { type: "saved", now: 1600 });
  assert.equal(saveStatus(s), "saved");
  assert.equal(s.savedAt, 1600);
});

test("typing that never pauses still saves after maxWait", () => {
  const s = play([edit(0), edit(4000), edit(4700)]);
  assert.equal(s.dueAt, 5000);
});

test("edits during a save wait for it, then go in the next save", () => {
  let s = play([edit(0), due(800), edit(900)]);
  assert.equal(s.inFlight, true);
  s = autosave(s, due(1700)); // its debounce ran out mid-save: nothing starts
  assert.equal(s.attempt, 1);
  s = autosave(s, { type: "saved", now: 2000 });
  assert.equal(saveStatus(s), "pending");
  assert.equal(s.dueAt, 2000); // straight away
  s = autosave(s, due(2000));
  assert.equal(s.attempt, 2);
});

test("a failed save online is an error; retry starts a new attempt", () => {
  let s = play([edit(0), due(800), { type: "failed", now: 900 }]);
  assert.equal(saveStatus(s), "error");
  assert.equal(s.dirty, true);
  assert.equal(s.dueAt, undefined); // no automatic hammering
  s = autosave(s, { type: "retry", now: 5000 });
  assert.equal(saveStatus(s), "saving");
  assert.equal(s.attempt, 2);
});

test("going offline mid-save shows offline, and a failure then is queued, not an error", () => {
  let s = play([edit(0), due(800), { type: "offline" }]);
  assert.equal(saveStatus(s), "offline");
  assert.equal(s.inFlight, true);
  s = autosave(s, { type: "failed", now: 1200 });
  assert.equal(saveStatus(s), "offline");
  assert.equal(s.failed, false);
  s = autosave(s, { type: "online", now: 9000 });
  assert.equal(s.dueAt, 9000); // the queued edits go as soon as the network is back
  s = autosave(s, due(9000));
  assert.equal(saveStatus(s), "saving");
});

test("going offline mid-save and the save still landing counts as saved", () => {
  let s = play([edit(0), due(800), { type: "offline" }, { type: "saved", now: 1000 }]);
  assert.equal(s.savedAt, 1000);
  assert.equal(s.dirty, false);
  s = autosave(s, { type: "online", now: 2000 });
  assert.equal(saveStatus(s), "saved");
  assert.equal(s.dueAt, undefined);
});

test("edits made offline are queued and nothing is scheduled", () => {
  let s = play([{ type: "offline" }, edit(0), edit(100)]);
  assert.equal(s.dueAt, undefined);
  assert.equal(s.attempt, 0);
  s = autosave(s, { type: "retry", now: 200 });
  assert.equal(s.attempt, 0);
  assert.equal(saveStatus(s), "offline");
});

test("retry with nothing to save is a no-op", () => {
  const s = autosave(autosaveState(), { type: "retry", now: 0 });
  assert.equal(s.attempt, 0);
});

test("announce problems once and the recovery from them; routine saves stay quiet", () => {
  assert.equal(shouldAnnounceSave(undefined, "saving"), false);
  assert.equal(shouldAnnounceSave(undefined, "saved"), false);
  assert.equal(shouldAnnounceSave(undefined, "offline"), true);
  assert.equal(shouldAnnounceSave("offline", "offline"), false);
  assert.equal(shouldAnnounceSave("offline", "saved"), true);
  assert.equal(shouldAnnounceSave("error", "saved"), true);
  assert.equal(shouldAnnounceSave("saved", "error"), true);
  assert.equal(shouldAnnounceSave("saved", "saved"), false);
});

test("savedAgo: silent under a minute, then minutes, hours, days", () => {
  const min = 60_000;
  assert.equal(savedAgo(0, 59_000, "en"), "");
  assert.equal(savedAgo(0, min, "en"), "1 minute ago");
  assert.equal(savedAgo(0, 59 * min, "en"), "59 minutes ago");
  assert.equal(savedAgo(0, 2 * 60 * min, "en"), "2 hours ago");
  assert.equal(savedAgo(0, 24 * 60 * min, "en"), "yesterday");
});
