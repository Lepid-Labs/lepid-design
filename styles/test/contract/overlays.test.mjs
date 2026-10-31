// Overlays slice: tooltip, menu, context menu, sheet, command palette and search.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT, themeDirs, cssRules } from "./helpers.mjs";

test("every theme carries the overlays contract", () => {
  // Tooltip, Menu/ContextMenu, Sheet, CommandPalette and SearchInput write the
  // hooks below. Every theme must style each one, put floating parts on their
  // layer, slide sheets in with @starting-style and clear the safe area, still the
  // motion under reduced motion, and drop the UA popover box under the toaster.
  const PARTS = {
    kbd: [".ld-kbd"],
    tooltip: [".ld-tooltip", '.ld-tooltip[data-ld-side="bottom"]', ".ld-tooltip:not(:popover-open)"],
    menu: [
      ".ld-menu", '.ld-menu[data-ld-side="top"]', ".ld-menu__item", ".ld-menu__item:focus", ".ld-menu__item--danger",
      '.ld-menu__item[aria-disabled="true"]', ".ld-menu__icon", ".ld-menu__label", ".ld-menu__shortcut",
      '.ld-menu__item[role="menuitemcheckbox"]::before', '.ld-menu__item[role="menuitemradio"]::before',
      ".ld-menu__group-label", ".ld-menu__header", ".ld-menu__header-text", ".ld-menu__separator", ".ld-context-target",
    ],
    sheet: [
      ".ld-dialog--sheet", ".ld-dialog--drawer", ".ld-dialog--drawer-start", ".ld-dialog--sheet:not([open])",
      ".ld-dialog--sheet::backdrop", ".ld-dialog__handle", ".ld-dialog__handle:active",
    ],
    command: [
      ".ld-command", ".ld-command__search", ".ld-command__icon", ".ld-command__input", ".ld-command__list",
      ".ld-command__group-label", ".ld-command__option", '.ld-command__option[aria-selected="true"]',
      '.ld-command__option[aria-disabled="true"]', ".ld-command__option-icon", ".ld-command__label",
      ".ld-command__loading",
    ],
    search: [
      ".ld-search", ".ld-search__input", ".ld-search__icon", ".ld-search__hint", ".ld-search__clear",
      ".ld-search:has(.ld-search__input:placeholder-shown) .ld-search__clear", ".ld-match",
    ],
  };
  const body = (rules, end, at) =>
    rules.find((r) => r.selectors.some((s) => s.endsWith(end)) && (!at || r.at.some((p) => p.includes(at))))?.body ?? "";
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
    assert.match(body(rules.tooltip, ".ld-tooltip"), /z-index:\s*var\(--ld-z-tooltip\)/, `${theme}: tooltip is not on the tooltip layer`);
    assert.match(body(rules.tooltip, ".ld-tooltip"), /position-area:/, `${theme}: tooltip is not anchor-positioned`);
    assert.match(body(rules.menu, ".ld-menu"), /z-index:\s*var\(--ld-z-dropdown\)/, `${theme}: menu is not on the dropdown layer`);
    assert.match(body(rules.menu, ".ld-menu"), /position-try-fallbacks:/, `${theme}: menu never flips at the edge`);
    assert.ok(
      rules.sheet.some((r) => r.selectors.some((s) => s.endsWith(".ld-dialog--sheet")) && /env\(safe-area-inset-bottom\)/.test(r.body)),
      `${theme}: sheet ignores the safe area`,
    );
    assert.match(body(rules.sheet, ".ld-dialog--sheet[open]", "@starting-style"), /translate:/, `${theme}: sheet does not slide in`);
    assert.match(body(rules.sheet, ".ld-dialog--sheet:not([open])", "prefers-reduced-motion"), /translate:\s*none/, `${theme}: sheet slides under reduced motion`);
    assert.match(body(rules.sheet, ".ld-dialog__handle"), /touch-action:\s*none/, `${theme}: the handle scrolls instead of dragging`);
    const toaster = cssRules(readFileSync(join(ROOT, theme, "components", "toast.css"), "utf-8"));
    assert.match(body(toaster, ".ld-toaster"), /inset:\s*auto[\s\S]*margin:\s*0/, `${theme}: the toaster keeps the UA popover box`);
  }
});
