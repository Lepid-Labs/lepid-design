// The state machine and keys behind InlineEdit.
import assert from "node:assert/strict";
import { test } from "node:test";
import { inlineEdit, inlineEditKey, inlineEditState } from "../src/inline-edit.ts";

const run = (s, ...events) => events.reduce(inlineEdit, s);

test("start opens the editor on the saved value", () => {
  const s = run(inlineEditState("Ada"), { type: "start" });
  assert.equal(s.mode, "editing");
  assert.equal(s.draft, "Ada");
});

test("commit saves optimistically, then the draft becomes the value", () => {
  const saving = run(inlineEditState("Ada"), { type: "start" }, { type: "change", draft: "Ada L." }, { type: "commit" });
  assert.equal(saving.mode, "saving");
  assert.equal(saving.value, "Ada");
  assert.equal(saving.draft, "Ada L.");
  const done = inlineEdit(saving, { type: "saved" });
  assert.deepEqual([done.mode, done.value, done.saved], ["display", "Ada L.", true]);
  assert.equal(inlineEdit(done, { type: "settle" }).saved, false);
});

test("an unchanged commit closes without saving", () => {
  const s = run(inlineEditState("Ada"), { type: "start" }, { type: "commit" });
  assert.equal(s.mode, "display");
});

test("cancel restores the saved value", () => {
  const s = run(inlineEditState("Ada"), { type: "start" }, { type: "change", draft: "x" }, { type: "cancel" });
  assert.deepEqual([s.mode, s.value, s.draft], ["display", "Ada", "Ada"]);
});

test("a failed save rolls back, keeps the draft and says why", () => {
  const s = run(inlineEditState("Ada"), { type: "start" }, { type: "change", draft: "taken" }, { type: "commit" }, { type: "failed", error: "Name taken" });
  assert.deepEqual([s.mode, s.value, s.draft, s.error], ["error", "Ada", "taken", "Name taken"]);
  // typing clears the stale error; commit retries; cancel rolls back fully
  const typed = inlineEdit(s, { type: "change", draft: "free" });
  assert.deepEqual([typed.mode, typed.error], ["editing", undefined]);
  assert.equal(inlineEdit(s, { type: "commit" }).mode, "saving");
  assert.deepEqual([inlineEdit(s, { type: "cancel" }).mode, inlineEdit(s, { type: "cancel" }).draft], ["display", "Ada"]);
});

test("a refused draft (validation) keeps the editor open", () => {
  const s = run(inlineEditState("Ada"), { type: "start" }, { type: "change", draft: "" }, { type: "failed", error: "Required" });
  assert.deepEqual([s.mode, s.error], ["error", "Required"]);
});

test("events out of place are ignored", () => {
  const rest = inlineEditState("Ada");
  for (const e of [{ type: "commit" }, { type: "cancel" }, { type: "saved" }, { type: "change", draft: "x" }]) {
    assert.equal(inlineEdit(rest, e), rest);
  }
  const saving = run(rest, { type: "start" }, { type: "change", draft: "B" }, { type: "commit" });
  assert.equal(inlineEdit(saving, { type: "cancel" }), saving); // a request in flight can't be recalled
  assert.equal(inlineEdit(saving, { type: "start" }), saving);
});

test("sync follows outside changes without clobbering a draft", () => {
  assert.equal(inlineEdit(inlineEditState("Ada"), { type: "sync", value: "Grace" }).draft, "Grace");
  const editing = run(inlineEditState("Ada"), { type: "start" }, { type: "change", draft: "mine" }, { type: "sync", value: "Grace" });
  assert.deepEqual([editing.value, editing.draft], ["Grace", "mine"]);
});

test("keys: Enter commits a line, Ctrl/⌘+Enter a textarea, Escape cancels, IME is left alone", () => {
  assert.equal(inlineEditKey({ key: "Enter" }), "commit");
  assert.equal(inlineEditKey({ key: "Enter" }, true), undefined);
  assert.equal(inlineEditKey({ key: "Enter", ctrlKey: true }, true), "commit");
  assert.equal(inlineEditKey({ key: "Enter", metaKey: true }, true), "commit");
  assert.equal(inlineEditKey({ key: "Escape" }, true), "cancel");
  assert.equal(inlineEditKey({ key: "Enter", isComposing: true }), undefined);
  assert.equal(inlineEditKey({ key: "a" }), undefined);
});
