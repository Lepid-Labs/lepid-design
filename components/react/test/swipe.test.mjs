// Axis lock, rubber band and the release rule behind SwipeRow.
import assert from "node:assert/strict";
import { test } from "node:test";
import { rubberBand, swipeAxis, swipeOffset, swipeSettle, SWIPE_FLING } from "../src/swipe.ts";

test("swipeAxis: undecided inside the slop, then the larger component wins", () => {
  assert.equal(swipeAxis(3, 4), null);
  assert.equal(swipeAxis(12, 3), "x");
  assert.equal(swipeAxis(-12, 3), "x");
  assert.equal(swipeAxis(4, -14), "y"); // a scroll stays a scroll
});

test("rubberBand: follows less the further it goes, never past the dimension", () => {
  assert.equal(rubberBand(0, 300), 0);
  assert.equal(rubberBand(-5, 300), 0);
  const a = rubberBand(50, 300);
  const b = rubberBand(100, 300);
  assert.ok(a > 0 && a < 50);
  assert.ok(b > a && b - a < a, "each extra pixel moves it less");
  assert.ok(rubberBand(1e9, 300) < 300);
});

test("swipeOffset: 1:1 up to the limit, rubber band past it, either side", () => {
  const limits = { leading: 80, trailing: 160, width: 360 };
  assert.equal(swipeOffset(40, limits), 40);
  assert.equal(swipeOffset(-160, limits), -160);
  assert.ok(swipeOffset(120, limits) > 80 && swipeOffset(120, limits) < 120);
  assert.ok(swipeOffset(-200, limits) < -160 && swipeOffset(-200, limits) > -200);
  const none = { leading: 0, trailing: 160, width: 360 };
  assert.ok(swipeOffset(60, none) > 0 && swipeOffset(60, none) < 60 * 0.6, "a side with no actions resists from the start");
});

test("swipeSettle: distance opens, a flick opens or closes, only distance goes full", () => {
  const row = { leading: 80, trailing: 160, width: 360, fullTrailing: true };
  assert.equal(swipeSettle({ ...row, offset: -90, velocity: 0 }), "trailing");
  assert.equal(swipeSettle({ ...row, offset: -70, velocity: 0 }), "closed");
  assert.equal(swipeSettle({ ...row, offset: -30, velocity: -(SWIPE_FLING + 0.1) }), "trailing");
  assert.equal(swipeSettle({ ...row, offset: -150, velocity: SWIPE_FLING + 0.1 }), "closed"); // flicked back
  assert.equal(swipeSettle({ ...row, offset: -230, velocity: 0 }), "full-trailing");
  assert.equal(swipeSettle({ ...row, offset: -100, velocity: -3 }), "trailing", "a fast brush never deletes");
  assert.equal(swipeSettle({ ...row, offset: 300, velocity: 0 }), "leading", "no full swipe on that side");
  assert.equal(swipeSettle({ ...row, leading: 0, offset: 40, velocity: 1 }), "closed");
  assert.equal(swipeSettle({ ...row, offset: 0, velocity: 2 }), "closed");
});
