// Forms slice rendered with react-dom in happy-dom: busy and reasoned Button, HoldButton, Field and choices.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h } from "react";
import { $, $$, act, click, fire, focus, keyDown, pointer, render, spy, tick, wait, window } from "./dom.mjs";
import { Button, HoldButton, Field, Input, Textarea, Select, Label, Checkbox, Radio, Switch } from "../dist/index.js";

const btn = (name) => $$("button").find((b) => b.textContent.includes(name));
const ids = (el, attr) => el.getAttribute(attr)?.split(" ");

// ── Button ──────────────────────────────────────────────────────────────────

test("Button: busy swallows clicks (even submit), keeps focus and announces busyLabel", async () => {
  let clicks = 0;
  let submits = 0;
  const ui = (busy) =>
    h("form", { onSubmit: (e) => (e.preventDefault(), submits++) },
      h(Button, { type: "submit", busy, busyLabel: "Saving", onClick: () => clicks++ }, "Save"));
  const { rerender } = await render(ui(false));
  const b = btn("Save");
  assert.equal($("[role=status]").textContent, "", "the live region exists before it speaks");
  await click(b);
  assert.deepEqual([clicks, submits], [1, 1]);

  await focus(b);
  await rerender(ui(true));
  assert.equal(b.getAttribute("aria-busy"), "true");
  assert.equal(b.disabled, false, "busy is not disabled: it keeps focus");
  assert.equal($("[role=status]").textContent, "Saving");
  const e = await click(b);
  assert.ok(e.defaultPrevented);
  assert.deepEqual([clicks, submits], [1, 1]);
  assert.equal(document.activeElement, b);

  await rerender(ui(false));
  assert.equal(b.hasAttribute("aria-busy"), false);
  assert.equal($("[role=status]").textContent, "");
});

test("Button: a text reason makes it aria-disabled, described after the caller's ids, and keeps the node", async () => {
  let clicks = 0;
  const ui = (reason) =>
    h("div", null, h("p", { id: "own" }, "Own"),
      h(Button, { "aria-describedby": "own", disabledReason: reason, onClick: () => clicks++ }, "Publish"));
  const { rerender } = await render(ui("Add a title first"));
  const b = btn("Publish");
  const reason = $(".ld-btn-reason");
  assert.equal(reason.textContent, "Add a title first");
  assert.equal(b.getAttribute("aria-disabled"), "true");
  assert.equal(b.disabled, false, "still focusable and announced");
  assert.deepEqual(ids(b, "aria-describedby"), ["own", reason.id]);
  assert.equal($("[role=status]"), null, "no busy region unless busy is passed");
  assert.ok((await click(b)).defaultPrevented);
  assert.equal(clicks, 0);

  await focus(b);
  await rerender(ui(undefined));
  assert.equal(btn("Publish"), b, "the button keeps its place when the reason goes");
  assert.equal(document.activeElement, b);
  assert.equal(b.hasAttribute("aria-disabled"), false);
  assert.equal(b.getAttribute("aria-describedby"), "own");
  await click(b);
  assert.equal(clicks, 1);
});

test("Button: reasonAs=tooltip describes by the tooltip, and a tap shows it instead of clicking", async () => {
  let clicks = 0;
  await render(h(Button, { disabledReason: "Read-only", reasonAs: "tooltip", onClick: () => clicks++ }, "Edit"));
  const b = btn("Edit");
  const tip = $("[role=tooltip]");
  assert.equal($(".ld-btn-reason"), null);
  assert.equal(tip.textContent, "Read-only");
  assert.deepEqual(ids(b, "aria-describedby"), [tip.id]);
  assert.equal(b.getAttribute("aria-disabled"), "true");
  const shown = spy(tip, "showPopover");
  assert.ok((await click(b)).defaultPrevented);
  assert.equal(clicks, 0);
  await wait(); // show() reveals on the next task, like a zero rest delay
  assert.equal(shown.length, 1);
});

// ── HoldButton ──────────────────────────────────────────────────────────────

/** Drive HoldButton's clock by hand: performance.now and rAF frames (setTimeout via mock timers). */
function holdClock(t) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let now = 0;
  const frames = new Map();
  let next = 0;
  t.mock.method(performance, "now", () => now);
  t.mock.method(globalThis, "requestAnimationFrame", (cb) => (frames.set(++next, cb), next));
  t.mock.method(globalThis, "cancelAnimationFrame", (id) => frames.delete(id));
  return {
    frames,
    advance: (ms) => act(async () => {
      now += ms;
      const due = [...frames.values()];
      frames.clear();
      due.forEach((cb) => cb(now));
    }),
  };
}
const hold = () => $(".ld-btn--hold");
const meter = () => $(".ld-btn__meter").textContent;
const said = () => $(".ld-btn--hold [aria-live]").textContent;

test("HoldButton: a pointer hold fills over the default 300 ms and fires once; letting go early cancels", async (t) => {
  const clock = holdClock(t);
  let fired = 0;
  await render(h(HoldButton, { onConfirm: () => fired++, hint: "Hold to delete" }, "Delete"));
  const b = hold();
  assert.equal(b.type, "button");
  assert.equal($(`#${CSS.escape(b.getAttribute("aria-describedby"))}`).textContent, "Hold to delete");
  assert.equal($(".ld-btn__ring").getAttribute("aria-hidden"), "true");

  await pointer(b, "pointerdown", { pointerId: 1, isPrimary: true, button: 0 });
  assert.equal(b.dataset.ldHold, "holding");
  await clock.advance(150);
  assert.equal(meter(), "50%");
  assert.equal(b.style.getPropertyValue("--ld-hold"), "0.5");
  await pointer(b, "pointerup", { pointerId: 1, isPrimary: true });
  assert.equal(b.dataset.ldHold, undefined);
  assert.equal(meter(), "0%");
  assert.equal(clock.frames.size, 0, "no frame left running");
  await clock.advance(300);
  assert.equal(fired, 0);

  await pointer(b, "pointerdown", { pointerId: 2, isPrimary: true, button: 0 });
  await clock.advance(299);
  assert.equal(fired, 0);
  await clock.advance(1);
  assert.equal(fired, 1);
  assert.equal(b.dataset.ldHold, "fired");
  assert.equal(said(), "Confirmed");
  await pointer(b, "pointerdown", { pointerId: 3, isPrimary: true, button: 0 });
  assert.equal(b.dataset.ldHold, "fired", "no new hold while it shows fired");
  await tick(t, 600);
  assert.equal(b.dataset.ldHold, undefined);
  assert.equal(said(), "");
  assert.equal(fired, 1);

  await pointer(b, "pointerdown", { pointerId: 4, isPrimary: true, button: 2 });
  assert.equal(b.dataset.ldHold, undefined, "a right press never holds");
});

test("HoldButton: keyboard holds Space/Enter (no native click), Escape, key-up and blur cancel", async (t) => {
  const clock = holdClock(t);
  let fired = 0;
  await render(h(HoldButton, { duration: 1000, onConfirm: () => fired++ }, "Wipe"));
  const b = hold();
  await focus(b);
  assert.ok((await keyDown(b, " ")).defaultPrevented);
  assert.equal(b.dataset.ldHold, "holding");
  await keyDown(b, " ", { repeat: true });
  await clock.advance(500);
  assert.ok((await fire(b, "keyup", { key: " " }, window.KeyboardEvent)).defaultPrevented);
  assert.equal(b.dataset.ldHold, undefined);

  await keyDown(b, "Enter");
  await keyDown(b, "Escape");
  assert.equal(b.dataset.ldHold, undefined);
  await keyDown(b, "Enter");
  await act(async () => b.blur());
  assert.equal(b.dataset.ldHold, undefined);

  await keyDown(b, "Enter");
  await clock.advance(1000);
  assert.equal(fired, 1);
});

test("HoldButton: confirmOnKeyboardTap fires at once; disabled never holds; unmount drops frames and timers", async (t) => {
  const clock = holdClock(t);
  let fired = 0;
  const ui = (props) => h(HoldButton, { duration: 400, onConfirm: () => fired++, ...props }, "Go");
  const { rerender, unmount } = await render(ui({ confirmOnKeyboardTap: true }));
  await keyDown(hold(), "Enter");
  assert.equal(fired, 1);
  await tick(t, 600);

  await rerender(ui({ disabled: true }));
  await keyDown(hold(), " ");
  assert.equal(hold().dataset.ldHold, undefined);

  await rerender(ui({}));
  await pointer(hold(), "pointerdown", { pointerId: 1, isPrimary: true, button: 0 });
  assert.equal(clock.frames.size, 1);
  await unmount();
  assert.equal(clock.frames.size, 0, "the pending frame is cancelled");
  await clock.advance(1000);
  await tick(t, 1000);
  assert.equal(fired, 1);
});

// ── form.tsx ────────────────────────────────────────────────────────────────

test("Field: ties label, hint and message to the control; error wins over success", async () => {
  const ui = (props) => h(Field, { label: "Email", hint: "Work address", ...props }, h(Input, { type: "email", "aria-describedby": "extra" }));
  const { rerender } = await render(ui({}));
  const input = $("input.ld-input");
  const id = input.id;
  assert.ok(id, "a control without an id gets one");
  assert.equal($("label.ld-label").htmlFor, id);
  assert.equal($("label.ld-label").id, `${id}-label`);
  assert.equal($(`#${CSS.escape(id)}-hint`).textContent, "Work address");
  assert.deepEqual(ids(input, "aria-describedby"), [`${id}-hint`, "extra"]);
  const message = $(".ld-field__message");
  assert.equal(message.getAttribute("aria-live"), "polite");
  assert.equal(message.textContent, "", "the live region is there before the error");
  assert.equal(input.hasAttribute("aria-invalid"), false);

  await rerender(ui({ error: "Enter a valid email", success: "Looks good" }));
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(input.getAttribute("aria-errormessage"), message.id);
  assert.deepEqual(ids(input, "aria-describedby"), [`${id}-hint`, message.id, "extra"]);
  assert.equal(message.textContent, "Enter a valid email");
  assert.ok(message.classList.contains("ld-field__message--error"));
  assert.equal($(".ld-field--success"), null);

  await rerender(ui({ success: "Looks good" }));
  assert.equal(input.hasAttribute("aria-invalid"), false);
  assert.equal(input.hasAttribute("aria-errormessage"), false);
  assert.ok($(".ld-field").classList.contains("ld-field--success"));
  assert.equal(message.textContent, "Looks good");
});

test("Field: the child's own id wins over htmlFor; controls merge their class names", async () => {
  await render(h("div", null,
    h(Field, { label: "Notes", htmlFor: "ignored" }, h(Textarea, { id: "notes", className: "x" })),
    h(Field, { label: "Size", htmlFor: "size" }, h(Select, null, h("option", null, "S"))),
    h(Label, { className: "y" }, "Free label")));
  assert.equal($$("label")[0].htmlFor, "notes");
  assert.equal($("textarea").className, "ld-textarea x");
  assert.equal($("select").id, "size");
  assert.equal($("select").className, "ld-select");
  assert.equal($$("label")[2].className, "ld-label y");
});

test("Checkbox, Radio and Switch: native inputs, wrapped in a label when given one; Switch has role=switch", async () => {
  await render(h("div", null,
    h(Checkbox, { label: "Remember me", defaultChecked: true }),
    h(Radio, { name: "r", "aria-label": "One" }),
    h(Switch, { label: "Wi-Fi" })));
  const [box, radio, sw] = $$("input");
  assert.deepEqual([box.type, box.className, box.checked], ["checkbox", "ld-checkbox", true]);
  assert.equal(box.parentElement.className, "ld-choice");
  assert.equal(box.parentElement.textContent, "Remember me");
  assert.deepEqual([radio.type, radio.className, radio.parentElement.tagName], ["radio", "ld-radio", "DIV"]);
  assert.deepEqual([sw.type, sw.getAttribute("role"), sw.className], ["checkbox", "switch", "ld-switch"]);
  await click(sw.parentElement);
  assert.equal(sw.checked, true, "the label toggles it; role=switch exposes checked as its state");
});
