// No-build demo of the data table, bulk actions, pagination, filter chips and load
// more. It drives plain markup with the same pure helpers the React components use
// (built into ui/ by the Pages workflow; locally, symlink site/ui to
// components/react/dist after a build). The undo toast lives in undo-toast.js.
import { pageAfterResize, pageRange, pageSpan } from "./ui/page-range.js";
import { ariaSort, nextSort, pageSelection, sortRows, togglePage, toggleRow } from "./ui/table-rows.js";
import { isRowActivationClick, isRowActivationKey, ROW_NESTED_CONTROLS } from "./ui/table-state.js";
import { scheduleUndoable } from "./ui/undoable.js";
import { toast, toastReturnFocus } from "./undo-toast.js";

const $ = (id) => document.getElementById(id);
const el = (html) => Object.assign(document.createElement("template"), { innerHTML: html.trim() }).content.firstElementChild;
const CROSS = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 5l6 6M11 5l-6 6"/></svg>`;
const CHEVRON = (d) => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

// 57 deterministic runs
const PIPELINES = ["web-frontend", "api-gateway", "billing", "search-indexer", "mobile-app"];
const STATUSES = { passed: "success", failed: "danger", running: "info" };
const t0 = Date.UTC(2026, 9, 26, 18, 0);
const runs = Array.from({ length: 57 }, (_, i) => ({
  id: `r${1100 - i}`,
  num: 1100 - i,
  pipeline: PIPELINES[(i * 7) % 5],
  status: i % 9 === 4 ? "failed" : i < 3 ? "running" : "passed",
  secs: 40 + ((i * 53) % 400),
  started: new Date(t0 - i * 47 * 60000),
  deleted: false,
}));
const fmtSecs = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
const fmtTime = (d) => d.toISOString().slice(5, 16).replace("T", " ");

const state = { sort: null, selected: new Set(), anchor: null, page: 1, size: 10, status: new Set(), pipeline: new Set(), loading: false };
const live = () => runs.filter((r) => !r.deleted);
// OR within a group, AND across groups
const matching = () => live().filter((r) => (!state.status.size || state.status.has(r.status)) && (!state.pipeline.size || state.pipeline.has(r.pipeline)));

const body = $("runs-body");
const selectPage = $("select-page");
toastReturnFocus(selectPage);
let pageIds = [];

function paintRows(rows) {
  if (state.loading) {
    body.replaceChildren(...Array.from({ length: 5 }, (_, r) => el(`<tr aria-hidden="true">
      <td class="ld-table__select"><span class="ld-skeleton ld-skeleton--block" style="width:1.1rem;height:1.1rem;display:block;margin:auto"></span></td>
      ${[60, 70, 40, 50, 55].map((w, c) => `<td><span class="ld-skeleton ld-skeleton--text" style="width:${w - ((r * 7 + c * 5) % 20)}%"></span></td>`).join("")}</tr>`)));
    return;
  }
  body.replaceChildren(...rows.map((r) => {
    const on = state.selected.has(r.id);
    return el(`<tr tabindex="0" data-id="${r.id}" aria-selected="${on}">
      <td class="ld-table__select"><label class="ld-table__select-hit"><input type="checkbox" class="ld-checkbox" aria-label="Select run #${r.num}" ${on ? "checked" : ""}></label></td>
      <td>#${r.num}</td><td>${r.pipeline}</td>
      <td><span class="ld-badge ld-badge--sm ld-badge--${STATUSES[r.status]}">${r.status}</span></td>
      <td class="ld-num">${fmtSecs(r.secs)}</td><td class="ld-num">${fmtTime(r.started)}</td></tr>`);
  }));
  if (!rows.length) body.append(el(`<tr><td colspan="6"><div class="ld-empty ld-empty--no-results"><h3 class="ld-empty__title">No runs match</h3><p class="ld-empty__body">Remove a filter to see more.</p></div></td></tr>`));
}

function paintChips() {
  const chip = (group, value, label) =>
    `<button type="button" class="ld-chip" data-group="${group}" data-value="${value}" aria-pressed="${state[group].has(value)}">${label}</button>`;
  $("status-chips").innerHTML = `<div class="ld-chip-group__chips">${Object.keys(STATUSES).map((s) => chip("status", s, s)).join("")}</div>`;
  $("pipeline-chips").innerHTML = `<div class="ld-chip-group__chips">${PIPELINES.map((p) => chip("pipeline", p, p)).join("")}</div>`;
  const applied = [...[...state.status].map((v) => ["status", v]), ...[...state.pipeline].map((v) => ["pipeline", v])];
  $("applied-chips").innerHTML = applied.map(([g, v]) => `<span class="ld-chip ld-chip--removable"><span class="ld-chip__label">${g}: ${v}</span><button type="button"
    class="ld-chip__remove" data-group="${g}" data-value="${v}" aria-label="Remove ${g}: ${v}" title="Remove ${g}: ${v}">${CROSS}</button></span>`).join("");
}

function paintPages(pages) {
  const link = (p, html, cls, extra = "") => {
    const off = p < 1 || p > pages;
    return `<li><button type="button" class="ld-pagination__link ${cls}" data-page="${p}"${off ? ' aria-disabled="true"' : ""}${extra}>${html}</button></li>`;
  };
  let html = link(state.page - 1, `${CHEVRON("M10 3.5 5.5 8l4.5 4.5")}<span class="ld-pagination__text">Previous</span>`, "ld-pagination__prev");
  for (const item of pageRange(state.page, pages, 1)) {
    html += item === "ellipsis"
      ? `<li class="ld-pagination__ellipsis" aria-hidden="true">…</li>`
      : link(item, item, "ld-pagination__page", ` aria-label="Page ${item}"${item === state.page ? ' aria-current="page"' : ""}`);
  }
  html += link(state.page + 1, `<span class="ld-pagination__text">Next</span>${CHEVRON("M6 3.5 10.5 8 6 12.5")}`, "ld-pagination__next");
  // keep focus on the control that was pressed (it is redrawn)
  const focused = document.activeElement?.closest("#pages") ? document.activeElement : null;
  const key = focused && (focused.classList.contains("ld-pagination__page") ? `[data-page="${state.page}"]` : `.${[...focused.classList].find((c) => /__(prev|next)$/.test(c))}`);
  $("pages").innerHTML = html;
  if (key) $("pages").querySelector(key)?.focus();
}

function render() {
  const all = matching();
  const sorted = sortRows(all, state.sort, (r, k) => r[k]);
  const span = pageSpan(state.page, state.size, sorted.length);
  state.page = span.page;
  const rows = sorted.slice(span.from - 1, span.to);
  pageIds = rows.map((r) => r.id);
  paintRows(rows);
  for (const th of document.querySelectorAll("#runs th[data-sort]")) {
    const dir = ariaSort(state.sort, th.dataset.sort);
    dir ? th.setAttribute("aria-sort", dir) : th.removeAttribute("aria-sort");
  }
  const page = pageSelection(state.selected, pageIds);
  selectPage.checked = page === "all";
  selectPage.indeterminate = page === "some";
  paintChips();
  $("result-count").textContent = `${all.length} ${all.length === 1 ? "result" : "results"}`;
  $("summary").textContent = all.length ? `Showing ${span.from}–${span.to} of ${all.length}` : "No results";
  paintPages(span.pages);
  paintBulk(all.length);
}

// Bulk bar: shows with a selection, count announced from an always-mounted region
const bulk = $("bulk");
function paintBulk(total) {
  const n = state.selected.size;
  const hadFocus = bulk.contains(document.activeElement);
  const text = n > 1 && n >= total ? `All ${total} selected` : `${n} selected`;
  $("bulk-count").textContent = text;
  $("bulk-status").textContent = n ? text : "";
  $("bulk-all").style.display = n >= total ? "none" : ""; // .ld-btn sets display, so not `hidden`
  $("bulk-all").textContent = `Select all ${total} matching`;
  bulk.hidden = n === 0;
  if (hadFocus && n === 0) selectPage.focus();
  else if (hadFocus && !document.activeElement.checkVisibility()) $("bulk-clear").focus(); // "Select all" went away
}

const log = (text) => ($("runs-log").textContent = text);
body.addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-id]");
  if (!tr) return;
  if (e.target.matches(".ld-checkbox")) {
    const r = toggleRow(state.selected, tr.dataset.id, { shift: e.shiftKey, anchor: state.anchor, order: pageIds });
    [state.selected, state.anchor] = [r.selected, r.anchor];
    const at = pageIds.indexOf(tr.dataset.id);
    render();
    body.querySelectorAll(".ld-checkbox")[at]?.focus();
    return;
  }
  const nested = e.target.closest(ROW_NESTED_CONTROLS);
  if (isRowActivationClick(!!nested && nested !== tr, getSelection()?.toString() ?? "")) log(`Opened run ${tr.cells[1].textContent}.`);
});
body.addEventListener("keydown", (e) => {
  const tr = e.target.closest("tr[data-id]");
  if (!tr || !isRowActivationKey(e.key, e.target === tr)) return;
  e.preventDefault();
  log(`Opened run ${tr.cells[1].textContent}.`);
});
selectPage.addEventListener("change", () => ((state.selected = togglePage(state.selected, pageIds)), render()));

$("runs").querySelector("thead").addEventListener("click", (e) => {
  const th = e.target.closest(".ld-table__sort")?.closest("th");
  if (!th) return;
  state.sort = nextSort(state.sort, th.dataset.sort);
  render();
  th.querySelector("button").focus();
});

// Filters: a change re-counts at once, goes back to page 1, and drops selected rows it hides
function setFilter(group, value, on) {
  on ? state[group].add(value) : state[group].delete(value);
  state.page = 1;
  const visible = new Set(matching().map((r) => r.id));
  state.selected = new Set([...state.selected].filter((id) => visible.has(id)));
}
for (const id of ["status-chips", "pipeline-chips"]) {
  $(id).addEventListener("click", (e) => {
    const c = e.target.closest(".ld-chip");
    if (!c) return;
    setFilter(c.dataset.group, c.dataset.value, c.getAttribute("aria-pressed") !== "true");
    render();
    $(id).querySelector(`[data-value="${c.dataset.value}"]`).focus();
  });
}
$("applied").addEventListener("click", (e) => {
  const x = e.target.closest(".ld-chip__remove");
  if (!x) return;
  const at = [...$("applied").querySelectorAll(".ld-chip__remove")].indexOf(x);
  setFilter(x.dataset.group, x.dataset.value, false);
  render();
  // focus the next remove button, else Clear all
  ([...$("applied").querySelectorAll(".ld-chip__remove")][at] ?? $("clear-filters")).focus();
});
$("clear-filters").addEventListener("click", () => {
  state.status.clear();
  state.pipeline.clear();
  state.page = 1;
  render();
  $("status-chips").querySelector(".ld-chip").focus();
});

// Bulk actions
$("bulk-clear").addEventListener("click", () => ((state.selected = new Set()), (state.anchor = null), render()));
$("bulk-all").addEventListener("click", () => ((state.selected = new Set(matching().map((r) => r.id))), render()));
$("bulk-rerun").addEventListener("click", () => {
  for (const r of live()) if (state.selected.has(r.id)) r.status = "running";
  render();
  toast(`Re-running ${state.selected.size} ${state.selected.size === 1 ? "run" : "runs"}.`);
});
$("bulk-delete").addEventListener("click", () => {
  const gone = live().filter((r) => state.selected.has(r.id));
  gone.forEach((r) => (r.deleted = true));
  state.selected = new Set();
  render();
  const what = `${gone.length} ${gone.length === 1 ? "run" : "runs"}`;
  toast(`Deleted ${what}.`, scheduleUndoable({
    commit: () => log(`${what} deleted for good.`),
    undo: () => (gone.forEach((r) => (r.deleted = false)), render(), log(`${what} restored.`)),
  }));
});

// Density, page size, slow reload
$("density").addEventListener("click", (e) => {
  const b = e.target.closest("[data-density]");
  if (!b) return;
  for (const x of $("density").children) x.setAttribute("aria-pressed", String(x === b));
  const t = $("runs");
  t.classList.remove("ld-table--compact", "ld-table--comfortable");
  if (b.dataset.density) t.classList.add(`ld-table--${b.dataset.density}`);
});
$("page-size").addEventListener("change", (e) => {
  const size = Number(e.target.value);
  state.page = pageAfterResize(state.page, state.size, size);
  state.size = size;
  render();
});
$("pages").addEventListener("click", (e) => {
  const b = e.target.closest("[data-page]");
  if (!b || b.getAttribute("aria-disabled") === "true") return;
  state.page = Number(b.dataset.page);
  render();
});
$("reload").addEventListener("click", () => {
  state.loading = true;
  $("runs").setAttribute("aria-busy", "true");
  render();
  setTimeout(() => ((state.loading = false), $("runs").removeAttribute("aria-busy"), render()), 1200);
});

// Load more: a cursor into a feed of 30 events, 8 at a time
const EVENTS = Array.from({ length: 30 }, (_, i) => `${PIPELINES[i % 5]} · run #${1100 - i} ${i % 6 === 2 ? "failed" : "finished"}`);
let cursor = 0;
const more = $("events-more");
function loadMore() {
  if (more.getAttribute("aria-busy") === "true" || more.getAttribute("aria-disabled") === "true") return;
  more.setAttribute("aria-busy", "true");
  $("events-busy").textContent = cursor ? "Loading more" : "";
  setTimeout(() => {
    $("events").append(...EVENTS.slice(cursor, cursor + 8).map((t) => el(`<li>${t}</li>`)));
    cursor = Math.min(cursor + 8, EVENTS.length);
    more.removeAttribute("aria-busy");
    $("events-summary").textContent = `Showing ${cursor} of ${EVENTS.length}`;
    if (cursor >= EVENTS.length) {
      more.setAttribute("aria-disabled", "true");
      more.setAttribute("aria-describedby", "events-end");
      more.after(el(`<span class="ld-btn-reason" id="events-end">That's everything</span>`));
    }
  }, cursor ? 700 : 0);
}
more.addEventListener("click", loadMore);

render();
loadMore();
