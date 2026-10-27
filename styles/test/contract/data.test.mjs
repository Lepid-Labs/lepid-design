// Data slice: sortable/selectable table, bulk actions, pagination, chips and charts.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT, themeDirs, cssRules } from "./helpers.mjs";

test("every theme carries the data contract", () => {
  // SortHeader, the selection cells, BulkActionBar, Pagination, the chips and the
  // charts write the hooks below. Every theme must style each one, keep the sticky
  // header and the bulk bar on the sticky layer (the bar in the flow, clear of the
  // home indicator, with scroll padding so focus is not hidden under it), mark a
  // pressed chip with an icon, and tell chart series apart by dash, not hue alone.
  const PARTS = {
    table: [
      ".ld-table .ld-num", ".ld-table--sticky thead th", ".ld-table--compact", ".ld-table--comfortable",
      ".ld-table-scroll", ".ld-table__sort", ".ld-table__sort:focus-visible", ".ld-table__sort-icon",
      '.ld-table th[aria-sort="ascending"] .ld-table__sort-asc', '.ld-table th[aria-sort="descending"] .ld-table__sort-desc',
      ".ld-table .ld-table__select", ".ld-table__select-hit", '.ld-table tbody tr[aria-selected="true"]',
    ],
    form: [".ld-checkbox:indeterminate"],
    "bulk-bar": [".ld-bulk-bar", ".ld-bulk-bar[hidden]", ".ld-bulk-bar--top", ".ld-bulk-bar__count", ".ld-bulk-bar__actions"],
    pagination: [
      ".ld-pagination__list", ".ld-pagination__link", ".ld-pagination__link:focus-visible",
      '.ld-pagination__link[aria-current="page"]', '.ld-pagination__link[aria-disabled="true"]',
      ".ld-pagination__ellipsis", ".ld-pagination__text", ".ld-pagination-bar", ".ld-pagination__summary",
      ".ld-pagination__size", ".ld-load-more",
    ],
    chip: [
      ".ld-chip", ".ld-chip:focus-visible", '.ld-chip[aria-pressed="true"]', '.ld-chip[aria-pressed="true"]::before',
      ".ld-chip:disabled", ".ld-chip--removable", ".ld-chip__remove", ".ld-chip__remove:focus-visible",
      ".ld-chip-group", ".ld-chip-group__chips", ".ld-chip-group__count", ".ld-chip-group--scroll .ld-chip-group__chips",
    ],
    chart: [
      ".ld-chart", ".ld-chart__title", ".ld-chart__svg", ".ld-chart__grid", ".ld-chart__baseline", ".ld-chart__tick",
      ".ld-chart__axis-label", ".ld-chart__break", ".ld-chart__bar", ".ld-chart__bar--highlight", ".ld-chart__value",
      ".ld-chart__line", ".ld-chart__points", ".ld-chart__label", ".ld-chart__data > summary",
      ".ld-sparkline", ".ld-sparkline__line", ".ld-sparkline__dot", ".ld-sparkline__value",
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
    const sticky = body(rules.table, ".ld-table--sticky thead th");
    assert.match(sticky, /position:\s*sticky[\s\S]*z-index:\s*var\(--ld-z-sticky\)/, `${theme}: the sticky header is not on the sticky layer`);
    const bar = body(rules["bulk-bar"], ".ld-bulk-bar");
    assert.match(bar, /position:\s*sticky/, `${theme}: the bulk bar leaves the flow (it would cover the last row)`);
    assert.match(bar, /z-index:\s*var\(--ld-z-sticky\)/, `${theme}: the bulk bar is not on the sticky layer`);
    assert.match(bar, /env\(safe-area-inset-bottom\)/, `${theme}: the bulk bar ignores the safe area`);
    assert.match(body(rules["bulk-bar"], ".ld-bulk-bar[hidden]"), /display:\s*none/, `${theme}: an empty bulk bar still shows`);
    assert.ok(
      rules["bulk-bar"].some((r) => r.selectors.some((s) => s.includes(":root:has(.ld-bulk-bar")) && /scroll-padding/.test(r.body)),
      `${theme}: focus can scroll under the bulk bar`,
    );
    assert.match(body(rules["bulk-bar"], ".ld-bulk-bar", "prefers-reduced-motion"), /translate:\s*none/, `${theme}: the bulk bar slides under reduced motion`);
    assert.match(body(rules.chip, '.ld-chip[aria-pressed="true"]::before'), /mask:\s*url\(/, `${theme}: a pressed chip differs by colour alone`);
    for (const k of [1, 2, 3]) {
      assert.match(body(rules.chart, `.ld-chart__series--${k}`), /--ld-chart-dash:/, `${theme}: chart series ${k} differs by colour alone`);
    }
    for (const k of [1, 2, 3, 4]) assert.match(body(rules.chart, ".ld-chart"), new RegExp(`--ld-chart-${k}:`), `${theme}: --ld-chart-${k} missing`);
  }
});
