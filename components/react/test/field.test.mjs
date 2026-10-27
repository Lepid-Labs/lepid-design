// Field wiring and validation timing. Runs the TS source directly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fieldControlAttrs, fieldIds, nextFieldStatus } from "../src/field-state.ts";

test("fieldIds derive from the control id", () => {
  assert.deepEqual(fieldIds("email"), { label: "email-label", hint: "email-hint", message: "email-message" });
});

test("a bare control only gets its id", () => {
  assert.deepEqual(fieldControlAttrs({ id: "email" }), { id: "email" });
});

test("hint and message are described, the control's own description is kept last", () => {
  assert.deepEqual(fieldControlAttrs({ id: "e", hasHint: true, hasSuccess: true, describedBy: "own" }), {
    id: "e",
    "aria-describedby": "e-hint e-message own",
  });
});

test("an error marks the control invalid and names the message both ways", () => {
  assert.deepEqual(fieldControlAttrs({ id: "e", hasError: true }), {
    id: "e",
    "aria-describedby": "e-message",
    "aria-invalid": true,
    "aria-errormessage": "e-message",
  });
});

test("reward early, punish late", () => {
  // typing into a fresh field raises nothing, valid or not
  assert.equal(nextFieldStatus("idle", "input", false), "idle");
  assert.equal(nextFieldStatus("idle", "input", true), "idle");
  // leaving the field (or submitting) validates
  assert.equal(nextFieldStatus("idle", "blur", false), "invalid");
  assert.equal(nextFieldStatus("idle", "blur", true), "valid");
  assert.equal(nextFieldStatus("idle", "submit", false), "invalid");
  // once in error, every keystroke re-validates: the error clears the moment it is fixed
  assert.equal(nextFieldStatus("invalid", "input", false), "invalid");
  assert.equal(nextFieldStatus("invalid", "input", true), "valid");
  // a valid field that is edited back into an error waits for blur, but drops its check now
  assert.equal(nextFieldStatus("valid", "input", false), "idle");
  assert.equal(nextFieldStatus("valid", "input", true), "valid");
  assert.equal(nextFieldStatus("valid", "blur", false), "invalid");
});
