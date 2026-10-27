// Hex entry and the contrast check behind ColorField.
import assert from "node:assert/strict";
import { test } from "node:test";
import { contrastGrade, contrastRatio, formatContrast, normalizeHex } from "../src/color.ts";

test("normalizeHex: short, bare, upper-case and padded forms all become #rrggbb", () => {
  assert.equal(normalizeHex("#ABC"), "#aabbcc");
  assert.equal(normalizeHex("abc"), "#aabbcc");
  assert.equal(normalizeHex("  #3366FF "), "#3366ff");
  assert.equal(normalizeHex("3366ff"), "#3366ff");
});

test("normalizeHex: anything else is rejected, not guessed", () => {
  for (const bad of ["", "#", "#ab", "#abcd", "#3366ff80", "#ggg000", "red", "rgb(0,0,0)", "##abc"]) {
    assert.equal(normalizeHex(bad), undefined, bad);
  }
});

test("contrastRatio: the WCAG reference values, in either order", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
  assert.equal(contrastRatio("#ffffff", "#000000"), contrastRatio("#000000", "#ffffff"));
  assert.ok(Math.abs(contrastRatio("#767676", "#ffffff") - 4.54) < 0.01); // the lightest AA grey on white
  assert.ok(Math.abs(contrastRatio("#777777", "#ffffff") - 4.48) < 0.01); // just under
});

test("contrastGrade and formatContrast never round a failure into a pass", () => {
  assert.equal(contrastGrade(21), "AAA");
  assert.equal(contrastGrade(7), "AAA");
  assert.equal(contrastGrade(4.5), "AA");
  assert.equal(contrastGrade(4.49), "AA large");
  assert.equal(contrastGrade(3), "AA large");
  assert.equal(contrastGrade(2.99), "fail");
  assert.equal(formatContrast(4.49), "4.4:1");
  assert.equal(formatContrast(21), "21.0:1");
  assert.equal(formatContrast(contrastRatio("#777777", "#ffffff")), "4.4:1");
});
