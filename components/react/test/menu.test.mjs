// Roving focus and typeahead behind Menu (APG menu pattern). Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { TYPEAHEAD_RESET_MS, menuMove, menuTypeahead, typeaheadBuffer } from "../src/menu-nav.ts";

test("menuMove: arrows wrap, Home and End jump", () => {
  assert.equal(menuMove(4, 0, "ArrowDown"), 1);
  assert.equal(menuMove(4, 3, "ArrowDown"), 0);
  assert.equal(menuMove(4, 0, "ArrowUp"), 3);
  assert.equal(menuMove(4, 2, "Home"), 0);
  assert.equal(menuMove(4, 1, "End"), 3);
});

test("menuMove: from no focus, down is the first item and up the last", () => {
  assert.equal(menuMove(4, -1, "ArrowDown"), 0);
  assert.equal(menuMove(4, -1, "ArrowUp"), 3);
});

test("menuMove: other keys and empty menus move nothing", () => {
  assert.equal(menuMove(4, 1, "a"), undefined);
  assert.equal(menuMove(4, 1, "Tab"), undefined);
  assert.equal(menuMove(0, -1, "ArrowDown"), undefined);
});

const labels = ["Copy", "Cut", "Paste", "Paste special", "Delete"];

test("menuTypeahead: one character cycles through matches, starting after the current item", () => {
  assert.equal(menuTypeahead(labels, -1, "c"), 0);
  assert.equal(menuTypeahead(labels, 0, "c"), 1);
  assert.equal(menuTypeahead(labels, 1, "c"), 0);
  assert.equal(menuTypeahead(labels, 0, "cc"), 1);
  assert.equal(menuTypeahead(labels, 2, "D"), 4);
});

test("menuTypeahead: a longer string refines in place, and misses return -1", () => {
  assert.equal(menuTypeahead(labels, 2, "paste "), 3);
  assert.equal(menuTypeahead(labels, 2, "pa"), 2);
  assert.equal(menuTypeahead(labels, 0, "cu"), 1);
  assert.equal(menuTypeahead(labels, 0, "x"), -1);
  assert.equal(menuTypeahead([], -1, "a"), -1);
});

test("typeaheadBuffer: keys inside the window append, a pause starts over", () => {
  const a = typeaheadBuffer(undefined, "p", 0);
  const b = typeaheadBuffer(a, "a", 100);
  assert.equal(b.text, "pa");
  assert.equal(typeaheadBuffer(b, "c", 100 + TYPEAHEAD_RESET_MS).text, "c");
});
