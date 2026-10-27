// Snapping, fill and the no-cross rule behind Slider and RangeSlider.
import assert from "node:assert/strict";
import { test } from "node:test";
import { clampRange, rangeFraction, rangeTopThumb, snapToStep } from "../src/range.ts";

const percent = { min: 0, max: 100, step: 1 };

test("snapToStep: a typed value lands on a step, inside the bounds", () => {
  assert.equal(snapToStep(47.3, percent), 47);
  assert.equal(snapToStep(47.5, percent), 48);
  assert.equal(snapToStep(-5, percent), 0);
  assert.equal(snapToStep(250, percent), 100);
  assert.equal(snapToStep(Number.NaN, percent), 0);
  assert.equal(snapToStep(12, { min: 0, max: 100, step: 5 }), 10);
  assert.equal(snapToStep(13, { min: 0, max: 100, step: 5 }), 15);
});

test("snapToStep: steps count from min, decimals stay clean, max is never passed", () => {
  assert.equal(snapToStep(6, { min: 1, max: 21, step: 5 }), 6);
  assert.equal(snapToStep(0.30000000000000004, { min: 0, max: 1, step: 0.1 }), 0.3);
  assert.equal(snapToStep(0.75, { min: 0, max: 1, step: 0.05 }), 0.75);
  assert.equal(snapToStep(9.9, { min: 0, max: 10, step: 3 }), 9); // 12 would pass max
  assert.equal(snapToStep(4.2, { min: 0, max: 10, step: 0 }), 4.2);
});

test("rangeFraction: where the fill ends, clamped", () => {
  assert.equal(rangeFraction(25, 0, 100), 0.25);
  assert.equal(rangeFraction(150, 50, 250), 0.5);
  assert.equal(rangeFraction(-10, 0, 100), 0);
  assert.equal(rangeFraction(500, 0, 100), 1);
  assert.equal(rangeFraction(5, 5, 5), 0);
});

test("clampRange: the thumbs never cross, and keep the gap", () => {
  assert.deepEqual(clampRange([20, 80], 0, 30, percent), [30, 80]);
  assert.deepEqual(clampRange([20, 80], 0, 95, percent), [80, 80]);
  assert.deepEqual(clampRange([20, 80], 1, 5, percent), [20, 20]);
  assert.deepEqual(clampRange([20, 80], 0, 95, percent, 10), [70, 80]);
  assert.deepEqual(clampRange([20, 80], 1, 22, percent, 10), [20, 30]);
  assert.deepEqual(clampRange([20, 80], 1, 120.4, percent), [20, 100]);
  assert.deepEqual(clampRange([0, 100], 0, 41.6, { min: 0, max: 100, step: 5 }), [40, 100]);
});

test("rangeTopThumb: two thumbs parked at either end can still be pulled apart", () => {
  assert.equal(rangeTopThumb([100, 100], 0, 100), 0); // at max, the low thumb must move left
  assert.equal(rangeTopThumb([0, 0], 0, 100), 1); // at min, the high thumb must move right
  assert.equal(rangeTopThumb([20, 80], 0, 100), 1);
});
