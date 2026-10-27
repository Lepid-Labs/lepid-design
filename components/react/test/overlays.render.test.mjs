// Overlays slice (Menu and ContextMenu: overlays-menu) rendered with react-dom in happy-dom.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, useState } from "react";
import { render, click, keyDown, pointer, spy, tick, type, toggle, focus, act, $, $$ } from "./dom.mjs";
import { Tooltip, IconButton, Dialog, Sheet, CommandPalette, SearchInput, TOOLTIP_DELAY_MS } from "../dist/index.js";

const active = () => document.activeElement;
/** keydown on whatever has focus. */
const press = (key, init, el = active()) => keyDown(el, key, init);

test("Tooltip: describes its trigger, shows after the rest delay, never on touch", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10_000 });
  await render(h("div", null, h("p", { id: "hint" }, "Ctrl+S"),
    h(Tooltip, { content: "Saves a copy" }, h("button", { "aria-describedby": "hint" }, "Save"))));
  const tip = $("[role=tooltip]");
  assert.equal(tip.getAttribute("popover"), "manual");
  assert.equal(tip.textContent, "Saves a copy");
  assert.equal($("button").getAttribute("aria-describedby"), `hint ${tip.id}`);
  const shown = spy(tip, "showPopover");
  await pointer($("button"), "pointerover", { pointerType: "mouse" });
  await tick(t, TOOLTIP_DELAY_MS - 1);
  assert.equal(shown.length, 0, "not before the rest delay");
  await tick(t, 1);
  assert.equal(shown.length, 1);
  await pointer($("button"), "pointerout", { pointerType: "mouse" });
  await pointer($("button"), "pointerover", { pointerType: "touch" });
  await tick(t, TOOLTIP_DELAY_MS);
  assert.equal(shown.length, 1, "touch has no hover");
  await focus($("button")); // keyboard focus (:focus-visible) shows it too
  await tick(t, TOOLTIP_DELAY_MS);
  assert.equal(shown.length, 2);
});

test("Tooltip: Escape is claimed only while open, and the listener goes on unmount", async () => {
  const { unmount } = await render(h(Tooltip, { content: "Name", kind: "label" }, h("button", null, "✎")));
  const tip = $("[role=tooltip]");
  assert.equal($("button").getAttribute("aria-labelledby"), tip.id);
  assert.equal((await press("Escape", {}, document.body)).defaultPrevented, false);
  await toggle(tip, "open");
  assert.equal((await press("Escape", {}, document.body)).defaultPrevented, true, "does not reach a dialog around it");
  await unmount();
  assert.equal((await press("Escape", {}, document.body)).defaultPrevented, false);
});

test("IconButton: named by label, or by its tooltip; a link marks the current page", async () => {
  const { rerender } = await render(h(IconButton, { label: "Delete", variant: "danger" }, h("svg")));
  let b = $("button");
  assert.deepEqual([b.type, b.getAttribute("aria-label"), b.title], ["button", "Delete", "Delete"]);
  assert.equal(b.className, "ld-icon-btn ld-icon-btn--danger");
  await rerender(h(IconButton, { label: "Delete", tooltip: true }, h("svg")));
  b = $("button");
  assert.equal(b.getAttribute("aria-labelledby"), $("[role=tooltip]").id);
  assert.equal($("[role=tooltip]").textContent, "Delete");
  assert.equal(b.hasAttribute("aria-label") || b.hasAttribute("title"), false, "named once, not twice");
  await rerender(h(IconButton, { as: "a", href: "/home", label: "Home", active: true }));
  assert.equal($("a").getAttribute("aria-current"), "page");
  assert.equal($("a").hasAttribute("type"), false);
});

test("Dialog: open drives showModal/close, the close event reaches onClose", async () => {
  const closed = [];
  const props = { title: "Rename", actions: h("button", null, "OK"), onClose: () => closed.push(1) };
  const { rerender } = await render(h(Dialog, { ...props, open: false }, "Body"));
  const dialog = $("dialog");
  assert.equal(dialog.open, false);
  await rerender(h(Dialog, { ...props, open: true }, "Body"));
  assert.equal(dialog.open, true);
  assert.equal($("h2.ld-dialog__title").textContent, "Rename");
  assert.equal($(".ld-dialog__actions button").textContent, "OK");
  await rerender(h(Dialog, { ...props, open: false }, "Body"));
  assert.equal(dialog.open, false);
  assert.equal(closed.length, 1);
});

test("Sheet: bottom sheet with a handle closes on a downward drag and a backdrop click", async () => {
  const closed = [];
  const { rerender } = await render(h(Sheet, { open: true, title: "Filters", onClose: () => closed.push(1) }, h("p", null, "Body")));
  const [dialog, handle] = [$("dialog"), $(".ld-dialog__handle")];
  assert.equal(dialog.className, "ld-dialog ld-dialog--sheet");
  assert.equal(handle.getAttribute("aria-hidden"), "true");
  await pointer(handle, "pointerdown", { pointerId: 1, clientY: 0 });
  await pointer(handle, "pointermove", { pointerId: 1, clientY: -40 });
  assert.equal(dialog.style.translate, "0 0px", "it does not lift past its rest position");
  await pointer(handle, "pointermove", { pointerId: 1, clientY: 120 });
  assert.equal(dialog.style.translate, "0 120px");
  await pointer(handle, "pointerup", { pointerId: 1, clientY: 120 });
  assert.equal(dialog.style.translate, "", "released: the theme animates it from there");
  assert.equal(dialog.open, false);
  assert.equal(closed.length, 1);

  await rerender(h(Sheet, { open: false, onClose: () => closed.push(1) }, h("p", null, "Body")));
  await rerender(h(Sheet, { open: true, onClose: () => closed.push(1) }, h("p", null, "Body")));
  await click($("dialog p"), { clientX: 500, clientY: 500 });
  assert.equal(dialog.open, true, "a click inside the content is not a backdrop click");
  await click(dialog, { clientX: 500, clientY: 500 }); // happy-dom lays out nothing, so the box is 0×0
  assert.equal(dialog.open, false);
  await rerender(h(Sheet, { open: false, side: "end" }, "Nav"));
  assert.equal(dialog.className, "ld-dialog ld-dialog--drawer ld-dialog--drawer-end");
  assert.equal($(".ld-dialog__handle"), null);
});

const COMMANDS = [
  { id: "new", label: "New file", group: "File", shortcut: "⌘N" },
  { id: "open", label: "Open file", group: "File" },
  { id: "theme", label: "Toggle theme", group: "View", disabled: true },
  { id: "settings", label: "Settings", group: "View" },
];

test("CommandPalette: combobox, listbox and active option are wired; arrows move it", async () => {
  await render(h(CommandPalette, { open: true, onOpenChange() {}, commands: COMMANDS }));
  const input = $("[role=combobox]");
  const list = $("[role=listbox]");
  const options = $$("[role=option]");
  assert.equal($("dialog").getAttribute("aria-label"), "Command palette");
  assert.equal(input.getAttribute("aria-controls"), list.id);
  assert.equal(input.getAttribute("aria-expanded"), "true");
  assert.equal(input.getAttribute("aria-autocomplete"), "list");
  assert.deepEqual($$("[role=group]").map((g) => $(`#${CSS.escape(g.getAttribute("aria-labelledby"))}`).textContent), ["File", "View"]);
  assert.equal(options[2].getAttribute("aria-disabled"), "true");
  const at = () => [input.getAttribute("aria-activedescendant"), $$("[aria-selected=true]").map((o) => o.id)];
  assert.deepEqual(at(), [options[0].id, [options[0].id]]);
  await keyDown(input, "ArrowDown");
  assert.deepEqual(at(), [options[1].id, [options[1].id]]);
  await keyDown(input, "ArrowUp");
  await keyDown(input, "ArrowUp");
  assert.deepEqual(at(), [options[3].id, [options[3].id]], "wraps to the last");
});

test("CommandPalette: typing filters and announces, Enter runs, a disabled command does not", async () => {
  const log = [];
  const commands = COMMANDS.map((c) => ({ ...c, onSelect: () => log.push(c.id) }));
  await render(h(CommandPalette, { open: true, commands, onOpenChange: (o) => log.push(`open:${o}`), onSelect: (c) => log.push(`after:${c.id}`) }));
  const input = $("[role=combobox]");
  await keyDown(input, "ArrowDown");
  await keyDown(input, "ArrowDown");
  await keyDown(input, "Enter");
  assert.deepEqual(log, [], "Toggle theme is disabled");
  await type(input, "sett");
  assert.deepEqual($$("[role=option]").map((o) => o.textContent), ["Settings"]);
  assert.equal(input.getAttribute("aria-activedescendant"), $("[role=option]").id, "the first result is active again");
  assert.equal($("mark.ld-match").textContent, "Sett");
  assert.equal($("div[role=status]").textContent, "1 result");
  await keyDown(input, "Enter");
  assert.deepEqual(log, ["open:false", "settings", "after:settings"]);
  await type(input, "zzz");
  assert.equal($("[role=listbox]").hidden, true);
  assert.equal(input.getAttribute("aria-expanded"), "false");
  assert.equal(input.hasAttribute("aria-activedescendant"), false);
  assert.match($(".ld-empty").textContent, /No results for “zzz”/);
  await act(async () => $("dialog").close()); // what Escape or a backdrop click ends in
  assert.deepEqual(log.slice(3), ["open:false"]);
  assert.equal(input.value, "", "the next open starts from an empty query");
});

test("CommandPalette: Ctrl+K toggles from anywhere until unmount", async () => {
  const calls = [];
  const { unmount } = await render(h(CommandPalette, { open: false, commands: COMMANDS, onOpenChange: (o) => calls.push(o) }));
  assert.equal((await press("k", { ctrlKey: true }, document.body)).defaultPrevented, true);
  await press("k", { ctrlKey: true, shiftKey: true }, document.body);
  assert.deepEqual(calls, [true]);
  await unmount();
  await press("k", { ctrlKey: true }, document.body);
  assert.deepEqual(calls, [true], "the page listener is removed");
});

test("SearchInput: shortcut focuses it outside text fields, clear empties a controlled field", async () => {
  const log = [];
  function Search() {
    const [value, setValue] = useState("cats");
    return h("div", null, h("input", { "aria-label": "Other" }), h(SearchInput, {
      value, shortcut: "/", onChange: (e) => (setValue(e.target.value), log.push(e.target.value)), onClear: () => log.push("clear"),
    }));
  }
  const { unmount } = await render(h(Search));
  const input = $("input[type=search]");
  assert.equal(input.getAttribute("aria-keyshortcuts"), "/");
  assert.equal($("kbd.ld-search__hint").getAttribute("aria-hidden"), "true");
  assert.equal((await press("/", {}, document.body)).defaultPrevented, true);
  assert.equal(active(), input);
  await focus($("input[aria-label=Other]"));
  assert.equal((await press("/")).defaultPrevented, false, "typing a slash in another field stays there");
  assert.notEqual(active(), input);
  const clear = $("button[aria-label='Clear search']");
  assert.equal(clear.type, "button");
  await click(clear);
  assert.deepEqual(log, ["", "clear"]);
  assert.equal(input.value, "");
  assert.equal(active(), input);
  await unmount();
  assert.equal((await press("/", {}, document.body)).defaultPrevented, false, "the page listener is removed");
});

test("SearchInput: loading swaps the glyph for a spinner", async () => {
  await render(h(SearchInput, { loading: true, "aria-label": "Search docs" }));
  assert.ok($(".ld-search .ld-spinner[role=status]"));
  assert.equal($("svg.ld-search__icon"), null);
});
