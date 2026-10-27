// Feedback slice: skeleton, empty state, toasts with undo, and autosave status.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT, themeDirs, cssRules } from "./helpers.mjs";

test("every theme carries the feedback contract", () => {
  // Skeleton, EmptyState, Toaster and SaveStatus write the hooks below. Every
  // theme must style each one, put the toast stack on the toast layer clear of
  // notches, stop the undo countdown with the stack, still the skeleton shimmer
  // under reduced motion, and slow (never stop) the saving spinner.
  const SAVE = ["idle", "pending", "saving", "saved", "offline", "error"].map((s) => `.ld-save-status[data-ld-save="${s}"]`);
  const PARTS = {
    skeleton: [".ld-skeleton", ".ld-skeleton--text", ".ld-skeleton--circle", ".ld-skeleton--block"],
    empty: [
      ".ld-empty", ".ld-empty__icon", ".ld-empty__title", ".ld-empty__body", ".ld-empty__actions",
      ".ld-empty--first-use .ld-empty__icon", ".ld-empty--no-results .ld-empty__icon", ".ld-empty--cleared .ld-empty__icon",
    ],
    toast: [
      ".ld-toaster", ".ld-toast", ".ld-toast::before", ".ld-toast--success", ".ld-toast--warning", ".ld-toast--danger",
      ".ld-toast__body", ".ld-toast__title", ".ld-toast__countdown", ".ld-toaster[data-ld-paused] .ld-toast__countdown",
    ],
    "save-status": [".ld-save-status", ".ld-save-status::before", ...SAVE, ".ld-save-status__retry"],
  };
  const find = (rules, end, at) =>
    rules.find((r) => r.selectors.some((s) => s.endsWith(end)) && (!at || r.at.some((p) => p.includes(at))));
  for (const theme of themeDirs) {
    const rules = {};
    for (const [name, parts] of Object.entries(PARTS)) {
      rules[name] = cssRules(readFileSync(join(ROOT, theme, "components", `${name}.css`), "utf-8"));
      const selectors = rules[name].flatMap((r) => r.selectors);
      for (const part of parts) {
        const hits = selectors.filter((s) => s.includes(part));
        assert.ok(hits.length > 0, `${theme}: ${name}.css never styles ${part}`);
        for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
      }
    }
    const stack = find(rules.toast, ".ld-toaster")?.body ?? "";
    assert.match(stack, /z-index:\s*var\(--ld-z-toast\)/, `${theme}: the toast stack is not on the toast layer`);
    assert.match(stack, /env\(safe-area-inset-bottom\)/, `${theme}: the toast stack ignores the safe area`);
    assert.match(find(rules.toast, "[data-ld-paused] .ld-toast__countdown")?.body ?? "", /animation-play-state:\s*paused/, `${theme}: the countdown runs on while paused`);
    assert.match(find(rules.skeleton, ".ld-skeleton", "prefers-reduced-motion")?.body ?? "", /animation:\s*none/, `${theme}: the skeleton shimmer survives reduced motion`);
    assert.match(
      find(rules["save-status"], '[data-ld-save="saving"]::before', "prefers-reduced-motion")?.body ?? "",
      /animation-duration/,
      `${theme}: the saving spinner is not slowed under reduced motion`,
    );
  }
});
