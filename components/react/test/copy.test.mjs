// Copy logic behind CodeBlock: clipboard write, failure handling, the
// data-ld-copy hook, and the live-region text. Runs the TypeScript source
// directly (Node strips types); the React wrapper only wires these to a timer.
import assert from "node:assert/strict";
import { test } from "node:test";
import { COPIED_MS, copyAnnouncement, copyDataAttr, copyText } from "../src/copy-state.ts";

test("copyText: writes the exact text and reports copied", async () => {
  const written = [];
  const clipboard = { writeText: async (t) => void written.push(t) };
  assert.equal(await copyText("npm i\n  x", clipboard), "copied");
  assert.deepEqual(written, ["npm i\n  x"]);
});

test("copyText: a rejected write (permission denied) is failed, not thrown", async () => {
  const clipboard = { writeText: async () => { throw new Error("NotAllowedError"); } };
  assert.equal(await copyText("x", clipboard), "failed");
});

test("copyText: no clipboard (insecure context) is failed", async () => {
  assert.equal(await copyText("x", undefined), "failed");
});

test("copyDataAttr: idle drops the attribute; other states pass through", () => {
  assert.equal(copyDataAttr("idle"), undefined);
  assert.equal(copyDataAttr("copied"), "copied");
  assert.equal(copyDataAttr("failed"), "failed");
});

test("copyAnnouncement: silent while idle, a short phrase otherwise", () => {
  assert.equal(copyAnnouncement("idle"), "");
  assert.equal(copyAnnouncement("copied"), "Copied to clipboard");
  assert.equal(copyAnnouncement("failed"), "Copy failed");
});

test("COPIED_MS: the state holds ~1.5s", () => {
  assert.equal(COPIED_MS, 1500);
});
