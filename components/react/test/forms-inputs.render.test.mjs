// Forms slice inputs rendered with react-dom in happy-dom: PasswordField, OtpInput and MaskedInput.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h } from "react";
import { $, $$, click, fire, focus, keyDown, render, type, window } from "./dom.mjs";
import { PasswordField, OtpInput, MaskedInput, MASKS, Field, STRENGTH_LABELS, passwordStrength } from "../dist/index.js";

const ids = (el, attr) => el.getAttribute(attr)?.split(" ");

// ── PasswordField ───────────────────────────────────────────────────────────

test("PasswordField (current): the reveal toggle swaps the type, carries state in aria-pressed, keeps focus", async () => {
  await render(h(PasswordField, { id: "pw", defaultValue: "hunter22" }));
  const input = $("#pw");
  const toggle = $("button.ld-password__toggle");
  assert.equal(input.type, "password");
  assert.equal(input.getAttribute("autocomplete"), "current-password");
  assert.equal(toggle.getAttribute("aria-label"), "Show password");
  assert.equal(toggle.getAttribute("aria-controls"), "pw");
  assert.equal(toggle.getAttribute("aria-pressed"), "false");
  assert.equal($(".ld-password__rules"), null);
  assert.equal($("[role=progressbar]"), null);

  await focus(input);
  input.setSelectionRange(2, 5);
  assert.ok((await fire(toggle, "mousedown", {}, window.MouseEvent)).defaultPrevented, "a press keeps focus in the field");
  await click(toggle);
  assert.equal(input.type, "text");
  assert.equal(toggle.getAttribute("aria-pressed"), "true");
  assert.equal(toggle.getAttribute("aria-label"), "Show password", "the name never changes");
  assert.deepEqual([input.selectionStart, input.selectionEnd], [2, 5]);
  await click(toggle);
  assert.equal(input.type, "password");
});

test("PasswordField (new): live strength meter and a checklist that ticks as you type", async () => {
  let last;
  await render(h("div", null, h("p", { id: "pw-hint" }, "Hint"),
    h(PasswordField, { id: "pw", mode: "new", "aria-describedby": "pw-hint", onChange: (e) => (last = e.target.value) })));
  const input = $("#pw");
  const bar = $("[role=progressbar]");
  const rules = () => $$(".ld-password__rule");
  assert.equal(input.getAttribute("autocomplete"), "new-password");
  assert.deepEqual(ids(input, "aria-describedby"), ["pw-hint", "pw-rules"]);
  assert.equal(bar.getAttribute("aria-label"), "Password strength");
  assert.equal(bar.getAttribute("aria-valuetext"), "Empty");
  assert.equal(bar.getAttribute("aria-valuenow"), "0");
  assert.equal($(".ld-password__score").getAttribute("aria-live"), "polite");
  assert.deepEqual(rules().map((li) => li.textContent.endsWith("(not yet)")), [true, true, true]);

  for (const pw of ["abc", "Correct-Horse-Battery-9"]) {
    await type(input, pw);
    const score = passwordStrength(pw);
    assert.equal(last, pw);
    assert.equal(bar.getAttribute("aria-valuetext"), STRENGTH_LABELS[score]);
    assert.equal(bar.getAttribute("aria-valuenow"), String((score + 1) * 20));
    assert.equal($(".ld-password__score").textContent, STRENGTH_LABELS[score]);
  }
  assert.deepEqual(rules().map((li) => li.classList.contains("ld-password__rule--met")), [true, true, true]);
  assert.ok(rules().every((li) => li.textContent.endsWith("(done)")));
});

// ── OtpInput ────────────────────────────────────────────────────────────────

const cells = () => $$(".ld-otp__cell");
const tabbable = () => cells().findIndex((c) => c.tabIndex === 0);

test("OtpInput: labelled cells, typing advances, Backspace steps back, arrows stop at the active cell", async () => {
  const changes = [];
  await render(h(OtpInput, { length: 4, name: "code", "aria-label": "Sign-in code", onChange: (c) => changes.push(c) }));
  assert.equal($("[role=group]").getAttribute("aria-label"), "Sign-in code");
  assert.deepEqual(cells().map((c) => c.getAttribute("aria-label")), ["Digit 1 of 4", "Digit 2 of 4", "Digit 3 of 4", "Digit 4 of 4"]);
  assert.deepEqual(cells().map((c) => c.getAttribute("autocomplete")), ["one-time-code", "off", "off", "off"]);
  assert.ok(cells().every((c) => c.getAttribute("inputmode") === "numeric"));
  assert.equal(tabbable(), 0);

  await focus(cells()[2]);
  assert.equal(document.activeElement, cells()[0], "focus past the active cell snaps back to it");
  await type(cells()[0], "7");
  await type(cells()[1], "x");
  assert.deepEqual(changes, ["7"], "non-digits are dropped");
  await type(cells()[1], "3");
  assert.equal(document.activeElement, cells()[2]);
  assert.equal(tabbable(), 2, "only the next cell to fill is in the tab order");
  assert.equal($("input[type=hidden]").value, "73");

  await keyDown(cells()[2], "ArrowLeft");
  assert.equal(document.activeElement, cells()[1]);
  await keyDown(cells()[1], "ArrowRight");
  await keyDown(cells()[2], "ArrowRight");
  assert.equal(document.activeElement, cells()[2], "nothing to edit beyond the active cell");
  assert.ok((await keyDown(cells()[2], "Backspace")).defaultPrevented);
  assert.equal(document.activeElement, cells()[1]);
  assert.deepEqual(cells().map((c) => c.value), ["7", "", "", ""]);
  assert.equal(changes.at(-1), "7");
});

test("OtpInput: a paste fills every cell and completes; inside a Field it takes the label and error", async () => {
  const done = [];
  await render(h(Field, { label: "Code", hint: "Sent by text", error: "That code expired" },
    h(OtpInput, { id: "otp", onComplete: (c) => done.push(c) })));
  const group = $("[role=group]");
  assert.equal(group.getAttribute("aria-labelledby"), "otp-label");
  assert.equal($("#otp-label").textContent, "Code");
  assert.equal(cells()[0].id, "otp");
  for (const c of cells()) {
    assert.deepEqual(ids(c, "aria-describedby"), ["otp-hint", "otp-message"]);
    assert.equal(c.getAttribute("aria-invalid"), "true");
    assert.equal(c.getAttribute("aria-errormessage"), "otp-message");
  }
  await focus(cells()[0]);
  await type(cells()[0], "12-34 56");
  assert.deepEqual(cells().map((c) => c.value), ["1", "2", "3", "4", "5", "6"]);
  assert.deepEqual(done, ["123456"]);
  assert.equal(document.activeElement, cells()[5]);
});

// ── MaskedInput ─────────────────────────────────────────────────────────────

test("MaskedInput: formats while typing, rejects wrong characters, submits the raw value", async () => {
  const seen = [];
  await render(h(MaskedInput, { mask: MASKS.phone, name: "phone", "aria-label": "Phone", onValueChange: (...a) => seen.push(a) }));
  const input = $("input[aria-label=Phone]");
  assert.equal(input.getAttribute("inputmode"), "numeric");
  assert.equal(input.hasAttribute("name"), false, "the visible field carries no name");
  await type(input, "555");
  assert.equal(input.value, "(555");
  await type(input, "(555x");
  assert.equal(input.value, "(555");
  await type(input, "5551234567");
  assert.equal(input.value, "(555) 123-4567");
  assert.deepEqual(seen.at(-1), ["5551234567", "(555) 123-4567"]);
  assert.equal($("input[type=hidden][name=phone]").value, "5551234567");
});

test("MaskedInput: a controlled raw value shows formatted; a letter mask drops the numeric keyboard", async () => {
  const { rerender } = await render(h(MaskedInput, { mask: MASKS.card, value: "4111111111111111", "aria-label": "Card" }));
  assert.equal($("input").value, "4111 1111 1111 1111");
  await rerender(h(MaskedInput, { mask: "aa-999", value: "AB123", "aria-label": "Ref" }));
  assert.equal($("input").value, "AB-123");
  assert.equal($("input").hasAttribute("inputmode"), false);
});
