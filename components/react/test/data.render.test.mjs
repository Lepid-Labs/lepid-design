// Data slice rendered in happy-dom: table rows, sorting, selection, bulk bar, pagination, chips, charts.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, useRef, useState } from "react";
import { $, $$, act, byText, click, fire, focus, keyDown, render } from "./dom.mjs";
import {
  BarChart, BulkActionBar, Chip, ChipGroup, FilterChip, LineChart, LoadMore, PageSizeSelect, PageSummary,
  Pagination, SortHeader, Sparkline, Table, TableRow, TableSelectAll, TableSelectCell, TableSkeletonRows,
  useRowSelection,
} from "../dist/index.js";

const table = (props, ...rows) => h(Table, props, h("tbody", null, ...rows));

test("TableRow: click and Enter/Space activate; nested controls and text selections do not", async () => {
  const hits = [];
  let nested = 0;
  await render(table({ interactive: true, density: "compact" },
    h(TableRow, { key: 1, onActivate: (e) => hits.push(e.type), selected: true },
      h("td", null, "deploy-web"), h("td", null, h("button", { onClick: () => nested++ }, "Retry"))),
    h(TableRow, { key: 2 }, h("td", null, "plain"))));
  assert.equal($("table").className, "ld-table ld-table--interactive ld-table--compact");
  const [row, plain] = $$("tr");
  assert.equal(row.getAttribute("tabindex"), "0");
  assert.equal(row.getAttribute("aria-selected"), "true");
  assert.equal(plain.hasAttribute("tabindex"), false);
  assert.equal(plain.hasAttribute("aria-selected"), false);

  await click($("td"));
  await click($("button"));
  assert.deepEqual(hits, ["click"]);
  assert.equal(nested, 1);

  await keyDown(row, "Enter");
  await keyDown(row, " ");
  await keyDown($("button"), "Enter"); // the button's own key, not the row's
  await keyDown(row, "a");
  assert.deepEqual(hits, ["click", "keydown", "keydown"]);

  getSelection().selectAllChildren($("td"));
  await click($("td"));
  getSelection().removeAllRanges();
  assert.equal(hits.length, 3, "finishing a text selection does not activate");
});

test("SortHeader: aria-sort only on the sorted column, cycling ascending, descending, off", async () => {
  function Sorted() {
    const [sort, setSort] = useState(null);
    return h(Table, null, h("thead", null, h("tr", null,
      h(SortHeader, { column: "name", sort, onSortChange: setSort }, "Name"),
      h(SortHeader, { column: "size", sort, onSortChange: setSort, numeric: true }, "Size"))));
  }
  await render(h(Sorted));
  const [name, size] = $$("th");
  assert.equal(name.getAttribute("scope"), "col");
  assert.equal(size.className, "ld-num");
  const sorts = () => [name.getAttribute("aria-sort"), size.getAttribute("aria-sort")];
  assert.deepEqual(sorts(), [null, null]);
  await click($("button", name));
  assert.deepEqual(sorts(), ["ascending", null]);
  await click($("button", name));
  assert.deepEqual(sorts(), ["descending", null]);
  await click($("button", name));
  assert.deepEqual(sorts(), [null, null]);
  await click($("button", size));
  await click($("button", size));
  assert.deepEqual(sorts(), [null, "descending"]);
});

const IDS = ["a", "b", "c", "d"];
let activated = 0;
function Selectable() {
  const sel = useRowSelection(IDS);
  const all = useRef(null);
  return h("div", null,
    h(Table, { interactive: true },
      h("thead", null, h("tr", null, h(TableSelectAll, { state: sel.pageState, onToggle: sel.togglePage, inputRef: all }), h("th", null, "Name"))),
      h("tbody", null, IDS.map((id) =>
        h(TableRow, { key: id, selected: sel.has(id), onActivate: () => activated++ },
          h(TableSelectCell, { checked: sel.has(id), onToggle: (shift) => sel.toggle(id, shift), label: `Select ${id}` }),
          h("td", null, id))))),
    h(BulkActionBar, { count: sel.count, total: IDS.length, onSelectAll: () => sel.set(IDS), onClear: sel.clear, returnFocusRef: all },
      h("button", { type: "button" }, "Delete")));
}

test("selection: a row press, a shift-range, and the header checkbox's three states", async () => {
  activated = 0;
  await render(h(Selectable));
  const header = $("thead input");
  const box = (id) => $(`input[aria-label="Select ${id}"]`);
  const selected = () => $$("tbody tr").map((r) => r.getAttribute("aria-selected"));
  assert.equal(header.getAttribute("aria-label"), "Select all rows on this page");
  assert.deepEqual(selected(), ["false", "false", "false", "false"]);

  await click(box("b"));
  assert.deepEqual(selected(), ["false", "true", "false", "false"]);
  assert.equal(box("b").checked, true);
  assert.equal(header.checked, false);
  assert.equal(header.indeterminate, true);

  await click(box("d"), { shiftKey: true });
  assert.deepEqual(selected(), ["false", "true", "true", "true"]);

  await click(box("a"));
  assert.equal(header.checked, true);
  assert.equal(header.indeterminate, false);

  await click(header);
  assert.deepEqual(selected(), ["false", "false", "false", "false"]);
  assert.equal(header.indeterminate, false);
  assert.equal(activated, 0, "the checkbox cell never activates the row");
});

test("BulkActionBar: hidden at zero, announces the count, and keeps focus somewhere real", async () => {
  await render(h(Selectable));
  const bar = $("[role=region]");
  const status = $("[role=status]");
  assert.equal(bar.getAttribute("aria-label"), "Bulk actions");
  assert.equal(bar.hidden, true);
  assert.equal(status.textContent, "");

  await click($('input[aria-label="Select c"]'));
  assert.equal(bar.hidden, false);
  assert.equal(status.textContent, "1 selected");
  assert.equal($(".ld-bulk-bar__count").textContent, "1 selected");

  const all = byText("Select all 4 matching", "button");
  await focus(all);
  await click(all);
  assert.equal(status.textContent, "All 4 selected");
  assert.equal(byText("Select all 4 matching", "button"), undefined);
  assert.equal(document.activeElement, $(".ld-bulk-bar__clear"), "focus moves from the vanished button to Clear");

  await click($(".ld-bulk-bar__clear"));
  assert.equal(bar.hidden, true);
  assert.equal(status.textContent, "");
  assert.equal(document.activeElement, $("thead input"), "focus returns to the select-all checkbox");
});

test("TableSkeletonRows: hidden placeholder rows, a square in the checkbox column", async () => {
  await render(h(Table, { "aria-busy": "true" }, h("tbody", null, h(TableSkeletonRows, { rows: 3, columns: 4, selectColumn: true }))));
  assert.equal($("table").getAttribute("aria-busy"), "true");
  const rows = $$("tbody tr");
  assert.equal(rows.length, 3);
  for (const r of rows) {
    assert.equal(r.getAttribute("aria-hidden"), "true");
    assert.equal($$("td", r).length, 4);
    assert.equal($("td", r).className, "ld-table__select");
    assert.ok($("td .ld-skeleton--block", r));
    assert.equal($$(".ld-skeleton--text", r).length, 3);
  }
});

function Paged(props) {
  const [page, setPage] = useState(props.start ?? 1);
  return h(Pagination, { page, pageCount: 10, onPageChange: (p, e) => (props.onEvent?.(e), setPage(p)), ...props });
}

test("Pagination: aria-current follows clicks, and the ends are aria-disabled but focusable", async () => {
  await render(h(Paged));
  assert.equal($("nav").getAttribute("aria-label"), "Pagination");
  const prev = $(".ld-pagination__prev");
  const next = $(".ld-pagination__next");
  const current = () => $("[aria-current=page]").getAttribute("aria-label");
  assert.equal(current(), "Page 1");
  assert.equal(prev.getAttribute("aria-disabled"), "true");
  assert.equal(prev.disabled, false);
  assert.ok($$(".ld-pagination__ellipsis").every((li) => li.getAttribute("aria-hidden") === "true"));

  await click(prev);
  assert.equal(current(), "Page 1");
  await click(next);
  assert.equal(current(), "Page 2");
  assert.equal(prev.hasAttribute("aria-disabled"), false);
  await click($('[aria-label="Page 10"]'));
  assert.equal(current(), "Page 10");
  assert.equal(next.getAttribute("aria-disabled"), "true");
  await click(next);
  assert.equal(current(), "Page 10");
  assert.equal($$("[aria-current]").length, 1);
});

test("Pagination with href: real links, the off end keeps role and tab stop, and routing can prevent", async () => {
  const events = [];
  await render(h(Paged, { href: (p) => `#page-${p}`, onEvent: (e) => (e.preventDefault(), events.push(e)) }));
  assert.equal($('[aria-label="Page 2"]').getAttribute("href"), "#page-2");
  const prev = $(".ld-pagination__prev");
  assert.equal(prev.hasAttribute("href"), false);
  assert.equal(prev.getAttribute("role"), "link");
  assert.equal(prev.getAttribute("tabindex"), "0");
  await click($('[aria-label="Page 3"]'));
  assert.equal($("[aria-current=page]").getAttribute("aria-label"), "Page 3");
  assert.equal(events.length, 1);
  assert.equal(events[0].defaultPrevented, true);
});

test("PageSummary and PageSizeSelect: polite range text and a labelled select", async () => {
  const sizes = [];
  const { rerender } = await render(h("div", null,
    h(PageSummary, { page: 2, pageSize: 20, total: 312 }),
    h(PageSizeSelect, { value: 20, onValueChange: (n) => sizes.push(n) })));
  assert.equal($("p[role=status]").textContent, "Showing 21–40 of 312");
  const select = $("select");
  assert.equal($("label").htmlFor, select.id);
  assert.equal($("label").textContent, "Rows per page");
  assert.deepEqual($$("option").map((o) => o.value), ["10", "20", "50", "100"]);
  select.value = "50";
  await fire(select, "change");
  assert.deepEqual(sizes, [50]);
  await rerender(h(PageSummary, { page: 1, pageSize: 20, total: 0 }));
  assert.equal($("p[role=status]").textContent, "No results");
});

test("LoadMore: count status, busy ignores presses, the end is aria-disabled with its reason", async () => {
  let loads = 0;
  const onLoadMore = () => loads++;
  const { rerender } = await render(h(LoadMore, { shown: 20, total: 50, onLoadMore }));
  assert.equal($("p[role=status]").textContent, "Showing 20 of 50");
  await click($("button"));
  assert.equal(loads, 1);

  await rerender(h(LoadMore, { shown: 20, total: 50, loading: true, onLoadMore }));
  assert.equal($("button").getAttribute("aria-busy"), "true");
  await click($("button"));
  assert.equal(loads, 1);

  await rerender(h(LoadMore, { shown: 50, total: 50, onLoadMore }));
  const button = $("button");
  assert.equal(button.getAttribute("aria-disabled"), "true");
  assert.equal(document.getElementById(button.getAttribute("aria-describedby")).textContent, "That's everything");
  await click(button);
  assert.equal(loads, 1);

  await rerender(h(LoadMore, { shown: 40, onLoadMore }));
  assert.equal($("p[role=status]").textContent, "Showing 40");
  assert.equal($("button").hasAttribute("aria-disabled"), false);
});

test("Chip: aria-pressed toggles, and a prevented click does not", async () => {
  function Toggle({ veto }) {
    const [on, setOn] = useState(false);
    return h(Chip, { pressed: on, onPressedChange: setOn, onClick: veto ? (e) => e.preventDefault() : undefined }, "Failed");
  }
  const { rerender } = await render(h(Toggle));
  const chip = $("button");
  assert.equal(chip.className, "ld-chip");
  assert.equal(chip.getAttribute("aria-pressed"), "false");
  await click(chip);
  assert.equal(chip.getAttribute("aria-pressed"), "true");
  await rerender(h(Toggle, { veto: true }));
  await click(chip);
  assert.equal(chip.getAttribute("aria-pressed"), "true");
});

test("ChipGroup: named group, live count, Clear all, and focus follows a removed chip", async () => {
  let cleared = 0;
  function Filters() {
    const [chips, setChips] = useState(["Status: failed", "Branch: main", "Author: me"]);
    return h(ChipGroup, { label: "Applied filters", count: chips.length - 2, onClearAll: () => (cleared++, setChips([])) },
      chips.map((c) => h(FilterChip, { key: c, removeLabel: `Remove ${c}`, onRemove: () => setChips((cs) => cs.filter((x) => x !== c)) }, c)));
  }
  await render(h(Filters));
  const group = $("[role=group]");
  assert.equal(group.getAttribute("aria-label"), "Applied filters");
  assert.equal($("[role=status]", group).textContent, "1 result");
  const remove = (c) => $(`[aria-label="Remove ${c}"]`);
  assert.equal(remove("Branch: main").title, "Remove Branch: main");

  await focus(remove("Branch: main"));
  await click(remove("Branch: main"));
  assert.equal(remove("Branch: main"), null);
  assert.equal($("[role=status]", group).textContent, "0 results");
  assert.equal(document.activeElement, remove("Author: me"), "focus moves to the next remove button");

  await click(remove("Author: me"));
  assert.equal(document.activeElement, $(".ld-chip-group__clear"), "then to Clear all");

  await click($(".ld-chip-group__clear"));
  assert.equal(cleared, 1);
  assert.equal($$(".ld-chip").length, 0);
});

test("BarChart: an img named by its caption, described by a summary, with a data table", async () => {
  const data = [{ label: "Mon", value: 3 }, { label: "Tue", value: 7 }, { label: "Wed", value: 5 }];
  await render(h(BarChart, { title: "Tuesday peaked", data, unit: " runs", highlight: "Tue", xLabel: "Day", yLabel: "Runs" }));
  const svg = $("svg[role=img]");
  assert.equal(document.getElementById(svg.getAttribute("aria-labelledby")).textContent, "Tuesday peaked");
  assert.equal(document.getElementById(svg.getAttribute("aria-describedby")).textContent,
    "3 bars. Highest: Tue, 7 runs. Lowest: Mon, 3 runs.");
  assert.equal(svg.getAttribute("width"), "560", "no ResizeObserver: the fallback width");
  assert.equal($$("rect.ld-chart__bar").length, 3);
  assert.deepEqual($$(".ld-chart__bar--highlight").length, 1);
  assert.ok($$("svg > g").every((g) => g.getAttribute("aria-hidden") === "true"), "axes and marks are hidden");
  assert.equal($("details summary").textContent, "Show data");
  assert.deepEqual($$("details thead th").map((th) => th.textContent), ["Day", "Runs"]);
  assert.deepEqual($$("details tbody tr").map((tr) => tr.textContent), ["Mon3 runs", "Tue7 runs", "Wed5 runs"]);
  assert.equal($("details tbody th").getAttribute("scope"), "row");
});

test("LineChart: per-series summary, gaps stay gaps, and a broken axis says so", async () => {
  const series = [{ name: "p50", values: [10, null, 12] }, { name: "p95", values: [20, 25, 30] }];
  await render(h(LineChart, { title: "Latency held", labels: ["v1", "v2", "v3"], series, unit: "ms", zero: false }));
  const desc = $("desc").textContent;
  assert.match(desc, /^p50: 10ms to 12ms, high 12ms \(v3\), low 10ms \(v1\)\. p95: 20ms to 30ms/);
  assert.match(desc, /The value axis starts at \d+ms, not zero\.$/);
  assert.ok($(".ld-chart__break"), "the skipped zero is drawn as a break");
  assert.equal(($(".ld-chart__series--0 .ld-chart__line").getAttribute("d").match(/M/g) ?? []).length, 2, "the null splits the line");
  assert.deepEqual($$(".ld-chart__label").map((t) => t.textContent), ["p50", "p95"]);
  assert.deepEqual($$("details tbody tr")[1].textContent, "v2–25ms");
});

test("charts: the ResizeObserver path sizes the svg and disconnects on unmount", async (t) => {
  const seen = { observed: 0, disconnected: 0, cb: null };
  globalThis.ResizeObserver = class {
    constructor(cb) { seen.cb = cb; }
    observe() { seen.observed++; }
    disconnect() { seen.disconnected++; }
  };
  t.after(() => delete globalThis.ResizeObserver);
  const { unmount } = await render(h(BarChart, { title: "x", data: [{ label: "a", value: 1 }] }));
  assert.equal(seen.observed, 1);
  await act(async () => seen.cb([{ contentRect: { width: 321.4 } }]));
  assert.equal($("svg").getAttribute("width"), "321");
  await unmount();
  assert.equal(seen.disconnected, 1);
});

test("Sparkline: the range and latest value are in its name; the printed value is hidden", async () => {
  const { rerender } = await render(h(Sparkline, { label: "Build time", values: [4, 2, null, 6, 5], unit: "s" }));
  assert.equal($("svg").getAttribute("role"), "img");
  assert.equal($("svg").getAttribute("aria-label"), "Build time: 4s to 5s, low 2s, high 6s");
  assert.equal($(".ld-sparkline__value").textContent, "5s");
  assert.equal($(".ld-sparkline__value").getAttribute("aria-hidden"), "true");
  await rerender(h(Sparkline, { label: "Build time", values: [null, null] }));
  assert.equal($("svg").getAttribute("aria-label"), "Build time: no data");
  assert.equal($(".ld-sparkline__value"), null);
  assert.equal($(".ld-sparkline__dot"), null);
});
