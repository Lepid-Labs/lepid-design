// Direction logic behind the sliding indicator. Runs the TypeScript source
// directly (Node strips types); the useSlideDir hook only feeds it indexes.
import assert from "node:assert/strict";
import { test } from "node:test";
import { slideDir } from "../src/slide-dir.ts";

test("slideDir: a higher index is forward, a lower one is back", () => {
  assert.equal(slideDir(0, 2), "forward");
  assert.equal(slideDir(2, 1), "back");
});

test("slideDir: no travel, no direction", () => {
  assert.equal(slideDir(1, 1), undefined);
});

test("slideDir: nothing active before or after leaves the direction alone", () => {
  assert.equal(slideDir(-1, 2), undefined);
  assert.equal(slideDir(2, -1), undefined);
  assert.equal(slideDir(-1, -1), undefined);
});
