// Page arithmetic behind Pagination and PageSummary.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pageAfterResize, pageRange, pageSpan } from "../src/page-range.ts";

const show = (items) => items.map((i) => (i === "ellipsis" ? "…" : i)).join(" ");

test("pageRange: few pages list every one", () => {
  assert.equal(show(pageRange(1, 1)), "1");
  assert.equal(show(pageRange(3, 7)), "1 2 3 4 5 6 7");
  assert.deepEqual(pageRange(1, 0), []);
});

test("pageRange: first, last, the current page's neighbours, ellipsis for gaps", () => {
  assert.equal(show(pageRange(1, 20)), "1 2 3 4 5 … 20");
  assert.equal(show(pageRange(10, 20)), "1 … 9 10 11 … 20");
  assert.equal(show(pageRange(20, 20)), "1 … 16 17 18 19 20");
});

test("pageRange: an ellipsis never hides a single page", () => {
  assert.equal(show(pageRange(4, 20)), "1 2 3 4 5 … 20");
  assert.equal(show(pageRange(5, 20)), "1 … 4 5 6 … 20");
  assert.equal(show(pageRange(17, 20)), "1 … 16 17 18 19 20");
});

test("pageRange: the item count stays constant while paging", () => {
  for (let p = 1; p <= 40; p++) assert.equal(pageRange(p, 40, 2).length, 9, `page ${p}`);
});

test("pageRange: out-of-range pages clamp", () => {
  assert.equal(show(pageRange(99, 20)), show(pageRange(20, 20)));
  assert.equal(show(pageRange(-3, 20)), show(pageRange(1, 20)));
});

test("pageSpan: rows on the page, and a page past the end clamps to the last", () => {
  assert.deepEqual(pageSpan(2, 20, 312), { page: 2, pages: 16, from: 21, to: 40 });
  assert.deepEqual(pageSpan(16, 20, 312), { page: 16, pages: 16, from: 301, to: 312 });
  assert.deepEqual(pageSpan(17, 20, 312), pageSpan(16, 20, 312));
  assert.deepEqual(pageSpan(3, 20, 0), { page: 1, pages: 1, from: 0, to: 0 });
});

test("pageAfterResize: keeps the first row on screen in view", () => {
  assert.equal(pageAfterResize(3, 20, 50), 1); // row 41 is on page 1 of 50
  assert.equal(pageAfterResize(3, 20, 10), 5); // row 41 starts page 5 of 10
  assert.equal(pageAfterResize(1, 20, 100), 1);
});
