// Foundation and the pre-slice components rendered with react-dom in happy-dom (shell and
// page layout: foundation-shell). Runs the built dist.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, useState } from "react";
import { render, click, keyDown, fire, tick, act, $, $$, window } from "./dom.mjs";
import {
  Button, ButtonGroup, Card, CodeBlock, COPIED_MS, LogBlock, NavLink, Stepper, Tabs,
  StatusCard, StatusCardRows, StatusCardRow, StatusCardFooter, StatusCardEmpty,
} from "../dist/index.js";

const flush = () => act(async () => {});

test("Card: interactive modifier, own props, nested link and button kept", async () => {
  await render(h("div", null,
    h(Card, { className: "x", "data-id": "1" }, "Plain"),
    h(Card, { interactive: true, "aria-labelledby": "t" },
      h("a", { id: "t", className: "ld-card__link", href: "#a" }, "Open"), h("button", null, "Star"))));
  const [plain, card] = $$(".ld-card");
  assert.equal(plain.tagName, "DIV");
  assert.equal(plain.className, "ld-card x");
  assert.equal(plain.dataset.id, "1");
  assert.equal(card.className, "ld-card ld-card--interactive");
  assert.equal(card.getAttribute("aria-labelledby"), "t");
  assert.ok($(".ld-card__link", card) && $("button", card), "the primary link and nested controls render");
});

test("ButtonGroup: a named group, block modifier, and the slide direction follows aria-pressed", async () => {
  const group = (pressed) => h(ButtonGroup, { "aria-label": "View", block: true },
    ["Day", "Week", "Month"].map((v, i) => h(Button, { key: v, "aria-pressed": i === pressed }, v)));
  const { rerender } = await render(group(0));
  const el = $("[role=group]");
  assert.equal(el.getAttribute("aria-label"), "View");
  assert.equal(el.className, "ld-btn-group ld-btn-group--block");
  assert.equal(el.dataset.ldDir, undefined, "nothing moved yet");
  await rerender(group(2));
  assert.equal(el.dataset.ldDir, "forward");
  await rerender(group(1));
  assert.equal(el.dataset.ldDir, "back");
});

const TABS = ["One", "Two", "Three"].map((l) => ({ id: l.toLowerCase(), label: l, content: `${l} panel` }));

test("Tabs: roles, ids and a single tab stop", async () => {
  await render(h(Tabs, { items: TABS, defaultActive: "two" }));
  const tabs = $$("[role=tab]");
  const panel = $("[role=tabpanel]");
  assert.equal($("[role=tablist]").className, "ld-tabs");
  assert.deepEqual(tabs.map((t) => t.getAttribute("aria-selected")), ["false", "true", "false"]);
  assert.deepEqual(tabs.map((t) => t.tabIndex), [-1, 0, -1]);
  assert.ok(tabs.every((t) => t.getAttribute("aria-controls") === panel.id && t.id));
  assert.equal(new Set(tabs.map((t) => t.id)).size, 3);
  assert.equal(panel.getAttribute("aria-labelledby"), tabs[1].id);
  assert.equal(panel.textContent, "Two panel");
  assert.ok(tabs[1].classList.contains("ld-tab--active"));
});

test("Tabs: arrows wrap, Home/End jump, focus and selection move together", async () => {
  const seen = [];
  await render(h(Tabs, { items: TABS, onChange: (id) => seen.push(id) }));
  const tabs = $$("[role=tab]");
  const list = $("[role=tablist]");
  tabs[0].focus();
  assert.equal((await keyDown(tabs[0], "ArrowRight")).defaultPrevented, true);
  assert.equal(document.activeElement, tabs[1]);
  assert.equal(list.dataset.ldDir, "forward");
  await keyDown(document.activeElement, "ArrowLeft");
  await keyDown(document.activeElement, "ArrowLeft"); // wraps to the last
  assert.equal(document.activeElement, tabs[2]);
  assert.equal(list.dataset.ldDir, "forward", "One to Three moves forward");
  await keyDown(document.activeElement, "Home");
  assert.equal(list.dataset.ldDir, "back");
  await keyDown(document.activeElement, "End");
  assert.deepEqual(seen, ["two", "one", "three", "one", "three"]);
  assert.equal(tabs[2].getAttribute("aria-selected"), "true");
  assert.equal($("[role=tabpanel]").getAttribute("aria-labelledby"), tabs[2].id);
  assert.equal((await keyDown(tabs[2], "ArrowDown")).defaultPrevented, false, "a horizontal list ignores Up/Down");
  assert.equal((await keyDown(tabs[2], "a")).defaultPrevented, false);
  await click(tabs[1]);
  assert.equal($("[role=tabpanel]").textContent, "Two panel");
  assert.deepEqual(tabs.map((t) => t.tabIndex), [-1, 0, -1]);
});

test("Tabs: controlled by `active`, an unknown id leaves the first tab as the stop", async () => {
  function Controlled() {
    const [active, setActive] = useState("missing");
    return h(Tabs, { items: TABS, active, onChange: setActive });
  }
  await render(h(Controlled));
  const tabs = $$("[role=tab]");
  assert.deepEqual(tabs.map((t) => t.tabIndex), [0, -1, -1]);
  assert.equal($("[role=tabpanel]").textContent, "");
  await keyDown(tabs[0], "ArrowRight"); // from no selection, the first tab
  assert.equal(tabs[0].getAttribute("aria-selected"), "true");
  assert.equal(document.activeElement, tabs[0]);
});

test("NavLink: the ld-link anchor keeps its props", async () => {
  await render(h(NavLink, { href: "/docs", className: "x", "aria-current": "page" }, "Docs"));
  const a = $("a");
  assert.equal(a.className, "ld-link x");
  assert.equal(a.getAttribute("href"), "/docs");
  assert.equal(a.getAttribute("aria-current"), "page");
});

test("CodeBlock: copies the text, announces it, resets after COPIED_MS", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  await render(h(CodeBlock, { className: "lang-sh" }, "pnpm add x"));
  const btn = $("button.ld-pre-copy");
  const live = $(".ld-pre-copy-status");
  assert.equal($("pre").className, "ld-pre lang-sh");
  assert.equal(btn.getAttribute("aria-label"), "Copy code");
  assert.equal(live.getAttribute("aria-live"), "polite");
  assert.equal(live.textContent, "");
  await click(btn);
  await flush();
  assert.equal(await navigator.clipboard.readText(), "pnpm add x");
  assert.equal(btn.dataset.ldCopy, "copied");
  assert.equal(live.textContent, "Copied to clipboard");
  await tick(t, COPIED_MS - 1);
  assert.equal(btn.dataset.ldCopy, "copied");
  await tick(t, 1);
  assert.equal(btn.dataset.ldCopy, undefined);
  assert.equal(live.textContent, "");
});

test("CodeBlock: a refused write says so, and unmount clears the reset timer", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(navigator.clipboard, "writeText", async () => { throw new Error("denied"); });
  const set = t.mock.method(globalThis, "setTimeout");
  const cleared = t.mock.method(globalThis, "clearTimeout");
  const { unmount } = await render(h(CodeBlock, { copyLabel: "Copy command" }, "rm -rf dist"));
  const btn = $("button[aria-label='Copy command']");
  await click(btn);
  await flush();
  assert.equal(btn.dataset.ldCopy, "failed");
  assert.equal($(".ld-pre-copy-status").textContent, "Copy failed");
  const reset = set.mock.calls.find((c) => c.arguments[1] === COPIED_MS).result;
  await unmount();
  assert.ok(cleared.mock.calls.some((c) => c.arguments[0] === reset), "the reset timer is cleared on unmount");
});

test("LogBlock: a log region by default, quiet when live=false, height var and forwarded ref", async () => {
  const ref = { current: null };
  let scrolled = 0;
  await render(h("div", null,
    h(LogBlock, { ref, maxHeight: 200, onScroll: () => scrolled++, className: "x" }, "line 1\nline 2"),
    h(LogBlock, { live: false, maxHeight: "50vh", style: { color: "red" } }, "chatty")));
  const [log, quiet] = $$("pre");
  assert.equal(log.className, "ld-pre ld-pre--log x");
  assert.equal(log.getAttribute("role"), "log");
  assert.equal(log.style.getPropertyValue("--ld-log-max-height"), "200px");
  assert.equal(ref.current, log);
  assert.equal(quiet.getAttribute("role"), null);
  assert.equal(quiet.style.getPropertyValue("--ld-log-max-height"), "50vh");
  assert.equal(quiet.style.color, "red", "the caller's style merges with the height var");
  await fire(log, "scroll", { bubbles: false });
  assert.equal(scrolled, 1, "the caller's onScroll still runs");
});

test("StatusCard: tone, attention ring, linked title, meta and the change flash", async () => {
  const card = (changedAt) => h(StatusCard, {
    title: "api", prefix: "acme/", href: "/r/api", external: true, tone: "danger", attention: true,
    watermark: "🔒", meta: h("span", { className: "badge" }, "3"), note: "2m ago", changedAt,
  }, h(StatusCardEmpty, null, "No open issues"));
  const { rerender } = await render(card(undefined));
  const root = $(".ld-status-card");
  assert.equal(root.className, "ld-status-card ld-status-card--danger");
  assert.equal(root.dataset.ldAttention, "warning", "attention: true means warning");
  const title = $("a.ld-status-card__title");
  assert.equal(title.textContent, "acme/api");
  assert.equal(title.getAttribute("target"), "_blank");
  assert.equal(title.getAttribute("rel"), "noopener noreferrer");
  assert.equal($(".ld-status-card__watermark").getAttribute("aria-hidden"), "true");
  assert.equal($(".ld-status-card__note").textContent, "2m ago");
  assert.equal($("p.ld-status-card__empty").textContent, "No open issues");
  assert.equal(root.hasAttribute("data-ld-changed"), false);
  await rerender(card(1));
  assert.equal(root.hasAttribute("data-ld-changed"), true, "a new changedAt replays the flash");
});

test("StatusCard rows and footer: links when given href, plain blocks otherwise", async () => {
  await render(h(StatusCard, { title: "Queue", attention: "info" },
    h(StatusCardRows, null,
      h(StatusCardRow, { href: "/1", leading: "#1", trailing: "new", external: true }, "First"),
      h(StatusCardRow, { leading: "#2" }, "Second")),
    h(StatusCardFooter, { href: "/all" }, "4 more…"),
    h(StatusCardFooter, null, "Updated hourly")));
  assert.equal($("span.ld-status-card__title").textContent, "Queue");
  assert.equal($(".ld-status-card").dataset.ldAttention, "info");
  const rows = $$("ul.ld-status-card__rows > li");
  assert.equal(rows.length, 2);
  const link = $("a.ld-status-card__row", rows[0]);
  assert.equal(link.getAttribute("rel"), "noopener noreferrer");
  assert.deepEqual([...link.children].map((c) => c.className),
    ["ld-status-card__row-lead", "ld-status-card__row-main", "ld-status-card__row-trail"]);
  assert.equal($("div.ld-status-card__row", rows[1]).textContent, "#2Second");
  const [more, plain] = $$(".ld-status-card__footer");
  assert.equal(more.tagName, "A");
  assert.equal(more.getAttribute("target"), null);
  assert.equal(plain.tagName, "DIV");
});

test("Stepper: one aria-current step, state modifiers, check marks for done steps", async () => {
  const steps = ["Cart", "Address", "Pay"].map((label) => ({ id: label, label }));
  const { rerender } = await render(h(Stepper, { steps, current: 1, "aria-label": "Checkout" }));
  const ol = $("ol.ld-stepper");
  assert.equal(ol.getAttribute("aria-label"), "Checkout");
  const lis = $$("li", ol);
  assert.deepEqual(lis.map((li) => li.className.split(" ")[1]),
    ["ld-stepper__step--complete", "ld-stepper__step--current", "ld-stepper__step--upcoming"]);
  assert.deepEqual(lis.map((li) => li.getAttribute("aria-current")), [null, "step", null]);
  assert.ok($(".ld-stepper__node svg", lis[0]), "a complete step shows the check");
  assert.equal($(".ld-stepper__node", lis[2]).textContent, "3");
  assert.ok($$(".ld-stepper__node").every((n) => n.getAttribute("aria-hidden") === "true"));
  await rerender(h(Stepper, { steps, current: 3 }));
  assert.equal($$("[aria-current]").length, 0, "past the end everything is complete");
  assert.equal($$(".ld-stepper__step--complete").length, 3);
});
