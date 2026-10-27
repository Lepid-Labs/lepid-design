// Forms slice: field states, busy and reasoned-disabled buttons, password and OTP.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT, themeDirs, cssRules } from "./helpers.mjs";

test("every theme carries the form-states contract", () => {
  // Field writes aria-invalid / .ld-field--success and fills the hint and status
  // line; Button writes aria-busy and aria-disabled with a .ld-btn-reason sibling;
  // PasswordField and OtpInput render the parts below. Every theme must style each
  // hook, mark errors with an icon (not colour alone), and keep the busy spinner
  // turning, only slower, under reduced motion.
  const PARTS = {
    field: [
      ".ld-input:where([placeholder]:not(:placeholder-shown))", ".ld-select[aria-invalid=\"true\"]",
      ".ld-field--success .ld-input", ".ld-input:disabled", ".ld-input[readonly]", ".ld-field__hint",
      ".ld-field__message", ".ld-field__message--error", ".ld-field__message--success",
      ".ld-field__message:not(:empty)::before",
    ],
    button: [
      '.ld-btn[aria-busy="true"]', '.ld-btn[aria-busy="true"] > *', '.ld-btn[aria-busy="true"]::after',
      '.ld-btn[aria-disabled="true"]', '.ld-btn[aria-disabled="true"]:focus-visible', ".ld-btn-reason",
    ],
    password: [
      ".ld-password__control", ".ld-password__toggle", ".ld-password__strength", ".ld-password__meter",
      ".ld-password__score", ".ld-password__rules", ".ld-password__rule::before", ".ld-password__rule--met",
      ...[0, 1, 2, 3, 4].map((s) => `.ld-password__meter[data-ld-strength="${s}"] .ld-progress__bar`),
    ],
    otp: [".ld-otp", ".ld-otp .ld-otp__cell", ".ld-otp .ld-otp__cell:placeholder-shown"],
  };
  for (const theme of themeDirs) {
    for (const [name, parts] of Object.entries(PARTS)) {
      const rules = cssRules(readFileSync(join(ROOT, theme, "components", `${name}.css`), "utf-8"));
      const selectors = rules.flatMap((r) => r.selectors);
      for (const part of parts) {
        const hits = selectors.filter((s) => s.endsWith(part));
        assert.ok(hits.length > 0, `${theme}: ${name}.css never styles ${part}`);
        for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
      }
      if (name === "field") {
        const error = rules.find((r) => r.selectors.some((s) => s.endsWith(".ld-field__message--error")));
        assert.match(error?.body ?? "", /--ld-field-icon:\s*url\(/, `${theme}: field errors carry no icon`);
      }
      if (name === "button") {
        const slowed = rules.find(
          (r) => r.at.some((p) => p.includes("prefers-reduced-motion")) && r.selectors.some((s) => s.endsWith('[aria-busy="true"]::after')),
        );
        assert.match(slowed?.body ?? "", /animation-duration/, `${theme}: busy spinner is not slowed under reduced motion`);
      }
    }
  }
});
