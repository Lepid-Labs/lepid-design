// Moves, keyboard steps, drop slots, auto-scroll and announcements behind
// SortableList and SortableBoard.
import assert from "node:assert/strict";
import { test } from "node:test";
import { edgeScroll, insertionIndex, keyboardMove, moveCard, moveItem, sortMessage } from "../src/reorder.ts";

test("moveItem: to is the index after the move", () => {
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 1, 1), ["a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c"], 0, 9), ["b", "c", "a"]);
  assert.deepEqual(moveItem(["a"], 4, 0), ["a"]);
});

test("moveCard: the card's own state moves with it, and untouched columns keep identity", () => {
  const a = { id: "a", title: "Task A", done: false, checklist: [true, false] };
  const b = { id: "b", title: "Task B" };
  const c = { id: "c", title: "Task C" };
  const cols = [
    { id: "todo", items: [a, b] },
    { id: "doing", items: [c] },
    { id: "done", items: [] },
  ];
  const next = moveCard(cols, { list: 0, index: 0 }, { list: 2, index: 0 });
  assert.equal(next[2].items[0], a); // the same object, checklist and all
  assert.deepEqual(next[0].items, [b]);
  assert.equal(next[1], cols[1]);
  assert.deepEqual(cols[0].items, [a, b], "the input is not mutated");
  const within = moveCard(cols, { list: 0, index: 0 }, { list: 0, index: 1 });
  assert.deepEqual(within[0].items, [b, a]);
  assert.equal(within[2], cols[2]);
  const past = moveCard(cols, { list: 1, index: 0 }, { list: 0, index: 7 });
  assert.deepEqual(past[0].items, [a, b, c]);
  assert.deepEqual(moveCard(cols, { list: 0, index: 5 }, { list: 1, index: 0 }), cols);
});

test("keyboardMove: arrows within a list and across lists, stopping at edges", () => {
  const lengths = [3, 2, 0];
  assert.deepEqual(keyboardMove({ list: 0, index: 1 }, "ArrowUp", lengths), { list: 0, index: 0 });
  assert.deepEqual(keyboardMove({ list: 0, index: 0 }, "ArrowUp", lengths), { list: 0, index: 0 });
  assert.deepEqual(keyboardMove({ list: 0, index: 2 }, "ArrowDown", lengths), { list: 0, index: 2 });
  assert.deepEqual(keyboardMove({ list: 0, index: 2 }, "ArrowRight", lengths), { list: 1, index: 2 }); // the end of a 2-item list
  assert.deepEqual(keyboardMove({ list: 1, index: 1 }, "ArrowRight", lengths), { list: 2, index: 0 }); // into an empty column
  assert.deepEqual(keyboardMove({ list: 2, index: 0 }, "ArrowRight", lengths), { list: 2, index: 0 });
  assert.deepEqual(keyboardMove({ list: 1, index: 0 }, "ArrowLeft", lengths), { list: 0, index: 0 });
  assert.deepEqual(keyboardMove({ list: 0, index: 1 }, "End", lengths), { list: 0, index: 2 });
  assert.deepEqual(keyboardMove({ list: 0, index: 1 }, "Home", lengths), { list: 0, index: 0 });
  assert.deepEqual(keyboardMove({ list: 0, index: 1 }, "x", lengths), { list: 0, index: 1 });
});

test("insertionIndex: midpoints passed", () => {
  const mids = [20, 60, 100];
  assert.equal(insertionIndex(5, mids), 0);
  assert.equal(insertionIndex(21, mids), 1);
  assert.equal(insertionIndex(60, mids), 1);
  assert.equal(insertionIndex(500, mids), 3);
  assert.equal(insertionIndex(10, []), 0);
});

test("edgeScroll: still in the middle, faster towards either edge", () => {
  assert.equal(edgeScroll(400, 0, 800), 0);
  assert.equal(edgeScroll(0, 0, 800), -18);
  assert.equal(edgeScroll(800, 0, 800), 18);
  assert.equal(edgeScroll(24, 0, 800), -9);
  assert.ok(edgeScroll(790, 0, 800) > edgeScroll(770, 0, 800));
  assert.equal(edgeScroll(-50, 0, 800), -18); // past the edge stays at full speed
  assert.equal(edgeScroll(135, 100, 190), 0); // a short scroller narrows the band
  assert.equal(edgeScroll(100, 100, 190), -18);
});

test("sortMessage: what a screen reader hears", () => {
  const at = { list: 2, index: 2 };
  assert.equal(sortMessage("move", "Task A", at, 5, "Done"), "Moved Task A to position 3 of 5 in Done.");
  assert.equal(sortMessage("drop", "Task A", at, 5, "Done"), "Dropped Task A at position 3 of 5 in Done.");
  assert.equal(sortMessage("cancel", "Task A", { list: 0, index: 0 }, 3), "Cancelled. Task A is back at position 1 of 3.");
  assert.match(sortMessage("grab", "Task A", at, 5), /^Picked up Task A, position 3 of 5\. Arrow keys/);
});
