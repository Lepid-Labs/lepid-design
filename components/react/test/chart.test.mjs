// Scale, tick and geometry math behind BarChart, LineChart and Sparkline.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bandLayout, barExtent, extremes, formatTick, labelEvery, linePath, linearScale, niceScale, spreadLabels, tickStep,
} from "../src/chart-scale.ts";

test("linearScale: maps the domain onto the range, inverted ranges included", () => {
  const y = linearScale([0, 100], [200, 0]);
  assert.equal(y(0), 200);
  assert.equal(y(100), 0);
  assert.equal(y(25), 150);
  assert.equal(linearScale([5, 5], [0, 10])(5), 5, "a flat domain sits mid-range");
});

test("tickStep: 1, 2 or 5 times a power of ten", () => {
  assert.equal(tickStep(10, 5), 2);
  assert.equal(tickStep(100, 5), 20);
  assert.equal(tickStep(312, 5), 50);
  assert.equal(tickStep(1, 5), 0.2);
  assert.equal(tickStep(0, 5), 1);
});

test("niceScale: bars start at zero and end on a round tick", () => {
  const s = niceScale([42, 87, 63]);
  assert.deepEqual(s.domain, [0, 100]);
  assert.deepEqual(s.ticks, [0, 20, 40, 60, 80, 100]);
  assert.equal(s.broken, false);
});

test("niceScale: negative values widen the axis below zero", () => {
  const s = niceScale([-12, 30]);
  assert.ok(s.domain[0] <= -12 && s.domain[1] >= 30);
  assert.ok(s.ticks.includes(0));
});

test("niceScale: zero: false fits the data and reports the axis break", () => {
  const s = niceScale([96.2, 98.7, 97.1], { zero: false });
  assert.ok(s.domain[0] > 0 && s.domain[0] <= 96.2 && s.domain[1] >= 98.7);
  assert.equal(s.broken, true);
  assert.equal(niceScale([0.4, 9], { zero: false }).broken, false, "a fitted axis that reaches zero is not broken");
});

test("niceScale: ticks carry no floating-point noise", () => {
  for (const t of niceScale([0.1, 0.7]).ticks) assert.equal(String(t).length <= 4, true, String(t));
});

test("niceScale: empty, flat and gappy data still give an axis", () => {
  assert.deepEqual(niceScale([]).domain, [0, 1]);
  assert.deepEqual(niceScale([0, 0]).domain, [0, 1]);
  assert.deepEqual(niceScale([5, 5]).domain[0], 0);
  const flat = niceScale([5, 5], { zero: false });
  assert.ok(flat.domain[0] < 5 && flat.domain[1] > 5);
  assert.deepEqual(niceScale([3, null, NaN, 8]).domain, [0, 8]);
});

test("formatTick: decimals follow the step", () => {
  assert.equal(formatTick(20, 20, "en"), "20");
  assert.equal(formatTick(0.4, 0.2, "en"), "0.4");
  assert.equal(formatTick(0.25, 0.05, "en"), "0.25");
  assert.equal(formatTick(1500, 500, "en"), "1,500");
});

test("bandLayout: equal bands, bars centred with the gap split either side", () => {
  const { bands, band, width } = bandLayout(4, [0, 400], 0.25);
  assert.equal(band, 100);
  assert.equal(width, 75);
  assert.deepEqual(bands[0], { x: 12.5, center: 50 });
  assert.deepEqual(bands[3], { x: 312.5, center: 350 });
  assert.deepEqual(bandLayout(0, [0, 400]).bands, []);
});

test("barExtent: bars grow from the zero line, down for negatives", () => {
  const y = linearScale([-50, 100], [150, 0]);
  assert.deepEqual(barExtent(100, y), { y: 0, height: 100 });
  assert.deepEqual(barExtent(-50, y), { y: 100, height: 50 });
  assert.deepEqual(barExtent(0, y), { y: 100, height: 0 });
});

test("linePath: moves then lines, and a null breaks the line", () => {
  assert.equal(linePath([[0, 10], [5, 20], [10, 15]]), "M0,10L5,20L10,15");
  assert.equal(linePath([[0, 10], [5, null], [10, 15], [15, 5]]), "M0,10M10,15L15,5");
  assert.equal(linePath([[0.123, 1 / 3]]), "M0.12,0.33");
  assert.equal(linePath([]), "");
});

test("spreadLabels: pushes crowded labels apart, keeps order, stays in bounds", () => {
  assert.deepEqual(spreadLabels([10, 50, 100], 12), [10, 50, 100], "far apart: untouched");
  const out = spreadLabels([50, 52, 51], 12);
  const sorted = [...out].sort((a, b) => a - b);
  assert.ok(sorted[1] - sorted[0] >= 12 && sorted[2] - sorted[1] >= 12);
  assert.ok(out[0] < out[2] && out[2] < out[1], "the order of the inputs is kept");
  const clamped = spreadLabels([98, 99], 12, [0, 100]);
  assert.ok(Math.max(...clamped) <= 100 && Math.abs(clamped[0] - clamped[1]) >= 12);
});

test("extremes: low, high, first and last present values", () => {
  assert.deepEqual(extremes([null, 4, 9, 2, null]), { min: 2, max: 9, minIndex: 3, maxIndex: 2, first: 4, last: 2, lastIndex: 3 });
  assert.equal(extremes([null, NaN]), undefined);
});

test("labelEvery: thins category labels that would collide", () => {
  assert.equal(labelEvery(60, 40), 1);
  assert.equal(labelEvery(20, 50), 3);
});
