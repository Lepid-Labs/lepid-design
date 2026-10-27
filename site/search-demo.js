// No-build demo of CommandPalette and SearchInput over the same pure helpers the
// React components use (fuzzy filter, highlight, recents, debounced queries).
import { filterCommands, fuzzyMatch, highlight, pushRecent } from "./ui/command-filter.js";
import { menuMove } from "./ui/menu-nav.js";
import { debounceQuery } from "./ui/search-query.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>"]/g, (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot" }[c]};`);
const marked = (text, ranges, cls) =>
  highlight(text, ranges).map((r) => (r.match ? `<mark class="${cls}">${esc(r.text)}</mark>` : esc(r.text))).join("");
const icon = (name) => `<span class="ld-command__option-icon" aria-hidden="true"><svg><use href="icons.svg#${name}"/></svg></span>`;
const empty = (variant, title, body) =>
  `<div class="ld-empty${variant ? ` ld-empty--${variant}` : ""}"><p class="ld-empty__title">${esc(title)}</p>${body ? `<div class="ld-empty__body">${body}</div>` : ""}</div>`;

// Command palette
const COMMANDS = [
  { id: "new", label: "New project", group: "Create", icon: "folder", shortcut: "⌘N" },
  { id: "invite", label: "Invite teammate", group: "Create", icon: "users" },
  { id: "deploy", label: "Deploy web-frontend", group: "Pipelines", icon: "chart", shortcut: "⌘⇧D", keywords: ["ship", "release"] },
  { id: "logs", label: "Open run logs", group: "Pipelines", icon: "doc" },
  { id: "settings", label: "Go to settings", group: "Navigate", icon: "settings", shortcut: "⌘," },
  { id: "inbox", label: "Go to inbox", group: "Navigate", icon: "inbox" },
  { id: "theme", label: "Toggle dark mode", group: "Preferences", icon: "star", keywords: ["theme", "appearance"] },
];
const palette = $("palette");
const input = $("palette-input");
const list = $("palette-list");
let commands = COMMANDS;
let recent = [];
let active = 0;
let flat = [];
let loading = false;

function renderPalette() {
  const query = input.value;
  const groups = filterCommands(commands, query, recent);
  flat = groups.flatMap((g) => g.items);
  active = Math.min(active, flat.length - 1);
  let n = 0;
  list.innerHTML = groups
    .map((g, gi) => `<div role="group" class="ld-command__group"${g.label ? ` aria-labelledby="pg${gi}"` : ""}>${
      g.label ? `<div role="presentation" class="ld-command__group-label" id="pg${gi}">${esc(g.label)}</div>` : ""
    }${g.items
      .map(({ item, ranges }) => {
        const i = n++;
        return `<div role="option" class="ld-command__option" id="po${i}" data-i="${i}" aria-selected="${i === active}">${icon(item.icon)}<span class="ld-command__label">${marked(item.label, ranges, "ld-match")}</span>${
          item.shortcut ? `<kbd class="ld-kbd ld-command__shortcut">${item.shortcut}</kbd>` : ""
        }</div>`;
      })
      .join("")}</div>`)
    .join("");
  list.hidden = !flat.length;
  input.setAttribute("aria-expanded", String(flat.length > 0));
  if (flat.length) input.setAttribute("aria-activedescendant", `po${active}`);
  else input.removeAttribute("aria-activedescendant");
  $("palette-state").innerHTML = loading
    ? `<div class="ld-command__loading" aria-hidden="true">${'<span class="ld-skeleton ld-skeleton--text"></span>'.repeat(3)}</div>`
    : flat.length ? "" : query.trim()
      ? empty("no-results", `No results for “${query.trim()}”`, "Check the spelling, or try a shorter word.")
      : empty("", "Nothing to run yet.");
  $("palette-status").textContent = !query.trim() ? "" : loading ? "Searching…" : `${flat.length} result${flat.length === 1 ? "" : "s"}`;
  $(`po${active}`)?.scrollIntoView({ block: "nearest" });
}
function openPalette() {
  if (palette.open) return palette.close();
  loading = $("palette-slow").checked;
  commands = loading ? [] : COMMANDS;
  active = 0;
  input.value = "";
  palette.showModal();
  renderPalette();
  if (loading) setTimeout(() => ((loading = false), (commands = COMMANDS), renderPalette()), 1500);
}
function choose(i) {
  const item = flat[i]?.item;
  if (!item) return;
  recent = pushRecent(recent, item.id);
  palette.close();
  $("palette-log").textContent = `Ran “${item.label}”.`;
}
addEventListener("keydown", (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return;
  e.preventDefault();
  openPalette();
});
$("palette-open").addEventListener("click", openPalette);
input.addEventListener("input", () => ((active = 0), renderPalette()));
input.addEventListener("keydown", (e) => {
  const to = e.key === "ArrowDown" || e.key === "ArrowUp" ? menuMove(flat.length, active, e.key) : undefined;
  if (to !== undefined) (e.preventDefault(), (active = to), renderPalette());
  else if (e.key === "Enter") (e.preventDefault(), choose(active));
});
list.addEventListener("pointermove", (e) => {
  const i = Number(e.target.closest("[data-i]")?.dataset.i ?? active);
  if (i !== active) (active = i), renderPalette();
});
list.addEventListener("click", (e) => e.target.closest("[data-i]") && choose(Number(e.target.closest("[data-i]").dataset.i)));
palette.addEventListener("click", (e) => e.target === palette && palette.close());

// Search: debounced queries, a spinner while "fetching", highlighted results, a way out of no results
const RUNBOOKS = [
  "Restart the ingest workers", "Rotate the database credentials", "Roll back a bad deploy", "Drain a Kubernetes node",
  "Recover from a full disk", "Purge the CDN cache", "Page the on-call engineer", "Restore a deleted project",
];
const search = $("search");
const box = search.closest(".ld-search");
const results = $("search-results");
const glyph = box.querySelector(".ld-search__icon");
const spinner = Object.assign(document.createElement("span"), { className: "ld-spinner ld-search__icon" });
spinner.setAttribute("aria-hidden", "true");
let sent = 0;
function showResults(query) {
  $("search-log").textContent = `Query sent: “${query}” (${++sent} so far)`;
  glyph.replaceWith(spinner);
  setTimeout(() => {
    spinner.replaceWith(glyph);
    if (!query) return (results.innerHTML = "");
    const hits = RUNBOOKS.map((t) => ({ t, m: fuzzyMatch(query, t) })).filter((h) => h.m).sort((a, b) => b.m.score - a.m.score);
    results.innerHTML = hits.length
      ? hits.map(({ t, m }) => `<li>${marked(t, m.ranges, "ld-match")}</li>`).join("")
      : `<li>${empty("no-results", `No runbooks match “${query}”`, '<button type="button" class="ld-btn ld-btn--sm" id="search-reset">Clear search</button>')}</li>`;
  }, 300);
}
const queries = debounceQuery(showResults);
search.addEventListener("input", () => queries.input(search.value));
search.addEventListener("keydown", (e) => e.key === "Enter" && queries.flush());
const clear = () => ((search.value = ""), queries.input(""), search.focus());
box.querySelector(".ld-search__clear").addEventListener("click", clear);
results.addEventListener("click", (e) => e.target.id === "search-reset" && clear());
addEventListener("keydown", (e) => {
  const t = e.target;
  if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  e.preventDefault();
  search.focus();
});
