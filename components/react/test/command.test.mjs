// Fuzzy scoring, grouping, highlighting and recents behind CommandPalette.
// Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { filterCommands, fuzzyMatch, highlight, pushRecent } from "../src/command-filter.ts";

test("fuzzyMatch: a substring matches as one range, case-insensitively", () => {
  assert.deepEqual(fuzzyMatch("SET", "Open settings").ranges, [[5, 8]]);
});

test("fuzzyMatch: scattered characters match in order and merge into runs", () => {
  assert.deepEqual(fuzzyMatch("gtse", "Go to settings").ranges, [[0, 1], [3, 4], [6, 8]]);
  assert.equal(fuzzyMatch("yd", "Deploy"), null); // out of order
  assert.equal(fuzzyMatch("xyz", "Go to settings"), null);
});

test("fuzzyMatch: prefix beats word start beats mid-word; contiguous beats scattered", () => {
  const score = (q, t) => fuzzyMatch(q, t).score;
  assert.ok(score("dep", "Deploy") > score("dep", "Run deploy"));
  assert.ok(score("dep", "Run deploy") > score("dep", "Redeploy"));
  assert.ok(score("dep", "Redeploy") > score("dep", "Delete pipeline"));
  assert.ok(score("dep", "Deploy") > score("dep", "Deploy to production, then notify"));
});

test("fuzzyMatch: an empty query matches everything with no ranges", () => {
  assert.deepEqual(fuzzyMatch("  ", "Anything"), { score: 0, ranges: [] });
});

const items = [
  { id: "new", label: "New project", group: "Create" },
  { id: "inv", label: "Invite teammate", group: "Create" },
  { id: "dark", label: "Dark mode", group: "Settings", keywords: ["theme", "appearance"] },
  { id: "keys", label: "Keyboard shortcuts", group: "Settings" },
  { id: "deploy", label: "Deploy", group: "Pipelines" },
];
const view = (groups) => groups.map((g) => [g.label, g.items.map((r) => r.item.id)]);

test("filterCommands: no query lists recents first, then the rest by group", () => {
  assert.deepEqual(view(filterCommands(items, "", ["deploy", "gone", "new"])), [
    ["Recent", ["deploy", "new"]],
    ["Create", ["inv"]],
    ["Settings", ["dark", "keys"]],
  ]);
  assert.deepEqual(view(filterCommands(items, "")).map(([g]) => g), ["Create", "Settings", "Pipelines"]);
});

test("filterCommands: a query keeps matches only, best group and best item first", () => {
  assert.deepEqual(view(filterCommands(items, "de")), [
    ["Pipelines", ["deploy"]],
    ["Settings", ["dark"]],
  ]);
  assert.deepEqual(view(filterCommands(items, "zzz")), []);
});

test("filterCommands: keywords match without highlighting the label", () => {
  const [group] = filterCommands(items, "theme");
  assert.equal(group.items[0].item.id, "dark");
  assert.deepEqual(group.items[0].ranges, []);
});

test("highlight cuts text into matched and plain runs", () => {
  assert.deepEqual(highlight("Go to settings", [[0, 1], [6, 8]]), [
    { text: "G", match: true },
    { text: "o to ", match: false },
    { text: "se", match: true },
    { text: "ttings", match: false },
  ]);
  assert.deepEqual(highlight("Deploy", []), [{ text: "Deploy", match: false }]);
});

test("pushRecent moves an id to the front and caps the list", () => {
  assert.deepEqual(pushRecent(["a", "b", "c"], "c"), ["c", "a", "b"]);
  assert.deepEqual(pushRecent(["a", "b"], "z", 2), ["z", "a"]);
});
