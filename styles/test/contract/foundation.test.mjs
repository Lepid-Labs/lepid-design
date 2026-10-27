// Foundation slice: the z-index layer scale, hover gating, and the interactive card.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT, themeDirs, LAYERS, themeCssFiles, cssRules } from "./helpers.mjs";

test("the z-index layer scale is identical in every theme and strictly ascending", () => {
  // Overlays from different components must interleave the same way whichever
  // theme is active, so the layer values are structure, not theme character.
  const scales = themeDirs.map((theme) => {
    const tokens = readFileSync(join(ROOT, theme, "tokens.css"), "utf-8");
    return LAYERS.map((l) => Number(tokens.match(new RegExp(`--ld-${l}:\\s*(-?\\d+)\\s*;`))?.[1]));
  });
  for (const [i, scale] of scales.entries()) {
    assert.deepEqual(scale, scales[0], `${themeDirs[i]}: layer values drifted from ${themeDirs[0]}`);
  }
  assert.ok(scales[0].every((v, i) => i === 0 || v > scales[0][i - 1]), `layers out of order: ${scales[0]}`);
});

test("component z-index values come from the layer scale", () => {
  // Only local stacking inside one component (-1, 0, 1) may stay literal;
  // anything that floats over the page takes a --ld-z-* layer.
  for (const theme of themeDirs) {
    for (const file of themeCssFiles(theme)) {
      for (const [, value] of readFileSync(file, "utf-8").matchAll(/z-index:\s*([^;]+);/g)) {
        assert.ok(/^(-?1|0|var\(--ld-z-[\w-]+\))$/.test(value.trim()), `${file}: z-index: ${value}`);
      }
    }
  }
});

test("hover motion is gated on a real hover", () => {
  // Hover Trap: on touch a tap leaves :hover stuck, so a hover rule that moves
  // or animates must sit inside @media (hover: hover). The same affordance
  // reaches the keyboard through a :focus-visible / :focus-within twin.
  const MOTION = /(^|;)\s*(transform|animation)\s*:\s*(?!none\b)[^\s;]/;
  for (const theme of themeDirs) {
    for (const file of themeCssFiles(theme)) {
      for (const rule of cssRules(readFileSync(file, "utf-8"))) {
        if (!MOTION.test(rule.body)) continue;
        const gated = rule.at.some((p) => /@media\s*\(hover:\s*hover\)/.test(p));
        for (const sel of rule.selectors) {
          assert.ok(!sel.includes(":hover") || gated, `${file}: ungated hover motion: ${sel}`);
        }
      }
    }
  }
});

test("every theme carries the interactive-card contract", () => {
  // .ld-card--interactive: the React Card's `interactive` writes the modifier
  // and the caller marks the primary link .ld-card__link, whose ::after is the
  // full-card hit area. Every theme must style the lift, focus ring, press,
  // and nested-control layer, and drop the transform under reduced motion.
  const PARTS = [
    ".ld-card--interactive", ".ld-card--interactive:hover", ".ld-card--interactive .ld-card__link",
    ".ld-card--interactive .ld-card__link::after", ".ld-card--interactive .ld-card__link:focus-visible::after",
    ".ld-card--interactive:has(.ld-card__link:focus-visible)", ".ld-card--interactive:has(.ld-card__link:active)",
    ":not(.ld-card__link)",
  ];
  for (const theme of themeDirs) {
    const rules = cssRules(readFileSync(join(ROOT, theme, "components", "card.css"), "utf-8"));
    const selectors = rules.flatMap((r) => r.selectors);
    for (const part of PARTS) {
      const hits = selectors.filter((s) => s.endsWith(part));
      assert.ok(hits.length > 0, `${theme}: card.css never styles ${part}`);
      for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
    }
    const lift = rules.find((r) => r.selectors.some((s) => s.endsWith(".ld-card--interactive:hover")) && /transform/.test(r.body));
    assert.ok(lift?.at.some((p) => /\(hover:\s*hover\)/.test(p)), `${theme}: card lift is not gated on hover`);
    const still = rules.filter((r) => r.at.some((p) => p.includes("prefers-reduced-motion")) && /transform:\s*none/.test(r.body));
    for (const state of [":hover", ":has(.ld-card__link:focus-visible)", ":has(.ld-card__link:active)"]) {
      assert.ok(
        still.some((r) => r.selectors.some((s) => s.endsWith(`.ld-card--interactive${state}`))),
        `${theme}: the ${state} lift survives reduced motion`,
      );
    }
  }
});
