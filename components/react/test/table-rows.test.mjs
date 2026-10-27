// Sort and selection rules behind SortHeader, the selection cells and
// useRowSelection. Runs the TypeScript source directly (Node strips types).
import assert from "node:assert/strict";
import { test } from "node:test";
import { ariaSort, nextSort, pageSelection, sortRows, toggleRow, togglePage } from "../src/table-rows.ts";

test("nextSort: one column at a time, cycling ascending → descending → off", () => {
  const asc = nextSort(null, "name");
  assert.deepEqual(asc, { key: "name", direction: "ascending" });
  const desc = nextSort(asc, "name");
  assert.deepEqual(desc, { key: "name", direction: "descending" });
  assert.equal(nextSort(desc, "name"), null);
  assert.deepEqual(nextSort(desc, "age"), { key: "age", direction: "ascending" }, "another column starts ascending");
});

test("ariaSort: only the sorted column carries the attribute", () => {
  const sort = { key: "name", direction: "descending" };
  assert.equal(ariaSort(sort, "name"), "descending");
  assert.equal(ariaSort(sort, "age"), undefined);
  assert.equal(ariaSort(null, "name"), undefined);
});

const rows = [
  { id: "a", name: "run 10", ms: 300 },
  { id: "b", name: "Run 9", ms: 120 },
  { id: "c", name: "run 2", ms: 300 },
  { id: "d", name: "", ms: null },
  { id: "e", name: "run 1", ms: 120 },
];
const by = (sort) => sortRows(rows, sort, (r, k) => r[k]).map((r) => r.id).join("");

test("sortRows: natural, case-blind text order; empties last both ways", () => {
  assert.equal(by({ key: "name", direction: "ascending" }), "ecbad");
  assert.equal(by({ key: "name", direction: "descending" }), "abced");
});

test("sortRows: stable in both directions, so ties keep the original order", () => {
  assert.equal(by({ key: "ms", direction: "ascending" }), "beacd");
  assert.equal(by({ key: "ms", direction: "descending" }), "acbed");
});

test("sortRows: no sort is a copy in the original order", () => {
  const out = sortRows(rows, null, () => 0);
  assert.notEqual(out, rows);
  assert.equal(out.map((r) => r.id).join(""), "abcde");
});

test("sortRows: dates compare by time", () => {
  const days = [{ d: new Date(2026, 5, 2) }, { d: new Date(2025, 0, 1) }];
  assert.deepEqual(sortRows(days, { key: "d", direction: "ascending" }, (r) => r.d), [days[1], days[0]]);
});

const page = ["a", "b", "c", "d"];

test("pageSelection: none, some or all of the page; other pages don't count", () => {
  assert.equal(pageSelection(new Set(), page), "none");
  assert.equal(pageSelection(new Set(["z"]), page), "none");
  assert.equal(pageSelection(new Set(["a", "z"]), page), "some");
  assert.equal(pageSelection(new Set(page), page), "all");
  assert.equal(pageSelection(new Set(["a"]), []), "none");
});

test("togglePage: some or none selects the page, all clears it, other pages are kept", () => {
  assert.deepEqual([...togglePage(new Set(["b", "z"]), page)].sort(), ["a", "b", "c", "d", "z"]);
  assert.deepEqual([...togglePage(new Set([...page, "z"]), page)], ["z"]);
});

test("toggleRow: a plain press flips one row and becomes the anchor", () => {
  const r = toggleRow(new Set(["a"]), "c", { order: page });
  assert.deepEqual([...r.selected].sort(), ["a", "c"]);
  assert.equal(r.anchor, "c");
  assert.deepEqual([...toggleRow(r.selected, "a", { order: page }).selected], ["c"]);
});

test("toggleRow: shift selects the range from the anchor, either direction", () => {
  assert.deepEqual([...toggleRow(new Set(["b"]), "d", { shift: true, anchor: "b", order: page }).selected].sort(), ["b", "c", "d"]);
  assert.deepEqual([...toggleRow(new Set(["d"]), "a", { shift: true, anchor: "d", order: page }).selected].sort(), page);
});

test("toggleRow: shift onto a selected row clears the range", () => {
  const out = toggleRow(new Set(page), "c", { shift: true, anchor: "a", order: page }).selected;
  assert.deepEqual([...out], ["d"]);
});

test("toggleRow: shift without an anchor on this page flips just the row", () => {
  assert.deepEqual([...toggleRow(new Set(), "c", { shift: true, anchor: null, order: page }).selected], ["c"]);
  assert.deepEqual([...toggleRow(new Set(), "c", { shift: true, anchor: "z", order: page }).selected], ["c"]);
});
