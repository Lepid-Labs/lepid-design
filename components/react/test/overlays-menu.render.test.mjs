// Menu and ContextMenu rendered with react-dom in happy-dom: roles, roving focus, typeahead and closing paths.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h } from "react";
import { render, click, keyDown, pointer, spy, tick, toggle, focus, act, $, $$, window } from "./dom.mjs";
import {
  Menu, MenuItem, MenuCheckboxItem, MenuRadioItem, MenuGroup, MenuSeparator, ContextMenu, LONG_PRESS_MS,
} from "../dist/index.js";

const active = () => document.activeElement;
/** keydown on whatever has focus. */
const press = (key, init, el = active()) => keyDown(el, key, init);

function renderMenu(log) {
  return render(h(Menu, { trigger: h("button", null, "Edit") },
    h(MenuItem, { onSelect: () => log.push("copy"), shortcut: "⌘C" }, "Copy"),
    h(MenuItem, { onSelect: () => log.push("cut") }, "Cut"),
    h(MenuItem, { disabled: true, onSelect: () => log.push("paste") }, "Paste"),
    h(MenuSeparator),
    h(MenuGroup, { label: "View" },
      h(MenuCheckboxItem, { checked: true, onCheckedChange: (v) => log.push(`wrap:${v}`) }, "Wrap"),
      h(MenuRadioItem, { checked: true }, "Small"),
      h(MenuRadioItem, { checked: false }, "Large"))));
}
const label = () => active().textContent.replace("⌘C", "");

test("Menu: trigger and menu are wired, items carry their roles and states", async () => {
  await renderMenu([]);
  const [button, menu] = [$("button"), $("[role=menu]")];
  assert.equal(button.getAttribute("aria-haspopup"), "menu");
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(button.getAttribute("aria-controls"), menu.id);
  assert.equal(button.getAttribute("popovertarget"), menu.id);
  assert.equal(menu.getAttribute("popover"), "auto");
  assert.equal(menu.getAttribute("aria-labelledby"), button.id);
  assert.deepEqual($$("[role^=menuitem]").map((i) => [i.getAttribute("role"), i.getAttribute("aria-checked"), i.tabIndex]), [
    ["menuitem", null, -1], ["menuitem", null, -1], ["menuitem", null, -1],
    ["menuitemcheckbox", "true", -1], ["menuitemradio", "true", -1], ["menuitemradio", "false", -1],
  ]);
  assert.equal($$("[role^=menuitem]")[2].getAttribute("aria-disabled"), "true");
  assert.ok($("[role=separator]"));
  assert.equal($("[role=group]").getAttribute("aria-labelledby"), $(".ld-menu__group-label").id);
  assert.equal($("kbd.ld-menu__shortcut").textContent, "⌘C");
  await toggle(menu, "open");
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(label(), "Copy", "opening focuses the first item");
  await toggle(menu, "closed");
  assert.equal(button.getAttribute("aria-expanded"), "false");
});

test("Menu: arrows wrap, Home/End jump, typeahead finds by first letters", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1_000 });
  await renderMenu([]);
  await toggle($("[role=menu]"), "open");
  const path = [];
  for (const key of ["ArrowDown", "End", "ArrowDown", "ArrowUp", "Home", "ArrowUp"]) {
    assert.equal((await press(key)).defaultPrevented, true);
    path.push(label());
  }
  assert.deepEqual(path, ["Cut", "Large", "Copy", "Large", "Copy", "Large"]);
  await press("c");
  assert.equal(label(), "Copy", "typeahead starts after the current item and wraps");
  t.mock.timers.tick(600);
  await press("s");
  assert.equal(label(), "Small");
});

test("Menu: Enter runs and returns focus, Space toggles in place, disabled does nothing", async () => {
  const log = [];
  await renderMenu(log);
  const button = $("button");
  await toggle($("[role=menu]"), "open");
  await press("Enter");
  assert.deepEqual(log, ["copy"]);
  assert.equal(active(), button);
  const items = $$("[role^=menuitem]");
  await focus(items[3]);
  await press(" ");
  assert.deepEqual(log, ["copy", "wrap:false"]);
  assert.equal(active(), items[3], "a checkbox item keeps the menu open");
  await focus(items[2]);
  await press("Enter");
  await click(items[2]);
  assert.deepEqual(log, ["copy", "wrap:false"], "disabled items stay reachable but inert");
  assert.equal(active(), items[2]);
});

test("Menu: Escape closes to the trigger without reaching the page; Tab returns focus too", async () => {
  await renderMenu([]);
  const [button, menu] = [$("button"), $("[role=menu]")];
  const hidden = spy(menu, "hidePopover");
  let reached = 0;
  const outer = (e) => e.key === "Escape" && reached++;
  document.addEventListener("keydown", outer);
  await toggle(menu, "open");
  await press("Escape");
  document.removeEventListener("keydown", outer);
  assert.equal(active(), button);
  assert.equal(reached, 0, "one Escape closes the menu, not the dialog it sits in");
  await focus($$("[role^=menuitem]")[1]);
  assert.equal((await press("Tab")).defaultPrevented, false, "Tab still moves on");
  assert.equal(active(), button);
  assert.equal(hidden.length, 0, "happy-dom never reports :popover-open, so the browser's hide is not observable");
});

test("Menu: ArrowUp on the trigger opens on the last item", async () => {
  await renderMenu([]);
  const menu = $("[role=menu]");
  const shown = spy(menu, "showPopover");
  await focus($("button"));
  assert.equal((await press("ArrowUp")).defaultPrevented, true);
  assert.equal(shown.length, 1);
  await toggle(menu, "open");
  assert.equal(label(), "Large");
});

test("ContextMenu: right-click, Shift+F10 and a long press open it; Escape goes back", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  await render(h(ContextMenu, { menu: [h(MenuItem, { key: "o" }, "Open"), h(MenuItem, { key: "d" }, "Delete")] },
    h("button", null, "report.pdf")));
  const [file, menu] = [$("button"), $("[role=menu]")];
  assert.equal(menu.getAttribute("aria-label"), "Actions");
  assert.ok($(".ld-context-target").contains(menu));
  const shown = spy(menu, "showPopover");
  const e = new window.MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 50 });
  await act(async () => void file.dispatchEvent(e));
  assert.equal(e.defaultPrevented, true);
  assert.equal(shown.length, 1);
  assert.deepEqual([menu.style.left, menu.style.top], ["40px", "50px"]);
  assert.equal(active().textContent, "Open");

  await focus(file);
  assert.equal((await press("F10", { shiftKey: true })).defaultPrevented, true);
  assert.equal(active().textContent, "Open");
  await press("Escape");
  assert.equal(active(), file, "focus returns to what had it");

  await pointer(file, "pointerdown", { pointerType: "touch", clientX: 5, clientY: 5 });
  await pointer(file, "pointermove", { pointerType: "touch", clientX: 30, clientY: 5 });
  await tick(t, LONG_PRESS_MS);
  assert.equal(shown.length, 2, "a moving touch is a scroll, not a long press");
  await pointer(file, "pointerdown", { pointerType: "touch", clientX: 5, clientY: 5 });
  await tick(t, LONG_PRESS_MS - 1);
  assert.equal(shown.length, 2);
  await tick(t, 1);
  assert.equal(shown.length, 3);
});
