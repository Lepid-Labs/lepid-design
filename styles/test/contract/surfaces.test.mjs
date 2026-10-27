// Surfaces slice: accordion, inline edit, star rating, settings layout and presence.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT, themeDirs, cssRules, contrast } from "./helpers.mjs";

test("every theme carries the surfaces contract", () => {
  // Accordion, InlineEdit, StarRating, the settings layout and PresenceCursors /
  // AvatarStack write the hooks below. Every theme must style each one, open the
  // accordion smoothly only where it can (and not under reduced motion) with the
  // chevron on the panel's own timing, swap inline-edit text for an input in one
  // shared box, show the edit pencil on touch, keep hover previews behind a real
  // hover, stick the settings nav only when there is room, and keep presence on
  // its layer, out of the way of clicks, in colours that hold contrast.
  const PARTS = {
    accordion: [
      ".ld-accordion", ".ld-accordion__item", ".ld-accordion__summary", ".ld-accordion__summary::-webkit-details-marker",
      ".ld-accordion__summary:focus-visible", ".ld-accordion__panel", ".ld-accordion__item::details-content",
      ".ld-accordion__item[open]::details-content",
    ],
    "inline-edit": [
      ".ld-inline-edit", ".ld-inline-edit__display", ".ld-inline-edit__input", ".ld-inline-edit__display:focus-visible",
      '.ld-inline-edit__input[aria-invalid="true"]', ".ld-inline-edit__text", ".ld-inline-edit__text--empty",
      ".ld-inline-edit--multiline .ld-inline-edit__input", ".ld-inline-edit__icon",
      '.ld-inline-edit[data-ld-edit="saving"] .ld-inline-edit__icon', ".ld-inline-edit[data-ld-saved] .ld-inline-edit__icon",
    ],
    rating: [
      ".ld-rating", ".ld-rating__legend", ".ld-rating__option", ".ld-rating__input", ".ld-rating__option:has(:focus-visible)",
      ".ld-rating__glyph", ".ld-rating__glyph::before", ".ld-rating__glyph::after", ".ld-rating__option:has(:checked) .ld-rating__glyph",
      ".ld-rating__value", ".ld-rating__clear", ".ld-rating--display", ".ld-rating__stars", ".ld-rating__count",
    ],
    settings: [
      ".ld-settings", ".ld-settings__nav", ".ld-settings__body", ".ld-settings__link", ".ld-settings__link:focus-visible",
      ".ld-settings__link[aria-current]", ".ld-settings__section", ".ld-settings__header", ".ld-settings__title",
      ".ld-settings__description", ".ld-settings__row", ".ld-settings__label", ".ld-settings__hint", ".ld-settings__control",
      ".ld-settings__section--danger",
    ],
    presence: [
      ".ld-presence", ".ld-cursor", ".ld-cursor[data-ld-idle]", ".ld-cursor__pointer", ".ld-cursor__name", ".ld-avatar-stack",
      ".ld-avatar", ".ld-avatar__img", ".ld-avatar--overflow", ...[1, 2, 3, 4, 5, 6, 7, 8].map((k) => `.ld-cursor[data-ld-color="${k}"]`),
    ],
  };
  const body = (rules, end, at) =>
    rules.find((r) => r.selectors.some((s) => s.endsWith(end)) && (!at || r.at.some((p) => p.includes(at))))?.body ?? "";
  const timing = (css) => css.match(/var\(--ld-duration-\w+\)\s+var\(--ld-ease-\w+\)/)?.[0];
  for (const theme of themeDirs) {
    const rules = {};
    for (const [name, parts] of Object.entries(PARTS)) {
      const file = join(ROOT, theme, "components", `${name}.css`);
      assert.ok(existsSync(file), `${theme}: components/${name}.css missing`);
      rules[name] = cssRules(readFileSync(file, "utf-8"));
      const selectors = rules[name].flatMap((r) => r.selectors);
      for (const part of parts) {
        const hits = selectors.filter((s) => s.endsWith(part));
        assert.ok(hits.length > 0, `${theme}: ${name}.css never styles ${part}`);
        for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
      }
    }
    const acc = rules.accordion;
    assert.match(body(acc, ".ld-accordion__item"), /interpolate-size:\s*allow-keywords/, `${theme}: the accordion cannot animate to auto`);
    const panel = body(acc, ".ld-accordion__item::details-content", "@supports");
    assert.match(panel, /block-size:\s*0/, `${theme}: the accordion panel is not animated behind @supports`);
    const chevron = acc.find((r) => r.selectors.some((s) => /\[open\] > \.ld-accordion__summary::(before|after)$/.test(s)));
    assert.match(chevron?.body ?? "", /rotate:/, `${theme}: the chevron does not turn`);
    const turn = acc.find((r) => r.selectors.some((s) => /\.ld-accordion__summary::(before|after)$/.test(s) && !s.includes("[open]")) && /transition:/.test(r.body));
    assert.equal(timing(turn?.body ?? ""), timing(panel), `${theme}: the chevron and the panel run on different timings`);
    assert.match(body(acc, "::details-content", "prefers-reduced-motion"), /transition:\s*none/, `${theme}: the accordion animates under reduced motion`);

    const edit = rules["inline-edit"];
    const shared = edit.find((r) => r.selectors.some((s) => s.endsWith(".ld-inline-edit__display")) && r.selectors.some((s) => s.endsWith(".ld-inline-edit__input")) && /font:\s*inherit/.test(r.body));
    assert.ok(shared && /padding:/.test(shared.body) && /border:/.test(shared.body), `${theme}: the inline-edit text and input do not share one box`);
    assert.match(body(edit, ".ld-inline-edit__icon", "(hover: none)"), /opacity:\s*1/, `${theme}: the edit pencil is hover-only`);
    assert.match(body(edit, '[data-ld-edit="saving"] .ld-inline-edit__icon', "prefers-reduced-motion"), /animation-duration/, `${theme}: the saving spinner is not slowed under reduced motion`);

    for (const r of rules.rating) {
      if (r.selectors.some((s) => s.includes(":hover"))) assert.ok(r.at.some((p) => /\(hover:\s*hover\)/.test(p)), `${theme}: the rating preview is not gated on a real hover`);
    }
    const has = (end, re) => rules.rating.some((r) => r.selectors.some((s) => s.endsWith(end)) && re.test(r.body));
    assert.ok(has(".ld-rating__glyph::after", /clip-path:[^;]*--ld-fill/), `${theme}: stars do not fill fractionally`);
    assert.ok(has(".ld-rating__glyph::before", /mask:[^;]*--ld-star-outline/), `${theme}: an empty star differs by colour alone`);

    const sticky = rules.settings.filter((r) => /position:\s*sticky/.test(r.body));
    assert.ok(sticky.length > 0 && sticky.every((r) => r.at.some((p) => p.startsWith("@container"))), `${theme}: the settings nav sticks without room for it`);

    const layer = rules.presence.find((r) => r.selectors.some((s) => s.endsWith(".ld-presence")) && /z-index/.test(r.body))?.body ?? "";
    assert.match(layer, /z-index:\s*var\(--ld-z-sticky\)/, `${theme}: presence is not on the sticky layer`);
    assert.match(layer, /pointer-events:\s*none/, `${theme}: remote cursors take clicks`);
    assert.match(body(rules.presence, ".ld-cursor[data-ld-idle]"), /opacity:\s*0/, `${theme}: idle cursors never fade`);
    const tokens = readFileSync(join(ROOT, theme, "tokens.css"), "utf-8");
    const grounds = ["bg", "bg-blend", "surface", "sky-start", "sky-end"]
      .map((n) => tokens.match(new RegExp(`--ld-${n}:\\s*(#[0-9a-f]{6})\\s*;`, "i"))?.[1])
      .filter(Boolean);
    const palette = rules.presence.find((r) => /--ld-presence-ink:/.test(r.body))?.body ?? "";
    const ink = palette.match(/--ld-presence-ink:\s*(#[0-9a-f]{6})/i)?.[1];
    assert.ok(ink, `${theme}: --ld-presence-ink missing`);
    for (let k = 1; k <= 8; k++) {
      const hue = palette.match(new RegExp(`--ld-presence-${k}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
      assert.ok(hue, `${theme}: --ld-presence-${k} missing`);
      for (const g of grounds) assert.ok(contrast(hue, g) >= 3, `${theme}: presence ${k} ${hue} is under 3:1 on ${g}`);
      assert.ok(contrast(hue, ink) >= 4.5, `${theme}: name tags on presence ${k} ${hue} are under 4.5:1`);
    }
  }
});
