// Attribute logic behind StatusCard: the tone modifier, the attention ring,
// and the flash replay. Runs the TypeScript source directly (Node strips
// types); the React wrapper only spreads what these helpers return.
import assert from "node:assert/strict";
import { test } from "node:test";
import { attentionTone, replayFlash, statusCardAttrs } from "../src/status-card.ts";

test("attentionTone: true means warning, false/undefined means none, a tone passes through", () => {
  assert.equal(attentionTone(true), "warning");
  assert.equal(attentionTone(false), undefined);
  assert.equal(attentionTone(undefined), undefined);
  for (const tone of ["info", "success", "warning", "danger"]) {
    assert.equal(attentionTone(tone), tone);
  }
});

test("statusCardAttrs: bare card carries only the root class", () => {
  assert.deepEqual(statusCardAttrs(undefined, undefined), { className: "ld-status-card" });
});

test("statusCardAttrs: tone becomes a BEM modifier, consumer className is appended", () => {
  assert.deepEqual(statusCardAttrs("danger", undefined, "mine"), {
    className: "ld-status-card ld-status-card--danger mine",
  });
});

test("statusCardAttrs: attention writes data-ld-attention with the ring tone", () => {
  assert.deepEqual(statusCardAttrs("success", true), {
    className: "ld-status-card ld-status-card--success",
    "data-ld-attention": "warning",
  });
  assert.deepEqual(statusCardAttrs(undefined, "danger"), {
    className: "ld-status-card",
    "data-ld-attention": "danger",
  });
  assert.ok(!("data-ld-attention" in statusCardAttrs("info", false)));
});

test("replayFlash: removes, reflows, then re-sets data-ld-changed so the animation restarts", () => {
  const log = [];
  const el = {
    removeAttribute: (n) => log.push(`remove:${n}`),
    setAttribute: (n, v) => log.push(`set:${n}=${v}`),
    get offsetWidth() {
      log.push("reflow");
      return 0;
    },
  };
  replayFlash(el);
  assert.deepEqual(log, ["remove:data-ld-changed", "reflow", "set:data-ld-changed="]);
});
