// Rounding and fill behind StarRating's read-only display.
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatRating, ratingLabel, roundRating, starFills } from "../src/rating.ts";

test("roundRating: one decimal, clamped", () => {
  assert.equal(roundRating(4.34), 4.3);
  assert.equal(roundRating(4.35), 4.4); // halves round up, despite binary floats
  assert.equal(roundRating(-1), 0);
  assert.equal(roundRating(7), 5);
  assert.equal(roundRating(Number.NaN), 0);
});

test("roundRating: only a perfect score reads as perfect", () => {
  assert.equal(roundRating(4.97), 4.9);
  assert.equal(roundRating(4.999), 4.9);
  assert.equal(roundRating(5), 5);
  assert.equal(roundRating(9.96, 10), 9.9);
});

test("starFills: the stars show exactly the printed number", () => {
  assert.deepEqual(starFills(4.3), [1, 1, 1, 1, 0.3]);
  assert.deepEqual(starFills(4.34), [1, 1, 1, 1, 0.3]);
  assert.deepEqual(starFills(2.06), [1, 1, 0.1, 0, 0]);
  assert.deepEqual(starFills(0), [0, 0, 0, 0, 0]);
  assert.deepEqual(starFills(4.97), [1, 1, 1, 1, 0.9]);
  assert.deepEqual(starFills(3, 3), [1, 1, 1]);
});

test("formatRating and ratingLabel", () => {
  assert.equal(formatRating(4), "4.0");
  assert.equal(formatRating(4.25), "4.3");
  assert.equal(ratingLabel(4.3), "4.3 out of 5 stars");
  assert.equal(ratingLabel(4.3, 5, 1280), "4.3 out of 5 stars, 1,280 ratings");
  assert.equal(ratingLabel(5, 5, 1), "5.0 out of 5 stars, 1 rating");
  assert.equal(ratingLabel(0, 5, 0), "No ratings yet");
});
