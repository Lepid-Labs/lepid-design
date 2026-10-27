// Placement, tooltip timing and sheet drag rules behind the overlay components.
// Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { placeAtPoint, placeBeside } from "../src/floating.ts";
import { TOOLTIP_DELAY_MS, tooltipDelay } from "../src/tooltip-state.ts";
import { sheetOffset, shouldDismissSheet } from "../src/sheet-drag.ts";

const viewport = { width: 800, height: 600 };
const size = { width: 200, height: 100 };

test("placeBeside: below and left-aligned by default", () => {
  assert.deepEqual(placeBeside({ x: 100, y: 50, width: 80, height: 30 }, size, viewport), { x: 100, y: 84, side: "bottom" });
});

test("placeBeside: flips above when there is no room below, stays when neither side fits", () => {
  assert.equal(placeBeside({ x: 100, y: 520, width: 80, height: 30 }, size, viewport).side, "top");
  assert.equal(placeBeside({ x: 100, y: 520, width: 80, height: 30 }, size, viewport).y, 416);
  assert.equal(placeBeside({ x: 0, y: 50, width: 80, height: 30 }, size, viewport, { side: "top" }).side, "bottom");
  assert.equal(placeBeside({ x: 0, y: 100, width: 80, height: 30 }, size, { width: 800, height: 220 }).side, "bottom");
});

test("placeBeside: centres on the anchor and slides inside the viewport edge", () => {
  assert.equal(placeBeside({ x: 300, y: 50, width: 100, height: 30 }, size, viewport, { align: "center" }).x, 250);
  assert.equal(placeBeside({ x: 760, y: 50, width: 30, height: 30 }, size, viewport, { align: "center" }).x, 592);
  assert.equal(placeBeside({ x: 2, y: 50, width: 30, height: 30 }, size, viewport, { align: "center" }).x, 8);
});

test("placeAtPoint: opens down-right of the pointer, flips at the right and bottom edges", () => {
  assert.deepEqual(placeAtPoint({ x: 100, y: 100 }, size, viewport), { x: 100, y: 100 });
  assert.deepEqual(placeAtPoint({ x: 700, y: 550 }, size, viewport), { x: 500, y: 450 });
});

test("placeAtPoint: never leaves the viewport, even for a box bigger than the room", () => {
  assert.deepEqual(placeAtPoint({ x: 150, y: 50 }, size, viewport), { x: 150, y: 50 });
  assert.deepEqual(placeAtPoint({ x: 100, y: 100 }, { width: 900, height: 700 }, viewport), { x: 8, y: 8 });
});

test("tooltipDelay: waits the full delay from cold, none during a hand-off", () => {
  assert.equal(tooltipDelay(1000, { open: false }), TOOLTIP_DELAY_MS);
  assert.equal(tooltipDelay(1000, { open: true }), 0);
  assert.equal(tooltipDelay(1000, { open: false, lastHiddenAt: 800 }), 0);
  assert.equal(tooltipDelay(1000, { open: false, lastHiddenAt: 600 }), TOOLTIP_DELAY_MS);
  assert.equal(tooltipDelay(1000, { open: false }, 300), 300);
});

test("sheetOffset follows a drag down and ignores one up", () => {
  assert.equal(sheetOffset(40), 40);
  assert.equal(sheetOffset(-40), 0);
});

test("shouldDismissSheet: far enough or flung down closes, anything else springs back", () => {
  assert.equal(shouldDismissSheet({ offset: 130, height: 400, velocity: 0 }), true);
  assert.equal(shouldDismissSheet({ offset: 100, height: 400, velocity: 0.1 }), false);
  assert.equal(shouldDismissSheet({ offset: 30, height: 400, velocity: 1 }), true);
  assert.equal(shouldDismissSheet({ offset: 0, height: 400, velocity: 1 }), false);
  assert.equal(shouldDismissSheet({ offset: 30, height: 400, velocity: -1 }), false);
});
