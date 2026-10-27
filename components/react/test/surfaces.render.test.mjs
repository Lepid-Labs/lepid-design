// Surfaces rendered in happy-dom: Accordion, InlineEdit, StarRating and presence. Runs the built dist.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, useState } from "react";
import { $, $$, act, byText, click, keyDown, render, type, wait } from "./dom.mjs";
import { Accordion, AccordionItem, Avatar, AvatarStack, INLINE_EDIT_SAVED_MS, InlineEdit } from "../dist/index.js";
import { PresenceCursors, StarRating, presenceColor } from "../dist/index.js";

/** A promise the test settles by hand. */
const deferred = () => Promise.withResolvers();

// ── Accordion ───────────────────────────────────────────────────────────────

test("Accordion: items are details/summary rows; exclusive groups share one name", async () => {
  const items = [h(AccordionItem, { key: 1, title: "Billing", open: true }, "Card on file"), h(AccordionItem, { key: 2, title: "Plan" }, "Pro")];
  await render(h(Accordion, { exclusive: true }, items));
  const [a, b, ...rest] = $$("details.ld-accordion__item");
  assert.equal(rest.length, 0);
  assert.equal($("summary", a).textContent, "Billing");
  assert.equal($(".ld-accordion__panel", a).textContent, "Card on file");
  assert.deepEqual([a.open, b.open], [true, false]);
  assert.ok(a.getAttribute("name"), "exclusive gives the group a name");
  assert.equal(b.getAttribute("name"), a.getAttribute("name"));
});

test("Accordion: a named group, an item's own name, and no name when not exclusive", async () => {
  await render(
    h(
      "div",
      null,
      h(Accordion, { exclusive: "faq" }, h(AccordionItem, { title: "A" }), h(AccordionItem, { title: "B", name: "own" })),
      h(Accordion, { className: "free" }, h(AccordionItem, { title: "C" })),
    ),
  );
  const [a, b, c] = $$("details");
  assert.equal(a.getAttribute("name"), "faq");
  assert.equal(b.getAttribute("name"), "own");
  assert.equal(c.hasAttribute("name"), false);
  assert.ok($(".ld-accordion.free"));
});

test("Accordion: the summary toggles its row and onToggle reports it", async () => {
  const seen = [];
  await render(h(Accordion, null, h(AccordionItem, { title: "A", onToggle: (e) => seen.push(e.currentTarget.open) }, "x")));
  await click($("summary"));
  await wait(); // the toggle event is queued, as in browsers
  assert.equal($("details").open, true);
  assert.deepEqual(seen, [true]);
});

// ── InlineEdit ──────────────────────────────────────────────────────────────

const display = () => $("button.ld-inline-edit__display");
const input = () => $("input.ld-inline-edit__input");
const status = () => $("[role=status]");

test("InlineEdit: the display is a button named for the edit; click swaps in a focused input", async () => {
  await render(h(InlineEdit, { value: "Ada", label: "display name", onSave: () => {} }));
  assert.equal(display().textContent, "Edit display name: Ada");
  await click(display());
  assert.equal(display(), null);
  assert.equal(input().value, "Ada");
  assert.equal(input().getAttribute("aria-label"), "display name");
  assert.equal(document.activeElement, input());
  assert.equal($(".ld-inline-edit").dataset.ldEdit, "editing");
});

test("InlineEdit: F2 opens it; Escape restores the value, refocuses the text and does not bubble", async () => {
  await render(h(InlineEdit, { value: "Ada", label: "name", onSave: () => assert.fail("no save on Escape") }));
  await keyDown(display(), "F2");
  await type(input(), "Grace");
  const outside = [];
  const listen = (e) => outside.push(e.key);
  document.addEventListener("keydown", listen);
  const e = await keyDown(input(), "Escape");
  document.removeEventListener("keydown", listen);
  assert.equal(e.defaultPrevented, true);
  assert.deepEqual(outside, [], "Escape must not reach a surrounding dialog");
  assert.equal(input(), null);
  assert.equal($(".ld-inline-edit__text").textContent, "Ada");
  assert.equal(document.activeElement, display());
});

test("InlineEdit: Enter saves optimistically, announces, then settles the saved mark", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const save = deferred();
  const calls = [];
  await render(h(InlineEdit, { value: "Ada", label: "name", onSave: (v) => (calls.push(v), save.promise) }));
  await click(display());
  await type(input(), "Grace");
  const e = await keyDown(input(), "Enter");
  assert.equal(e.defaultPrevented, true, "Enter must not submit a form");
  assert.deepEqual(calls, ["Grace"]);
  assert.equal(display().getAttribute("aria-busy"), "true");
  assert.equal($(".ld-inline-edit__text").textContent, "Grace", "the draft shows while saving");
  assert.equal(status().textContent, "Saving");
  assert.equal(document.activeElement, display());
  await act(async () => save.resolve());
  assert.equal(display().hasAttribute("aria-busy"), false);
  assert.equal(status().textContent, "Saved");
  assert.equal($(".ld-inline-edit").dataset.ldSaved, "true");
  await act(async () => t.mock.timers.tick(INLINE_EDIT_SAVED_MS));
  assert.equal(status().textContent, "");
  assert.equal($(".ld-inline-edit").hasAttribute("data-ld-saved"), false);
});

test("InlineEdit: an unchanged commit closes without saving", async () => {
  await render(h(InlineEdit, { value: "Ada", label: "name", onSave: () => assert.fail("nothing to save") }));
  await click(display());
  await keyDown(input(), "Enter");
  assert.equal($(".ld-inline-edit__text").textContent, "Ada");
});

test("InlineEdit: a failed save reopens the draft with the error wired to the input", async () => {
  const save = deferred();
  await render(h(InlineEdit, { value: "Ada", label: "name", onSave: () => save.promise }));
  await click(display());
  await type(input(), "Taken");
  await keyDown(input(), "Enter");
  await act(async () => save.reject(new Error("That name is taken.")));
  const field = input();
  assert.equal(field.value, "Taken", "the draft survives");
  assert.equal(document.activeElement, field);
  const msg = $(".ld-field__message");
  assert.equal(msg.textContent, "That name is taken.");
  assert.equal(msg.getAttribute("aria-live"), "polite");
  assert.equal(field.getAttribute("aria-invalid"), "true");
  assert.equal(field.getAttribute("aria-errormessage"), msg.id);
  assert.ok(field.getAttribute("aria-describedby").split(" ").includes(msg.id));
  await type(field, "Free");
  assert.equal(input().hasAttribute("aria-invalid"), false, "a new draft clears the error");
  assert.equal(msg.textContent, "");
});

test("InlineEdit: validate refuses a draft without calling onSave", async () => {
  await render(h(InlineEdit, { value: "Ada", label: "name", validate: (d) => (d ? undefined : "Required."), onSave: () => assert.fail("refused") }));
  await click(display());
  await type(input(), "");
  await keyDown(input(), "Enter");
  assert.equal($(".ld-field__message").textContent, "Required.");
  assert.equal(input().getAttribute("aria-invalid"), "true");
});

test("InlineEdit: multiline keeps Enter for new lines and saves on Ctrl+Enter", async () => {
  const calls = [];
  await render(h(InlineEdit, { value: "a", label: "bio", multiline: true, onSave: (v) => void calls.push(v) }));
  await click(display());
  const area = $("textarea.ld-inline-edit__input");
  assert.ok(area);
  await type(area, "a\nb");
  assert.equal((await keyDown(area, "Enter")).defaultPrevented, false);
  assert.deepEqual(calls, []);
  await keyDown(area, "Enter", { ctrlKey: true });
  assert.deepEqual(calls, ["a\nb"]);
});

test("InlineEdit: blur saves without pulling focus back to the text", async () => {
  const calls = [];
  await render(h("div", null, h(InlineEdit, { value: "a", label: "name", onSave: (v) => void calls.push(v) }), h("button", { id: "next" })));
  await click(display());
  await type(input(), "b");
  await act(async () => $("#next").focus());
  assert.deepEqual(calls, ["b"]);
  assert.equal(document.activeElement, $("#next"));
});

test("InlineEdit: an outside value shows at rest but never clobbers an open draft", async () => {
  const props = { label: "name", onSave: () => {} };
  const { rerender } = await render(h(InlineEdit, { ...props, value: "Ada" }));
  await rerender(h(InlineEdit, { ...props, value: "Ada L." }));
  assert.equal($(".ld-inline-edit__text").textContent, "Ada L.");
  await click(display());
  await type(input(), "Draft");
  await rerender(h(InlineEdit, { ...props, value: "Remote" }));
  assert.equal(input().value, "Draft");
  await keyDown(input(), "Escape");
  assert.equal($(".ld-inline-edit__text").textContent, "Remote");
});

test("InlineEdit: unmounting clears the saved timer and ignores a late save", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const clear = t.mock.method(globalThis, "clearTimeout");
  const set = t.mock.method(globalThis, "setTimeout");
  const { unmount } = await render(h(InlineEdit, { value: "a", label: "name", onSave: () => {} }));
  await click(display());
  await type(input(), "b");
  await keyDown(input(), "Enter");
  await act(async () => {});
  const timer = set.mock.calls.find((c) => c.arguments[1] === INLINE_EDIT_SAVED_MS)?.result;
  assert.ok(timer, "the saved mark is on a timer");
  await unmount();
  assert.ok(clear.mock.calls.some((c) => c.arguments[0] === timer));

  const late = deferred();
  const second = await render(h(InlineEdit, { value: "a", label: "name", onSave: () => late.promise }));
  await click(display());
  await type(input(), "c");
  await keyDown(input(), "Enter");
  await second.unmount();
  await act(async () => late.resolve()); // must not throw or update an unmounted tree
});

// ── StarRating ──────────────────────────────────────────────────────────────

function Rated({ initial = 3, onValue = () => {} }) {
  const [v, setV] = useState(initial);
  return h(StarRating, { value: v, label: "Rate this guide", onChange: (n) => (onValue(n), setV(n)) });
}

test("StarRating: an input is a fieldset of named radios, one checked", async () => {
  await render(h(Rated));
  assert.equal($("fieldset legend").textContent, "Rate this guide");
  const radios = $$("input[type=radio]");
  assert.deepEqual(radios.map((r) => r.getAttribute("aria-label")), ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"]);
  assert.equal(new Set(radios.map((r) => r.name)).size, 1, "one group, so one tab stop and native arrow keys");
  assert.deepEqual(radios.map((r) => r.checked), [false, false, true, false, false]);
  assert.equal($(".ld-rating__value").textContent, "3 of 5");
  assert.equal($(".ld-rating__value").getAttribute("aria-hidden"), "true");
});

test("StarRating: choosing a star reports it; Clear resets to 0 and moves focus into the group", async () => {
  const seen = [];
  await render(h(Rated, { onValue: (n) => seen.push(n) }));
  await act(async () => $$("input[type=radio]")[4].click());
  assert.deepEqual(seen, [5]);
  assert.equal($$("input[type=radio]")[4].checked, true);
  await click(byText("Clear", "button"));
  assert.deepEqual(seen, [5, 0]);
  assert.equal(byText("Clear", "button"), undefined, "nothing left to clear");
  assert.equal($(".ld-rating__value").textContent, "Not rated");
  assert.equal(document.activeElement, $("input[type=radio]"));
});

test("StarRating: read-only is one image named with the exact average and count", async () => {
  await render(h("div", null, h(StarRating, { value: 4.34, count: 1280 }), h(StarRating, { value: 0, count: 0 })));
  const [rated, none] = $$(".ld-rating--display");
  assert.equal(rated.getAttribute("role"), "img");
  assert.equal(rated.getAttribute("aria-label"), "4.3 out of 5 stars, 1,280 ratings");
  assert.equal($(".ld-rating__value", rated).textContent, "4.3");
  assert.equal($(".ld-rating__count", rated).textContent, "(1,280)");
  const fills = $$(".ld-rating__glyph", rated).map((g) => g.style.getPropertyValue("--ld-fill"));
  assert.deepEqual(fills, ["1", "1", "1", "1", "0.3"]);
  assert.equal($("input", rated), null);
  assert.equal(none.getAttribute("aria-label"), "No ratings yet");
  assert.equal($(".ld-rating__value", none).textContent, "No ratings");
  assert.equal($(".ld-rating__count", none), null);
});

// ── Presence ────────────────────────────────────────────────────────────────

const people = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Edsger Dijkstra", "Barbara Liskov", "Ken Thompson"].map(
  (name, i) => ({ id: `u${i}`, name }),
);

test("AvatarStack: a named list that folds the overflow into +N naming everyone", async () => {
  await render(h(AvatarStack, { users: people, max: 4 }));
  const list = $("ul.ld-avatar-stack");
  assert.equal(list.getAttribute("aria-label"), "Here now");
  const items = $$("li", list);
  assert.equal(items.length, 4, "three people and the overflow");
  const more = $(".ld-avatar--overflow");
  assert.equal($("[aria-hidden]", more).textContent, "+3");
  assert.equal(more.textContent.replace("+3", ""), "and 3 more: Edsger Dijkstra, Barbara Liskov, Ken Thompson");
  assert.equal(more.title, "Edsger Dijkstra, Barbara Liskov, Ken Thompson");
});

test("Avatar: initials are hidden and the name is the text; a picture uses the name as alt", async () => {
  await render(h("div", null, h(Avatar, { id: "u1", name: "Grace Hopper" }), h(Avatar, { id: "u2", name: "Ada", src: "a.png" })));
  const [plain, pic] = $$(".ld-avatar");
  assert.equal($("[aria-hidden]", plain).textContent, "GH");
  assert.equal(plain.textContent, "GHGrace Hopper");
  assert.equal(plain.title, "Grace Hopper");
  assert.equal(plain.dataset.ldColor, String(presenceColor("u1")));
  assert.equal($("img", pic).alt, "Ada");
});

test("PresenceCursors: draws only remote, placed users, hidden from assistive tech, with idle fading", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"], now: 100_000 });
  const users = [
    { id: "me", name: "Me", x: 1, y: 1 },
    { id: "u1", name: "Grace", x: 10, y: 20, lastSeen: 100_000 },
    { id: "u2", name: "Alan", x: 5, y: 5, lastSeen: 80_000 },
    { id: "u3", name: "Away" },
  ];
  await render(h(PresenceCursors, { users, selfId: "me" }));
  assert.equal($(".ld-presence").getAttribute("aria-hidden"), "true");
  const cursors = $$(".ld-cursor");
  assert.deepEqual(cursors.map((c) => $(".ld-cursor__name", c).textContent), ["Grace", "Alan"]);
  assert.equal(cursors[0].style.translate, "10px 20px", "a newcomer appears where they are");
  assert.equal(cursors[0].dataset.ldColor, String(presenceColor("u1")));
  assert.equal(cursors[0].hasAttribute("data-ld-idle"), false);
  assert.equal(cursors[1].dataset.ldIdle, "true");
  await act(async () => t.mock.timers.tick(11_000));
  assert.equal($$(".ld-cursor")[0].dataset.ldIdle, "true", "still for longer than idleMs");
});

test("PresenceCursors: glides on animation frames and cancels them and its clock on unmount", async (t) => {
  // a hand-run frame queue, so the test decides when each frame lands
  const frames = new Map();
  let next = 0;
  t.mock.method(globalThis, "requestAnimationFrame", (cb) => (frames.set(++next, cb), next));
  t.mock.method(globalThis, "cancelAnimationFrame", (id) => frames.delete(id));
  const clearInterval = t.mock.method(globalThis, "clearInterval");
  const at = (x, y) => [{ id: "u1", name: "Grace", x, y }];
  const { rerender, unmount } = await render(h(PresenceCursors, { users: at(0, 0) }));
  const runFrame = () =>
    act(async () => {
      const [[id, cb]] = frames;
      frames.delete(id);
      cb(performance.now() + 16);
    });
  await runFrame(); // nobody is moving: the loop stops
  assert.equal(frames.size, 0);
  await rerender(h(PresenceCursors, { users: at(100, 0) }));
  assert.equal(frames.size, 1, "a new target starts the loop");
  await runFrame();
  const x = parseFloat($(".ld-cursor").style.translate);
  assert.ok(x > 0 && x < 100, `part way there, got ${x}`);
  assert.equal(frames.size, 1, "still moving, so another frame is queued");
  await unmount();
  assert.equal(frames.size, 0, "the pending frame is cancelled");
  assert.equal(clearInterval.mock.callCount(), 1, "the idle clock stops");
});
