// Feedback slice rendered in happy-dom: skeleton, empty state, toasts with undo, autosave status.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement as h } from "react";
import { $, $$, act, byText, click, fire, focus, keyDown, render, window } from "./dom.mjs";
import {
  Alert,
  Badge,
  EmptyState,
  Progress,
  SaveStatus,
  Skeleton,
  Spinner,
  Toaster,
  scheduleUndoable,
  toast,
  useAutosave,
  useLoadingIndicator,
} from "../dist/index.js";

// Fake clock for one test, plus the timers components still hold (made, minus fired or cleared).
function clock(t) {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
  const live = new Set();
  for (const [make, clear, once] of [["setTimeout", "clearTimeout", true], ["setInterval", "clearInterval", false]]) {
    const [m, c] = [globalThis[make], globalThis[clear]];
    globalThis[make] = (fn, ms, ...a) => {
      const id = m((...x) => (once && live.delete(id), fn(...x)), ms, ...a);
      live.add(id);
      return id;
    };
    globalThis[clear] = (id) => (live.delete(id), c(id)); // mock.timers.reset() puts the real ones back
  }
  return { live, tick: (ms) => act(async () => t.mock.timers.tick(ms)) };
}

const unloadBlocked = () => !window.dispatchEvent(new window.Event("beforeunload", { cancelable: true }));

// The toast stack is module-wide: clear what a test left behind.
const shown = [];
const show = (opts) => act(async () => void shown.push(toast(opts)));
afterEach(() => shown.splice(0).forEach((id) => toast.dismiss(id)));

test("Badge, Alert, Progress and Spinner render their roles and classes", async () => {
  const { container } = await render(
    h("div", null,
      h(Badge, { variant: "success", size: "sm", pulse: true }, "New"),
      h(Alert, { variant: "danger", title: "Failed" }, "Try again"),
      h(Progress, { value: 150, accent: true }),
      h(Spinner)),
  );
  assert.equal($(".ld-badge", container).className, "ld-badge ld-badge--success ld-badge--sm ld-badge--pulse");
  assert.equal($("[role=alert]", container).className, "ld-alert ld-alert--danger");
  assert.equal($(".ld-alert__title", container).textContent, "Failed");
  const bar = $("[role=progressbar]", container);
  assert.equal(bar.getAttribute("aria-valuenow"), "100"); // clamped
  assert.equal($(".ld-progress__bar--accent", bar).style.width, "100%");
  assert.equal($(".ld-spinner", container).getAttribute("role"), "status");
});

test("Skeleton: hidden from assistive tech, a paragraph of lines ends short", async () => {
  const { container } = await render(h("div", null, h(Skeleton, { lines: 3 }), h(Skeleton, { variant: "circle", width: 40 })));
  const lines = $$(".ld-skeleton--text", container);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines.map((l) => l.style.width), ["", "", "60%"]);
  assert.equal($(".ld-skeleton--circle", container).style.width, "40px");
  assert.ok($$(".ld-skeleton", container).every((s) => s.getAttribute("aria-hidden") === "true"));
});

test("EmptyState: heading level, decorative icon, body and actions", async () => {
  const { container } = await render(
    h(EmptyState, { variant: "no-results", icon: h("svg"), title: "No matches", titleAs: "h2", actions: h("button", null, "Clear") }, "Try fewer filters"),
  );
  assert.ok(container.firstChild.classList.contains("ld-empty--no-results"));
  assert.equal($("h2.ld-empty__title", container).textContent, "No matches");
  assert.equal($(".ld-empty__icon", container).getAttribute("aria-hidden"), "true");
  assert.equal($(".ld-empty__body", container).textContent, "Try fewer filters");
  assert.ok($(".ld-empty__actions button", container));
  await render(h(EmptyState, { title: "Nothing yet" }));
  assert.ok($("h3.ld-empty__title"), "h3 by default");
});

test("SaveStatus: relative time ticks on, Retry shows only on error", async (t) => {
  const { tick, live } = clock(t);
  let retries = 0;
  const { container, rerender, unmount } = await render(h(SaveStatus, { status: "saved", savedAt: Date.now() - 59_000 }));
  assert.equal($(".ld-save-status__text", container).textContent, "Saved");
  await tick(30_000);
  assert.equal($("time", container).textContent, "1 minute ago");
  assert.equal($(".ld-save-status", container).dataset.ldSave, "saved");
  await rerender(h(SaveStatus, { status: "error", onRetry: () => retries++ }));
  assert.equal(live.size, 0, "the minute ticker stops outside the saved state");
  await click(byText("Retry", "button"));
  assert.equal(retries, 1);
  await rerender(h(SaveStatus, { status: "saved", savedAt: Date.now() }));
  await unmount();
  assert.equal(live.size, 0, "unmount clears the ticker");
});

// A document that autosaves through the hook into the indicator.
function Doc({ save }) {
  const a = useAutosave(save);
  return h("div", null, h("button", { onClick: a.edit }, "edit"), h(SaveStatus, { status: a.status, savedAt: a.state.savedAt, onRetry: a.retry }));
}
const statusText = () => $(".ld-save-status__text").textContent;
const said = () => $(".ld-save-status [role=status]").textContent;

test("useAutosave: debounced save, failure then retry, announced once each", async (t) => {
  const { tick } = clock(t);
  const calls = [];
  const save = () => new Promise((resolve, reject) => calls.push({ resolve, reject }));
  await render(h(Doc, { save }));
  await click(byText("edit", "button"));
  assert.equal(statusText(), "Unsaved changes");
  assert.equal(unloadBlocked(), true, "leaving with unsaved edits asks first");
  await tick(799);
  assert.equal(calls.length, 0);
  await tick(1);
  assert.equal(calls.length, 1);
  assert.equal(statusText(), "Saving…");
  assert.equal(said(), "", "routine saving stays silent");
  await act(async () => calls[0].reject(new Error("500")));
  assert.equal(statusText(), "Changes not saved");
  assert.equal(said(), "Changes not saved");
  await click(byText("Retry", "button"));
  assert.equal(calls.length, 2);
  await act(async () => calls[1].resolve());
  assert.equal(statusText(), "Saved");
  assert.equal(said(), "Saved", "the save that recovers is announced");
  assert.equal(unloadBlocked(), false);
});

test("useAutosave: offline edits wait for the network; unmount drops timers and listeners", async (t) => {
  const { tick, live } = clock(t);
  let saves = 0;
  const { unmount } = await render(h(Doc, { save: async () => void saves++ }));
  await fire(window, "offline");
  assert.equal(statusText(), "Offline: changes will save when you reconnect");
  assert.equal(said(), statusText());
  await click(byText("edit", "button"));
  await tick(10_000);
  assert.equal(saves, 0);
  await fire(window, "online");
  await tick(0);
  assert.equal(saves, 1);
  assert.equal(statusText(), "Saved");
  await click(byText("edit", "button"));
  await unmount();
  assert.equal(live.size, 0, "the pending debounce is cleared");
  assert.equal(unloadBlocked(), false, "the beforeunload guard is removed");
  await tick(10_000);
  assert.equal(saves, 1);
});

function Loading({ loading }) {
  return h("span", null, useLoadingIndicator(loading) ? "spinner" : "");
}

test("useLoadingIndicator: no flash for fast loads, minimum visible time, timers cleared", async (t) => {
  const { tick, live } = clock(t);
  const { container, rerender, unmount } = await render(h(Loading, { loading: true }));
  await tick(100);
  await rerender(h(Loading, { loading: false }));
  await tick(1000);
  assert.equal(container.textContent, "", "a 100 ms load shows nothing");
  await rerender(h(Loading, { loading: true }));
  await tick(399);
  assert.equal(container.textContent, "");
  await tick(1);
  assert.equal(container.textContent, "spinner");
  await tick(50);
  await rerender(h(Loading, { loading: false }));
  await tick(449);
  assert.equal(container.textContent, "spinner", "stays up 500 ms once shown");
  await tick(1);
  assert.equal(container.textContent, "");
  await rerender(h(Loading, { loading: true }));
  await unmount();
  assert.equal(live.size, 0);
});

test("Toaster: polite and assertive regions, labelled group, timeout and dismiss", async (t) => {
  const { tick } = clock(t);
  await render(h(Toaster));
  assert.equal($(".ld-toaster"), null, "no stack while empty");
  assert.ok($("[role=status]") && $("[role=alert]"), "live regions are mounted up front");
  await show({ title: "Draft", message: "Saved" });
  await show({ message: "Upload failed", variant: "danger" });
  const stack = $("section.ld-toaster");
  assert.equal(stack.getAttribute("popover"), "manual");
  assert.equal(stack.getAttribute("aria-label"), "Notifications (F8)");
  const [info, danger] = $$(".ld-toast", stack);
  assert.equal(info.getAttribute("role"), "group");
  assert.equal(document.getElementById(info.getAttribute("aria-labelledby")).textContent, "DraftSaved");
  assert.equal($("[role=status]").textContent, "Draft Saved");
  assert.equal($("[role=alert]").textContent, "Upload failed");
  await tick(4999);
  assert.equal($$(".ld-toast").length, 2);
  await tick(1);
  assert.deepEqual($$(".ld-toast").map((el) => el.textContent), ["Upload failed"], "info times out, errors stay");
  await click($("[aria-label=Dismiss]", danger));
  assert.equal($(".ld-toaster"), null);
});

test("Toaster: three at a time, replace in place by id, Escape dismisses", async (t) => {
  clock(t);
  await render(h(Toaster));
  for (const n of [1, 2, 3, 4]) await show({ message: `T${n}`, duration: null });
  assert.deepEqual($$(".ld-toast__message").map((m) => m.textContent), ["T1", "T2", "T3"]);
  await show({ id: shown[1], message: "T2 again", duration: null });
  assert.equal($$(".ld-toast__message")[1].textContent, "T2 again");
  await keyDown($(".ld-toast"), "Escape");
  assert.deepEqual($$(".ld-toast__message").map((m) => m.textContent), ["T2 again", "T3", "T4"], "the next one moves up");
});

test("Toaster: hover and focus pause the clocks", async (t) => {
  const { tick } = clock(t);
  await render(h(Toaster));
  await show({ message: "Copied" });
  const stack = $(".ld-toaster");
  await fire(stack, "pointerover", { relatedTarget: document.body }, window.PointerEvent);
  assert.equal(stack.dataset.ldPaused, "true");
  await tick(60_000);
  assert.ok($(".ld-toast"), "no timeout while hovered");
  await fire(stack, "pointerout", { relatedTarget: document.body }, window.PointerEvent);
  assert.equal(stack.dataset.ldPaused, undefined);
  await focus($("[aria-label=Dismiss]"));
  assert.equal(stack.dataset.ldPaused, "true", "focus inside pauses too");
  await tick(60_000);
  assert.ok($(".ld-toast"));
});

test("Toaster: an action runs once and closes the toast", async (t) => {
  clock(t);
  let ran = 0;
  await render(h(Toaster));
  await show({ message: "Archived", action: { label: "View", onAction: () => ran++ } });
  assert.equal($("[role=status]").textContent, "Archived (View, F8)");
  assert.equal($(".ld-toast__countdown").style.getPropertyValue("--ld-toast-duration"), "10000ms");
  await click(byText("View", "button"));
  assert.equal(ran, 1);
  assert.equal($(".ld-toast"), null);
});

test("Toaster: undo cancels the commit; the undo window follows the toast clock", async (t) => {
  const { tick } = clock(t);
  const log = [];
  const pending = () => scheduleUndoable({ commit: () => log.push("commit"), undo: () => log.push("undo"), delay: 8000 });
  await render(h(Toaster));
  await show({ message: "Deleted", undo: pending() });
  await click(byText("Undo", "button"));
  assert.deepEqual(log, ["undo"]);
  await tick(10_000);
  assert.deepEqual(log, ["undo"], "nothing commits after an undo");

  await show({ message: "Deleted", undo: pending() });
  const stack = $(".ld-toaster");
  await fire(stack, "pointerover", { relatedTarget: document.body }, window.PointerEvent);
  await tick(20_000);
  assert.deepEqual(log, ["undo"], "the undo window waits while the toast is held");
  await fire(stack, "pointerout", { relatedTarget: document.body }, window.PointerEvent);
  await tick(8000);
  assert.deepEqual(log, ["undo", "commit"]);
  assert.equal($(".ld-toast"), null);
});

test("Toaster: F8 jumps to the newest toast; pagehide commits pending undos", async (t) => {
  clock(t);
  const log = [];
  await render(h("div", null, h("button", null, "elsewhere"), h(Toaster)));
  await show({ message: "Moved", undo: scheduleUndoable({ commit: () => log.push("commit"), delay: 8000 }) });
  await focus(byText("elsewhere", "button"));
  const ev = new window.KeyboardEvent("keydown", { key: "F8", bubbles: true, cancelable: true });
  await act(async () => void document.activeElement.dispatchEvent(ev));
  assert.equal(ev.defaultPrevented, true);
  assert.equal(document.activeElement.textContent, "Undo");
  assert.equal($(".ld-toaster").dataset.ldPaused, "true");
  await fire(window, "pagehide");
  assert.deepEqual(log, ["commit"], "leaving the page commits what the user saw happen");
  await keyDown(document.activeElement, "Escape");
  assert.equal($(".ld-toast"), null);
  assert.equal(document.activeElement.textContent, "elsewhere", "focus goes back where F8 came from");
});

test("Toaster: unmount clears its timer and window listeners", async (t) => {
  const { live } = clock(t);
  const log = [];
  const { unmount } = await render(h(Toaster));
  await show({ message: "Bye" });
  assert.equal(live.size, 1, "the expiry timer");
  await unmount();
  assert.equal(live.size, 0);
  await show({ message: "Later", undo: scheduleUndoable({ commit: () => log.push("commit"), delay: 8000 }) });
  await fire(window, "pagehide");
  assert.deepEqual(log, [], "no pagehide listener after unmount");
});
