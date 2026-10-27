// OtpInput cell logic: one code string, cells as a view. Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { otpActiveIndex, otpErase, otpInput, otpMove, otpTyped } from "../src/otp-state.ts";

test("typing a digit fills the cell and advances", () => {
  assert.deepEqual(otpInput("", 0, "4", 6), { code: "4", focus: 1 });
  assert.deepEqual(otpInput("4", 1, "2", 6), { code: "42", focus: 2 });
  // the last cell keeps focus
  assert.deepEqual(otpInput("12345", 5, "6", 6), { code: "123456", focus: 5 });
});

test("typing over a filled cell replaces that digit", () => {
  assert.deepEqual(otpInput("123456", 2, "9", 6), { code: "129456", focus: 3 });
});

test("a cell past the first empty one writes into the first empty one", () => {
  assert.deepEqual(otpInput("12", 4, "3", 6), { code: "123", focus: 3 });
});

test("non-digits are ignored", () => {
  assert.deepEqual(otpInput("12", 2, "a", 6), { code: "12", focus: 2 });
  assert.deepEqual(otpInput("12", 2, " ", 6), { code: "12", focus: 2 });
});

test("paste or autofill of a whole code fills every cell, whichever cell it lands in", () => {
  assert.deepEqual(otpInput("", 0, "123456", 6), { code: "123456", focus: 5 });
  assert.deepEqual(otpInput("98", 2, "123 456", 6), { code: "123456", focus: 5 });
  assert.deepEqual(otpInput("", 0, "Your code is 123-456.", 6), { code: "123456", focus: 5 });
  // longer than the field: the first `length` digits
  assert.deepEqual(otpInput("", 0, "12345678", 6), { code: "123456", focus: 5 });
});

test("a partial paste writes from the cell it lands in", () => {
  assert.deepEqual(otpInput("12", 2, "34", 6), { code: "1234", focus: 4 });
  assert.deepEqual(otpInput("123456", 1, "99", 6), { code: "199456", focus: 3 });
});

test("an emptied cell (a mobile keyboard's delete) clears that digit", () => {
  assert.deepEqual(otpInput("123", 2, "", 6), { code: "12", focus: 2 });
});

test("Backspace clears the cell, or steps back from an empty cell and clears the previous one", () => {
  assert.deepEqual(otpErase("123", 2, "Backspace"), { code: "12", focus: 2 });
  assert.deepEqual(otpErase("12", 2, "Backspace"), { code: "1", focus: 1 });
  assert.deepEqual(otpErase("1", 1, "Backspace"), { code: "", focus: 0 });
  assert.deepEqual(otpErase("", 0, "Backspace"), { code: "", focus: 0 });
  // in the middle of a full code the later digits close the gap
  assert.deepEqual(otpErase("123456", 2, "Backspace"), { code: "12456", focus: 2 });
  assert.deepEqual(otpErase("123456", 5, "Backspace"), { code: "12345", focus: 5 });
});

test("Delete clears the cell and stays; on an empty cell it does nothing", () => {
  assert.deepEqual(otpErase("123", 1, "Delete"), { code: "13", focus: 1 });
  assert.deepEqual(otpErase("12", 2, "Delete"), { code: "12", focus: 2 });
});

test("arrows, Home and End move within the filled cells plus the next empty one", () => {
  assert.equal(otpMove("ArrowLeft", 2, "123", 6), 1);
  assert.equal(otpMove("ArrowLeft", 0, "123", 6), 0);
  assert.equal(otpMove("ArrowRight", 2, "123", 6), 3);
  assert.equal(otpMove("ArrowRight", 3, "123", 6), 3);
  assert.equal(otpMove("Home", 3, "123", 6), 0);
  assert.equal(otpMove("End", 0, "123", 6), 3);
  assert.equal(otpMove("End", 0, "123456", 6), 5);
  assert.equal(otpMove("a", 0, "123", 6), null);
  assert.equal(otpMove("Tab", 0, "123", 6), null);
});

test("otpActiveIndex is the first empty cell, or the last cell when full", () => {
  assert.equal(otpActiveIndex("", 6), 0);
  assert.equal(otpActiveIndex("12", 6), 2);
  assert.equal(otpActiveIndex("123456", 6), 5);
});

test("otpTyped recovers the new digit when the caret sat beside the old one", () => {
  assert.equal(otpTyped("", "7"), "7");
  assert.equal(otpTyped("3", "7"), "7"); // old digit was selected and replaced
  assert.equal(otpTyped("3", "37"), "7");
  assert.equal(otpTyped("3", "73"), "7");
  assert.equal(otpTyped("3", "33"), "3");
  assert.equal(otpTyped("3", ""), "");
  assert.equal(otpTyped("3", "123456"), "123456"); // an autofill that replaced it
});
