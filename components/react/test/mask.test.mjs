// applyMask / maskDeleteCaret: formatting as you type with the caret carried
// along. Each case is the field's text and caret after the browser applied an
// edit, the way MaskedInput's onChange sees it. Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMask, maskDeleteCaret, MASKS } from "../src/mask.ts";

const { card, phone, expiry, date } = MASKS;

/** Simulate typing `text` at `caret` in the formatted `value`. */
function type(value, caret, text, pattern) {
  return applyMask(value.slice(0, caret) + text + value.slice(caret), pattern, caret + text.length);
}

/** Simulate a key the way MaskedInput does: skip separators, let the browser delete, reformat. */
function erase(value, caret, key, pattern) {
  const c = maskDeleteCaret(value, pattern, caret, key);
  if (key === "Backspace") return c === 0 ? applyMask(value, pattern, c) : applyMask(value.slice(0, c - 1) + value.slice(c), pattern, c - 1);
  return applyMask(value.slice(0, c) + value.slice(c + 1), pattern, c);
}

test("card: groups of four, the caret stays after the digit just typed", () => {
  assert.deepEqual(applyMask("4", card, 1), { value: "4", raw: "4", caret: 1 });
  assert.deepEqual(applyMask("4111", card, 4), { value: "4111", raw: "4111", caret: 4 });
  // typing the fifth digit inserts the separator before it, and the caret lands after the digit
  assert.deepEqual(type("4111", 4, "1", card), { value: "4111 1", raw: "41111", caret: 6 });
  assert.deepEqual(applyMask("4111111111111111", card), {
    value: "4111 1111 1111 1111",
    raw: "4111111111111111",
    caret: 19,
  });
});

test("card: typing in the middle reflows the groups without moving the caret off the new digit", () => {
  // caret after "41", type 9
  assert.deepEqual(type("4111 1111", 2, "9", card), { value: "4191 1111 1", raw: "419111111", caret: 3 });
  // caret right after a separator: the digit joins the next group
  assert.deepEqual(type("4111 1111", 5, "9", card), { value: "4111 9111 1", raw: "411191111", caret: 6 });
});

test("no trailing separator is added, so a full group never traps Backspace", () => {
  assert.equal(applyMask("12", expiry).value, "12");
  assert.equal(applyMask("1234", card).value, "1234");
  assert.equal(applyMask("12/", expiry).value, "12");
});

test("Backspace across a separator removes the digit before it", () => {
  assert.deepEqual(erase("4111 1111", 5, "Backspace", card), { value: "4111 111", raw: "4111111", caret: 3 });
  // two literals in a row: ") "
  assert.deepEqual(erase("(555) 123", 6, "Backspace", phone), { value: "(551) 23", raw: "55123", caret: 3 });
  assert.deepEqual(erase("12/34", 3, "Backspace", expiry), { value: "13/4", raw: "134", caret: 1 });
});

test("Delete across a separator removes the digit after it", () => {
  assert.deepEqual(erase("4111 1111", 4, "Delete", card), { value: "4111 111", raw: "4111111", caret: 4 });
  assert.deepEqual(erase("12/34", 2, "Delete", expiry), { value: "12/4", raw: "124", caret: 2 });
});

test("without the key hook (mobile keyboards), deleting a separator just steps the caret back over it", () => {
  // the browser removed the space at index 4; the mask puts it back and the caret sits before it
  assert.deepEqual(applyMask("41111111", card, 4), { value: "4111 1111", raw: "41111111", caret: 4 });
});

test("deleting the last digit drops a leading literal with it", () => {
  assert.deepEqual(erase("(5", 2, "Backspace", phone), { value: "", raw: "", caret: 0 });
});

test("a selection deleted across groups reflows the rest", () => {
  // "4111 1111 1111" with "1 11" (indices 3–7) selected and deleted
  const v = "4111 1111 1111";
  assert.deepEqual(applyMask(v.slice(0, 3) + v.slice(7), card, 3), { value: "4111 1111 1", raw: "411111111", caret: 3 });
});

test("paste: foreign separators are cleaned and regrouped, overflow is cut", () => {
  assert.deepEqual(applyMask("4111-1111-1111-1111", card), {
    value: "4111 1111 1111 1111",
    raw: "4111111111111111",
    caret: 19,
  });
  assert.deepEqual(applyMask("555.123.4567 ext 9", phone), { value: "(555) 123-4567", raw: "5551234567", caret: 14 });
  // pasting into the middle of a full field pushes the tail off the end
  assert.deepEqual(type("12/34", 2, "99", expiry), { value: "12/99", raw: "1299", caret: 5 });
});

test("characters no slot takes are dropped and the caret stays put", () => {
  assert.deepEqual(type("12/3", 2, "x", expiry), { value: "12/3", raw: "123", caret: 2 });
  assert.deepEqual(applyMask("ab", date), { value: "", raw: "", caret: 0 });
});

test("phone and date: leading and inner literals", () => {
  assert.deepEqual(applyMask("5", phone), { value: "(5", raw: "5", caret: 2 });
  assert.deepEqual(applyMask("5551234567", phone), { value: "(555) 123-4567", raw: "5551234567", caret: 14 });
  assert.deepEqual(applyMask("31122026", date), { value: "31/12/2026", raw: "31122026", caret: 10 });
  // typing before the leading literal still lands the digit first
  assert.deepEqual(type("(555", 0, "9", phone), { value: "(955) 5", raw: "9555", caret: 2 });
});

test("letter and mixed slots", () => {
  assert.deepEqual(applyMask("ab12", "aa-99"), { value: "ab-12", raw: "ab12", caret: 5 });
  // a digit where a letter slot is next is dropped, not shifted into the digit slots
  assert.deepEqual(applyMask("a1b2", "aa-99"), { value: "ab-2", raw: "ab2", caret: 4 });
  assert.equal(applyMask("x1y2z3", "*-*-*-*").value, "x-1-y-2");
});

test("maskDeleteCaret leaves a caret beside data alone", () => {
  assert.equal(maskDeleteCaret("4111 1111", card, 3, "Backspace"), 3);
  assert.equal(maskDeleteCaret("4111 1111", card, 3, "Delete"), 3);
  assert.equal(maskDeleteCaret("(555) 123", phone, 6, "Backspace"), 4);
  assert.equal(maskDeleteCaret("(555) 123", phone, 4, "Delete"), 6);
});
