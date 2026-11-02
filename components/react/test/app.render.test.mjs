// App kit rendered in happy-dom: confirm dialogs, DataState, ErrorBoundary, useSubmit and TagInput.
// Router and useLineStream are in app-io.render.test.mjs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, useState } from "react";
import { $, $$, act, byText, click, fire, focus, keyDown, render, type, wait, window } from "./dom.mjs";
import { ConfirmDialog, DataState, ErrorBoundary, TagInput, useConfirm, useSubmit } from "../dist/index.js";

test("ConfirmDialog: an alertdialog named by its title, described by its message, Cancel first", async () => {
  const log = [];
  const props = { title: "Delete nightly?", message: "Its runs go too.", confirmLabel: "Delete", danger: true,
    onConfirm: () => log.push("yes"), onCancel: () => log.push("no") };
  const { rerender } = await render(h(ConfirmDialog, { ...props, open: true }));
  const dialog = $("dialog");
  assert.equal(dialog.getAttribute("role"), "alertdialog");
  assert.equal($(`#${CSS.escape(dialog.getAttribute("aria-labelledby"))}`).textContent, "Delete nightly?");
  assert.equal($(`#${CSS.escape(dialog.getAttribute("aria-describedby"))}`).textContent, "Its runs go too.");
  const [cancel, confirm] = $$(".ld-dialog__actions button");
  assert.deepEqual([cancel.textContent, confirm.textContent], ["Cancel", "Delete"]);
  assert.match(confirm.className, /ld-btn--danger/);
  await click(cancel);
  await click(confirm);
  assert.deepEqual(log, ["no", "yes"]);
  await rerender(h(ConfirmDialog, { ...props, open: false }));
  await wait();
  assert.equal(dialog.open, false);
  assert.deepEqual(log, ["no", "yes"], "closing from the open prop is not a cancel");
});

test("ConfirmDialog: busy spins the confirm button and Escape cannot dismiss it", async () => {
  await render(h(ConfirmDialog, { open: true, title: "Delete?", busy: true, onConfirm() {}, onCancel() {} }));
  const [cancel, confirm] = $$(".ld-dialog__actions button");
  assert.equal(cancel.disabled, true);
  assert.equal(confirm.getAttribute("aria-busy"), "true");
  const esc = await fire($("dialog"), "cancel");
  assert.equal(esc.defaultPrevented, true);
});

function Asker({ answers }) {
  const [confirm, dialog] = useConfirm();
  const ask = (title) => confirm({ title, confirmLabel: "Yes" }).then((ok) => answers.push([title, ok]));
  return h("div", null, h("button", { onClick: () => (ask("First?"), ask("Second?")) }, "ask two"),
    h("button", { onClick: () => ask("Only?") }, "ask"), dialog);
}

test("useConfirm: resolves true or false once answered; a second ask answers the first with false", async () => {
  const answers = [];
  const { unmount } = await render(h(Asker, { answers }));
  await click(byText("ask", "button"));
  assert.equal($("dialog").open, true);
  assert.equal($(".ld-dialog__title").textContent, "Only?");
  await click(byText("Yes", "button"));
  await click(byText("ask two", "button"));
  assert.equal($(".ld-dialog__title").textContent, "Second?");
  await click(byText("Cancel", "button"));
  assert.deepEqual(answers, [["Only?", true], ["First?", false], ["Second?", false]]);
  await click(byText("ask", "button"));
  await unmount();
  await wait();
  assert.deepEqual(answers.at(-1), ["Only?", false], "unmounting answers false");
});

const list = (items) => h("ul", null, items.map((x) => h("li", { key: x }, x)));

test("DataState: nothing for a fast load, then error, empty, data, and a failed refetch over stale data", async () => {
  const empty = h("p", { className: "none" }, "No books yet");
  const view = (query) => h(DataState, { query, empty }, list);
  const { container: c, rerender } = await render(view({ data: undefined, error: null, isPending: true }));
  assert.equal(c.innerHTML, "", "no spinner before the loading delay");
  await rerender(view({ data: undefined, error: new Error("Server down"), isPending: false }));
  assert.equal($("[role=alert]", c).textContent, "Server down");
  await rerender(view({ data: [], error: null, isPending: false }));
  assert.equal(c.textContent, "No books yet");
  await rerender(view({ data: ["Dune"], error: null, isPending: false }));
  assert.equal($("li", c).textContent, "Dune");
  await rerender(view({ data: ["Dune"], error: { message: "Refresh failed" }, isPending: false }));
  assert.deepEqual([$("[role=alert]", c).textContent, $("li", c).textContent], ["Refresh failed", "Dune"]);
  await rerender(h(DataState, { query: { data: [], error: null, isPending: false } }, () => "the list itself"));
  assert.equal(c.textContent, "the list itself", "no `empty`, so an empty array goes to children");
});

test("DataState: the spinner (or `loading`) once the wait is long enough", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { container: c } = await render(h(DataState, { query: { data: undefined, error: null, isPending: true }, loading: "Loading books" }, list));
  await act(async () => t.mock.timers.tick(400));
  assert.equal(c.textContent, "Loading books");
});

function Bomb({ fuse }) {
  if (fuse.lit) throw new Error("Bad row");
  return "fine";
}

test("ErrorBoundary: catches, reports, shows the message with Try again, and resets", async (t) => {
  t.mock.method(console, "error", () => {}); // React logs caught render errors
  const fuse = { lit: true };
  const reported = [];
  const { container: c } = await render(h(ErrorBoundary, { onError: (e) => reported.push(e.message) }, h(Bomb, { fuse })));
  assert.match($("[role=alert]", c).textContent, /Something went wrong.*Bad row/);
  assert.deepEqual(reported, ["Bad row"]);
  fuse.lit = false;
  await click(byText("Try again", "button", c));
  assert.equal(c.textContent, "fine");
});

test("ErrorBoundary: a fallback function gets the error and reset", async (t) => {
  t.mock.method(console, "error", () => {});
  const fuse = { lit: true };
  const fallback = (e, reset) => h("button", { onClick: () => ((fuse.lit = false), reset()) }, `retry ${e.message}`);
  const { container: c } = await render(h(ErrorBoundary, { fallback }, h(Bomb, { fuse })));
  await click(byText("retry Bad row", "button", c));
  assert.equal(c.textContent, "fine");
});

function SaveForm({ action }) {
  const { onSubmit, busy, error } = useSubmit(action);
  return h("form", { onSubmit }, h("button", { "aria-busy": busy }, "Save"), error && h("p", { className: "err" }, error));
}

test("useSubmit: prevents the page load, busy while running, one run at a time, error caught", async () => {
  let release;
  let runs = 0;
  const action = () => (runs++, new Promise((ok, fail) => (release = { ok, fail })));
  const { container: c } = await render(h(SaveForm, { action }));
  const submit = await fire($("form", c), "submit");
  assert.equal(submit.defaultPrevented, true);
  await fire($("form", c), "submit");
  assert.equal(runs, 1, "a second submit while running is ignored");
  assert.equal($("button", c).getAttribute("aria-busy"), "true");
  await act(async () => release.fail(new Error("Name taken")));
  assert.equal($(".err", c).textContent, "Name taken");
  assert.equal($("button", c).getAttribute("aria-busy"), "false");
  await fire($("form", c), "submit");
  assert.equal($(".err", c), null, "the next submit clears the error");
  await act(async () => release.ok());
  assert.equal(runs, 2);
});

function Tags({ initial = [], log }) {
  const [tags, setTags] = useState(initial);
  return h(TagInput, { value: tags, onChange: (next) => (log?.push(next), setTags(next)), "aria-label": "Topics", groupLabel: "Topics" });
}
const chips = () => $$(".ld-chip__label").map((el) => el.textContent);

test("TagInput: commas, Enter and blur make tags; duplicates dropped; Backspace removes the last", async () => {
  await render(h(Tags, { initial: ["Rust"] }));
  const input = $("input");
  assert.equal($("[role=group]").getAttribute("aria-label"), "Topics");
  await type(input, "go, zig, ru");
  assert.deepEqual(chips(), ["Rust", "go", "zig"]);
  assert.equal(input.value, "ru", "the text after the last comma stays, without its space");
  await type(input, "");
  await type(input, "rust");
  const enter = await keyDown(input, "Enter");
  assert.equal(enter.defaultPrevented, true, "Enter adds the tag instead of submitting");
  assert.deepEqual(chips(), ["Rust", "go", "zig"], "rust is a duplicate of Rust");
  assert.equal((await keyDown(input, "Enter")).defaultPrevented, false, "an empty Enter still submits");
  await type(input, "c");
  await fire(input, "focusout", {}, window.FocusEvent); // React's onBlur
  assert.deepEqual(chips(), ["Rust", "go", "zig", "c"]);
  await keyDown(input, "Backspace");
  assert.deepEqual(chips(), ["Rust", "go", "zig"]);
});

test("TagInput: each tag's remove button; removing the last tag returns focus to the text box", async () => {
  await render(h(Tags, { initial: ["a", "b"] }));
  await click($("[aria-label='Remove a']"));
  assert.deepEqual(chips(), ["b"]);
  await focus($("[aria-label='Remove b']"));
  await click($("[aria-label='Remove b']"));
  assert.deepEqual(chips(), []);
  assert.equal(document.activeElement, $("input"));
});
