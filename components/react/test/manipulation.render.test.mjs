// Direct-manipulation slice rendered in happy-dom: sliders, date, colour, upload, sortable, swipe.
import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createElement as h, useState } from "react";
import { $, $$, act, byText, click, fire, keyDown, render, toggle, type, wait, window } from "./dom.mjs";
import { ColorField, DateField, FileUpload, RangeSlider, Slider, SortableBoard, SortableList, SwipeRow } from "../dist/index.js";

/** Holds `value` in state, as an app would, and reports every onChange to `spy`. */
function Stateful({ C, init, spy, ...props }) {
  const [value, set] = useState(init);
  return h(C, { ...props, value, onChange: (v, ...rest) => (spy?.(v, ...rest), set(v)) });
}
const last = (fn) => fn.mock.calls.at(-1)?.arguments[0];
const file = (name, type, size = 3) => new window.File(["x".repeat(size)], name, { type });
/** A drag event carrying `dataTransfer`, which happy-dom's DragEvent init drops. */
const drag = (el, type, dataTransfer, init = {}) =>
  act(async () => void el.dispatchEvent(Object.assign(new window.Event(type, { bubbles: true, cancelable: true }), { dataTransfer, ...init })));

test("Slider: labelled range input, formatted valuetext, hint, and a number box that snaps", async () => {
  const spy = mock.fn();
  await render(h(Stateful, { C: Slider, init: 40, spy, label: "Volume", hint: "Quiet hours apply", input: true, marks: [{ value: 0, label: "0" }, { value: 100, label: "100" }], format: (v) => `${v}%` }));
  const range = $("input[type=range]");
  assert.equal($(`label[for="${range.id}"]`).textContent, "Volume");
  assert.equal(range.getAttribute("aria-valuetext"), "40%");
  assert.equal($(`#${range.getAttribute("aria-describedby")}`).textContent, "Quiet hours apply");
  assert.equal($(".ld-slider__marks").getAttribute("aria-hidden"), "true");
  await type(range, "70");
  assert.equal(last(spy), 70);
  assert.equal(range.getAttribute("aria-valuetext"), "70%");
  const box = $("input[type=number]");
  assert.equal(box.getAttribute("aria-labelledby"), `${range.id}-label`);
  await type(box, "250");
  await keyDown(box, "Enter");
  assert.equal(last(spy), 100, "Enter snaps an out-of-range number to max");
  assert.equal(range.value, "100");
});

test("RangeSlider: legend, named thumbs, and the thumbs never cross", async () => {
  const spy = mock.fn();
  await render(h(Stateful, { C: RangeSlider, init: [20, 60], spy, label: "Price", name: "price", gap: 10, hint: "In dollars" }));
  assert.equal($("fieldset legend").textContent, "Price");
  assert.equal($(`#${$("fieldset").getAttribute("aria-describedby")}`).textContent, "In dollars");
  const [lo, hi] = $$("input[type=range]");
  assert.deepEqual([lo.getAttribute("aria-label"), hi.getAttribute("aria-label")], ["Minimum", "Maximum"]);
  assert.deepEqual([lo.name, hi.name], ["price-min", "price-max"]);
  await type(lo, "90");
  assert.deepEqual(last(spy), [50, 60], "low thumb stops a gap below the high one");
  await type(hi, "5");
  assert.deepEqual(last(spy), [50, 60], "high thumb stops a gap above the low one");
  assert.equal(lo.getAttribute("data-ld-top"), null);
  await type(lo, "55");
  await type(hi, "100");
  await type(lo, "80");
  assert.deepEqual(last(spy), [80, 100]);
  assert.equal(lo.getAttribute("data-ld-top"), "true", "past the middle the low thumb takes the presses");
});

const TODAY = "2026-03-10"; // a Tuesday

test("DateField: preset chips pick a date, show pressed, and respect min", async () => {
  const spy = mock.fn();
  await render(h(Stateful, { C: DateField, init: "", spy, label: "Due", today: TODAY, min: "2026-03-11" }));
  const group = $("[role=group]");
  assert.equal($(`#${group.getAttribute("aria-labelledby")}`).textContent, "Due");
  const chip = (t) => byText(t, "button");
  assert.equal(chip("Today").disabled, true, "a preset before min is disabled");
  assert.equal(chip("Tomorrow").getAttribute("aria-pressed"), "false");
  await click(chip("Tomorrow"));
  assert.equal(last(spy), "2026-03-11");
  assert.equal(chip("Tomorrow").getAttribute("aria-pressed"), "true");
  await click(chip("Next week"));
  assert.equal(last(spy), "2026-03-16");
  assert.equal($("input[type=date]").value, "2026-03-16");
});

test("DateField: a date outside the range is an error tied to the input", async () => {
  await render(h(DateField, { label: "Due", value: "2026-03-01", onChange() {}, min: "2026-03-05", max: "2026-03-20", hint: "Weekdays", presets: [] }));
  const input = $("input[type=date]");
  assert.equal(input.getAttribute("aria-invalid"), "true");
  const msg = $(`#${input.getAttribute("aria-errormessage")}`);
  assert.match(msg.textContent, /or later\.$/);
  assert.equal(msg.getAttribute("aria-live"), "polite");
  assert.deepEqual(input.getAttribute("aria-describedby").split(" "), [`${input.id}-hint`, msg.id]);
  assert.equal($("[role=group]"), null, "presets: [] renders no chips");
});

test("DateField: a datetime-local preset keeps the time already chosen", async () => {
  const onChange = mock.fn();
  await render(h(DateField, { label: "Start", type: "datetime-local", value: "2026-03-10T14:30", onChange, today: TODAY }));
  await click(byText("Tomorrow", "button"));
  assert.equal(last(onChange), "2026-03-11T14:30");
});

test("DateField typed: digits become an ISO date; an impossible date is an error", async () => {
  const spy = mock.fn();
  await render(h(Stateful, { C: DateField, init: "", spy, label: "Birthday", typed: true, today: TODAY, presets: [] }));
  const input = $("input");
  assert.equal(input.placeholder, "MM/DD/YYYY");
  await type(input, "03152026");
  assert.equal(last(spy), "2026-03-15");
  assert.equal(input.value, "03/15/2026");
  await type(input, "02302026");
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.match($(`#${input.getAttribute("aria-errormessage")}`).textContent, /^Enter a real date, like 03\/15\/2026\.$/);
  assert.equal(last(spy), "2026-03-15", "an impossible date is not reported");
});

const SWATCHES = [{ value: "#36F", name: "Ocean" }, { value: "#000", name: "Ink" }];

test("ColorField: swatches are a radio group; the matching one is checked", async () => {
  const spy = mock.fn();
  await render(h(Stateful, { C: ColorField, init: "#3366ff", spy, label: "Label colour", swatches: SWATCHES, against: "#ffffff" }));
  const group = $("[role=radiogroup]");
  assert.equal($(`#${group.getAttribute("aria-labelledby")}`).textContent, "Label colour");
  const [ocean, ink] = $$("input[type=radio]", group);
  assert.equal(ocean.getAttribute("aria-label"), "Ocean");
  assert.equal(ocean.checked, true, "#36F matches #3366ff after normalising");
  await click(ink);
  assert.equal(last(spy), "#000000");
  assert.equal(ink.checked, true);
  assert.equal($("input[type=color]").value, "#000000");
  assert.equal($(".ld-color__contrast").getAttribute("data-ld-contrast"), "pass");
  assert.match($(".ld-color__contrast").textContent, /^21\.0:1 AAA against the surface$/);
});

test("ColorField: hex field normalises, commits on Enter, and flags bad input", async () => {
  const spy = mock.fn();
  await render(h(Stateful, { C: ColorField, init: "#000000", spy, label: "Colour", against: "#ffffff" }));
  const hex = $("input[aria-label='Hex code']");
  const msg = $(`#${hex.getAttribute("aria-describedby")}`);
  await type(hex, "#12AB34");
  assert.equal(last(spy), "#12ab34", "six digits apply at once");
  await type(hex, "abc");
  assert.equal(spy.mock.callCount(), 1, "three digits wait for Enter or blur");
  await keyDown(hex, "Enter");
  assert.equal(last(spy), "#aabbcc");
  assert.equal(hex.value, "#aabbcc");
  await type(hex, "zz");
  assert.equal(hex.getAttribute("aria-invalid"), "true");
  assert.match(msg.textContent, /^Use a hex code/);
  await keyDown(hex, "Enter");
  assert.equal(spy.mock.callCount(), 2, "an invalid draft is never committed");
  await type(hex, "#777777");
  assert.equal(hex.getAttribute("aria-invalid"), null);
  assert.equal($(".ld-color__contrast").getAttribute("data-ld-contrast"), "large");
  assert.match($(".ld-color__contrast").textContent, /^4\.4:1 Large text only/);
});

/** FileUpload with `upload` resolving or rejecting when the test says so. */
async function uploader(props = {}) {
  const pending = [];
  const upload = mock.fn((f, ctx) => new Promise((resolve, reject) => pending.push({ f, ctx, resolve, reject })));
  const onRemove = mock.fn();
  const onUploaded = mock.fn();
  const view = await render(h(FileUpload, { label: "Attach files", hint: "PDFs, up to 1 KB", accept: ".pdf", acceptLabel: "PDFs", maxSize: 1000, upload, onRemove, onUploaded, ...props }));
  const input = $("input[type=file]");
  const pick = async (...files) => {
    const dt = new window.DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    await fire(input, "change");
  };
  return { ...view, input, pick, pending, upload, onRemove, onUploaded, status: () => $("[role=status]").textContent };
}
const settle = async (fn) => (await act(async () => fn()), await wait());

test("FileUpload: a labelled file input; wrong type and oversize files are refused in words", async () => {
  const { input, pick, upload, status } = await uploader();
  assert.equal(input.closest("label.ld-dropzone").querySelector(".ld-dropzone__title").textContent, "Attach files");
  assert.equal($(`#${input.getAttribute("aria-describedby")}`).textContent, "PDFs, up to 1 KB");
  assert.deepEqual([input.accept, input.multiple], [".pdf", true]);
  await pick(file("notes.txt", "text/plain"), file("big.pdf", "application/pdf", 2000));
  assert.equal(upload.mock.callCount(), 0);
  const rows = $$(".ld-upload");
  assert.deepEqual(rows.map((r) => r.dataset.ldUpload), ["error", "error"]);
  assert.match(rows[0].querySelector(".ld-upload__status").textContent, /notes\.txt isn't a file type this accepts\. Use PDFs\./);
  assert.match(rows[1].querySelector(".ld-upload__status").textContent, /big\.pdf is 2 KB; the limit is 1 KB\./);
  assert.match(status(), /isn't a file type .* the limit is/);
  assert.equal($("button[aria-label^=Retry]"), null, "a refused file has nothing to retry");
  assert.ok($("button[aria-label='Remove notes.txt']"));
});

test("FileUpload: progress, success, then a failure that keeps the file for Retry", async () => {
  const { pick, pending, upload, onUploaded, status } = await uploader();
  await pick(file("a.pdf", "application/pdf"));
  assert.equal(status(), "Uploading a.pdf.");
  await act(async () => pending[0].ctx.onProgress(1, 2));
  const bar = $("[role=progressbar]");
  assert.equal(bar.getAttribute("aria-valuenow"), "50");
  assert.equal(bar.getAttribute("aria-label"), "Uploading a.pdf");
  assert.ok($("button[aria-label='Cancel a.pdf']"));
  await settle(() => pending[0].resolve("ok"));
  assert.equal($(".ld-upload").dataset.ldUpload, "done");
  assert.equal(status(), "a.pdf uploaded.");
  assert.equal(onUploaded.mock.calls[0].arguments[1], "ok");

  await pick(file("b.pdf", "application/pdf"));
  await settle(() => pending[1].reject(new Error("Server said no.")));
  assert.equal(status(), "b.pdf didn't upload: Server said no. Retry is available.");
  await click($("button[aria-label='Retry b.pdf']"));
  assert.equal(upload.mock.callCount(), 3);
  assert.equal(upload.mock.calls[2].arguments[0].name, "b.pdf");
  assert.equal($$(".ld-upload")[1].dataset.ldUpload, "uploading");
});

test("FileUpload: Cancel aborts the upload, removes the row and returns focus", async () => {
  const { pick, pending, onRemove, input, status } = await uploader();
  await pick(file("a.pdf", "application/pdf"));
  await click($("button[aria-label='Cancel a.pdf']"));
  assert.equal(pending[0].ctx.signal.aborted, true);
  assert.equal($(".ld-upload"), null);
  assert.equal(onRemove.mock.calls[0].arguments[0].name, "a.pdf");
  assert.equal(status(), "a.pdf removed.");
  assert.equal(document.activeElement, input);
  await settle(() => pending[0].reject(new Error("aborted")));
  assert.equal(status(), "a.pdf removed.", "an aborted upload's rejection is not announced");
});

test("FileUpload: drag state, drop, and unmount aborts what is in flight", async () => {
  const { pending, unmount } = await uploader({ accept: "image/*,application/pdf", acceptLabel: "images or PDFs" });
  const zone = $(".ld-dropzone");
  await drag(zone, "dragover", { types: ["Files"], items: [{ type: "text/plain" }] });
  assert.equal(zone.dataset.ldDrag, "invalid");
  assert.equal($(".ld-dropzone__prompt").textContent, "That file type isn't accepted");
  await drag(zone, "dragleave", {}, { relatedTarget: null });
  assert.equal(zone.dataset.ldDrag, undefined);
  const dt = new window.DataTransfer();
  dt.items.add(file("scan.pdf", "application/pdf"));
  await drag(zone, "drop", dt);
  assert.equal(pending.length, 1, "a drop goes through the same checks and upload");
  await unmount();
  assert.equal(pending[0].ctx.signal.aborted, true);
});

const ITEMS = ["A", "B", "C"];
const sortProps = { getKey: (x) => x, getLabel: (x) => `Task ${x}`, renderItem: (x) => h("span", null, x) };
const live = () => $("[aria-live=assertive]").textContent;
const handle = (label) => $(`button[aria-label='Move ${label}']`);
const order = () => $$("[data-ld-sort-key]").map((li) => li.dataset.ldSortKey);

function List({ spy }) {
  const [items, set] = useState(ITEMS);
  return h(SortableList, { ...sortProps, label: "Priorities", items, onReorder: (next, move) => (spy(next, move), set(next)) });
}

test("SortableList: handles are described; Space lifts, arrows move, Space drops, all announced", async () => {
  const spy = mock.fn();
  await render(h(List, { spy }));
  assert.equal($("ul").getAttribute("aria-label"), "Priorities");
  const help = $(`#${handle("Task A").getAttribute("aria-describedby")}`);
  assert.match(help.textContent, /Press Space or Enter to pick it up\. Arrow keys move it, Space/);
  await keyDown(handle("Task A"), " ");
  assert.equal(live(), "Picked up Task A, position 1 of 3. Arrow keys move it, Space drops it, Escape cancels.");
  assert.equal($(".ld-sortable-root").dataset.ldSorting, "keyboard");
  await keyDown(handle("Task A"), "ArrowDown");
  await wait(20);
  assert.deepEqual(order(), ["B", "A", "C"], "the preview moves the item");
  assert.equal(document.activeElement, handle("Task A"));
  assert.equal(live(), "Moved Task A to position 2 of 3.");
  await keyDown(handle("Task A"), " ");
  assert.equal(spy.mock.callCount(), 1);
  const [next, move] = spy.mock.calls[0].arguments;
  assert.deepEqual(next, ["B", "A", "C"]);
  assert.deepEqual([move.item, move.from, move.to], ["A", { list: 0, index: 0 }, { list: 0, index: 1 }]);
  assert.equal(live(), "Dropped Task A at position 2 of 3.");
  assert.equal($(".ld-sortable-root").dataset.ldSorting, undefined);
});

test("SortableList: Escape puts the item back and reports nothing", async () => {
  const spy = mock.fn();
  await render(h(List, { spy }));
  await keyDown(handle("Task B"), "Enter");
  await keyDown(handle("Task B"), "End");
  await wait(20);
  assert.deepEqual(order(), ["A", "C", "B"]);
  await keyDown(handle("Task B"), "Escape");
  await wait(20);
  assert.deepEqual(order(), ITEMS);
  assert.equal(spy.mock.callCount(), 0);
  assert.equal(live(), "Cancelled. Task B is back at position 2 of 3.");
  assert.equal(document.activeElement, handle("Task B"));
});

test("SortableBoard: columns are labelled; Right carries a card across; unmount detaches", async (t) => {
  const onMove = mock.fn();
  const columns = [{ id: "todo", title: "To do", items: ["A", "B"] }, { id: "done", title: "Done", items: ["C"] }];
  const { container, unmount } = await render(h(SortableBoard, { ...sortProps, columns, onMove }));
  const sections = $$("section");
  assert.deepEqual(sections.map((s) => $(`#${CSS.escape(s.getAttribute("aria-labelledby"))}`).textContent), ["To do 2", "Done 1"]);
  assert.match($("p[hidden]").textContent, /within and between columns/);
  await keyDown(handle("Task A"), " ");
  await keyDown(handle("Task A"), "ArrowRight");
  await wait(20);
  assert.equal(live(), "Moved Task A to position 1 of 2 in Done.");
  await keyDown(handle("Task A"), " ");
  const [cols, move] = onMove.mock.calls[0].arguments;
  assert.deepEqual(cols.map((c) => c.items), [["B"], ["A", "C"]]);
  assert.deepEqual(move.to, { list: 1, index: 0 });
  assert.equal(cols[0] !== columns[0] && cols[1] !== columns[1], true);

  const root = container.firstChild;
  t.mock.method(root, "removeEventListener");
  await unmount();
  const removed = root.removeEventListener.mock.calls.map((c) => c.arguments[0]);
  assert.deepEqual(removed.sort(), ["keydown", "pointercancel", "pointerdown", "pointermove", "pointerup"]);
});

test("SwipeRow: every swipe action is also in a keyboard-reachable menu; unmount detaches", async (t) => {
  const archive = mock.fn();
  const remove = mock.fn();
  const { unmount } = await render(
    h(SwipeRow, { menuLabel: "Actions for Ana", leading: [{ label: "Archive", onAction: archive }], trailing: [{ label: "Delete", onAction: remove, variant: "danger" }], fullSwipe: ["trailing"] }, "Ana: lunch?"),
  );
  for (const side of $$(".ld-swipe__actions")) assert.equal(side.getAttribute("aria-hidden"), "true");
  assert.deepEqual($$(".ld-swipe__action").map((b) => b.tabIndex), [-1, -1], "revealed buttons stay out of the tab order");
  const trigger = $("button[aria-haspopup=menu]");
  assert.equal(trigger.getAttribute("aria-label"), "Actions for Ana");
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  const menu = $(`#${CSS.escape(trigger.getAttribute("aria-controls"))}`);
  assert.equal(menu.getAttribute("role"), "menu");
  assert.deepEqual($$("[role=menuitem]", menu).map((i) => i.textContent), ["Archive", "Delete"]);
  assert.ok($("[role=menuitem].ld-menu__item--danger", menu));

  await keyDown(trigger, "ArrowDown");
  await toggle(menu, "open");
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  assert.equal(document.activeElement.textContent, "Archive");
  await keyDown(document.activeElement, "ArrowDown");
  await keyDown(document.activeElement, "Enter");
  assert.equal(remove.mock.callCount(), 1);
  assert.equal(document.activeElement, trigger, "choosing an item returns focus to the button");

  await click(byText("Archive", ".ld-swipe__action"));
  assert.equal(archive.mock.callCount(), 1, "the revealed button runs its action too");

  t.mock.method(document, "removeEventListener");
  await unmount();
  const removed = document.removeEventListener.mock.calls.map((c) => c.arguments[0]);
  assert.ok(removed.includes("ld-swipe-open") && removed.includes("pointerdown"), "document listeners are removed");
});
