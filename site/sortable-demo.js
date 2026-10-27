// No-build demo of SortableList, SortableBoard and SwipeRow. The pointer and keyboard
// work is the library's own framework-free controllers (ui/sortable-dom.js,
// ui/swipe-dom.js), the same ones the React components drive; this page owns the
// data and re-renders it, exactly as an app would.
import { placeBeside } from "./ui/floating.js";
import { menuMove } from "./ui/menu-nav.js";
import { moveCard } from "./ui/reorder.js";
import { createSortable } from "./ui/sortable-dom.js";
import { createSwipe } from "./ui/swipe-dom.js";
import { scheduleUndoable } from "./ui/undoable.js";
import { toast } from "./undo-toast.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const GRIP = `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${[4, 8, 12].flatMap((y) => [6, 10].map((x) => `<circle cx="${x}" cy="${y}" r="1.25"/>`)).join("")}</svg>`;
const DOTS = `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${[3.5, 8, 12.5].map((x) => `<circle cx="${x}" cy="8" r="1.4"/>`).join("")}</svg>`;

// Sortable: the controller reports moves; this re-renders from the data
function sortable(root, columns, { board = false, body = (item) => esc(item.title) } = {}) {
  let preview;
  const help = `${root.id}-help`;
  root.insertAdjacentHTML("afterend", `<p id="${help}" hidden>Press Space or Enter to pick it up. Arrow keys move it${board ? " within and between columns" : ""},
    Space or Enter drops it, Escape cancels.</p><p class="sr-only" aria-live="assertive"></p>`);
  const live = root.nextElementSibling.nextElementSibling;
  const list = (col) => `<ul class="ld-sortable" data-ld-sort-list ${board ? `data-ld-sort-name="${esc(col.title)}"` : `aria-label="${esc(col.title)}"`}>${col.items
    .map((item) => `<li class="ld-sortable__item" data-ld-sort-key="${item.id}" data-ld-sort-label="${esc(item.title)}">
      <button type="button" class="ld-drag-handle" aria-label="Move ${esc(item.title)}" aria-describedby="${help}">${GRIP}</button>
      <div class="ld-sortable__body">${body(item)}</div></li>`)
    .join("")}</ul>`;
  const render = () => {
    const cols = preview ? moveCard(columns, preview.from, preview.to) : columns;
    root.innerHTML = board
      ? cols.map((c) => `<section class="ld-board__column" aria-labelledby="${root.id}-${c.id}"><div class="ld-board__title" id="${root.id}-${c.id}">${esc(c.title)}
          <span class="ld-board__count">${c.items.length}</span></div>${list(c)}</section>`).join("")
      : list(cols[0]);
  };
  createSortable(root, {
    live,
    onPreview: (_, from, to) => ((preview = { from, to }), render()),
    onCancel: () => ((preview = undefined), render()),
    onDrop: (_, from, to) => ((preview = undefined), (columns = moveCard(columns, from, to)), render()),
  });
  // a card's own state lives on the card object, so a move carries it along
  root.addEventListener("change", (e) => {
    const key = e.target.closest("[data-ld-sort-key]")?.dataset.ldSortKey;
    const card = columns.flatMap((c) => c.items).find((i) => i.id === key);
    if (card && e.target.type === "checkbox") card.reviewed = e.target.checked;
  });
  render();
}

const task = (id, title, reviewed = false) => ({ id, title, reviewed });
sortable($("priorities"), [{ id: "p", title: "Priorities", items: ["Fix the login bug", "Ship the export", "Write the release notes", "Plan the offsite"].map((t, i) => task(`p${i}`, t)) }]);
sortable(
  $("board"),
  [
    { id: "todo", title: "To do", items: [task("a", "Task A", true), task("b", "Task B"), task("c", "Task C")] },
    { id: "doing", title: "Doing", items: [task("d", "Task D")] },
    { id: "done", title: "Done", items: [task("e", "Task E", true)] },
  ],
  {
    board: true,
    body: (t) => `${esc(t.title)}<label class="card-done"><input type="checkbox" class="ld-checkbox"${t.reviewed ? " checked" : ""}> Reviewed</label>`,
  },
);

// Swipe actions: leading marks read, trailing archives or deletes; a full left swipe
// deletes, with Undo. The ⋯ menu carries the same actions for keyboard and mouse.
const inbox = $("inbox");
let mail = [
  { id: "m1", from: "Ana", subject: "Quarterly numbers are in", read: false },
  { id: "m2", from: "Build bot", subject: "main passed in 4m 12s", read: true },
  { id: "m3", from: "Kenji", subject: "Lunch on Thursday?", read: false },
  { id: "m4", from: "Billing", subject: "Your invoice for October", read: true },
];
let stops = [];
const ANCHORING = CSS.supports("anchor-name: --ld-a");
const menuItem = (act, label, danger) => `<div role="menuitem" tabindex="-1" class="ld-menu__item${danger ? " ld-menu__item--danger" : ""}" data-act="${act}"><span class="ld-menu__label">${label}</span></div>`;
const renderInbox = (focusId) => {
  stops.forEach((stop) => stop());
  inbox.innerHTML = mail
    .map((m) => {
      const label = `Actions for ${esc(m.from)}'s message`;
      return `<li data-id="${m.id}"><div class="ld-swipe">
        <div class="ld-swipe__actions ld-swipe__actions--leading" aria-hidden="true"><button type="button" tabindex="-1" class="ld-swipe__action" data-act="read">${m.read ? "Unread" : "Read"}</button></div>
        <div class="ld-swipe__actions ld-swipe__actions--trailing" aria-hidden="true"><button type="button" tabindex="-1" class="ld-swipe__action" data-act="archive">Archive</button><button type="button" tabindex="-1" class="ld-swipe__action ld-swipe__action--danger" data-act="delete">Delete</button></div>
        <div class="ld-swipe__content ld-context-target">
          <div class="ld-swipe__main"><strong${m.read ? "" : " data-unread"}>${esc(m.from)}</strong><p>${esc(m.subject)}</p></div>
          <button type="button" class="ld-icon-btn ld-swipe__menu" aria-label="${label}" title="${label}" aria-haspopup="menu" aria-expanded="false" popovertarget="menu-${m.id}" style="anchor-name: --menu-${m.id}">${DOTS}</button>
          <div class="ld-menu" id="menu-${m.id}" role="menu" popover="auto" aria-label="${label}" style="position-anchor: --menu-${m.id}">
            ${menuItem("read", m.read ? "Mark as unread" : "Mark as read")}${menuItem("archive", "Archive")}<div role="separator" class="ld-menu__separator"></div>${menuItem("delete", "Delete", true)}
          </div></div></div></li>`;
    })
    .join("");
  stops = [...inbox.querySelectorAll(".ld-swipe")].map((row) =>
    createSwipe(row, { full: ["trailing"], onFullSwipe: (side) => act(row.closest("li").dataset.id, side === "leading" ? "read" : "delete") }),
  );
  inbox.querySelector(`[data-id="${focusId}"] .ld-swipe__menu`)?.focus();
};
function act(id, what, fromMenu) {
  const at = mail.findIndex((m) => m.id === id);
  const m = mail[at];
  if (!m) return;
  if (what === "read") {
    m.read = !m.read;
    return renderInbox(fromMenu && id);
  }
  // gone at once; the commit (a request, in an app) waits out the undo window
  mail = mail.filter((x) => x !== m);
  renderInbox(fromMenu && (mail[at] ?? mail[at - 1])?.id);
  const undo = scheduleUndoable({ commit: () => {}, undo: () => (mail.splice(at, 0, m), renderInbox()) });
  toast(`${what === "delete" ? "Deleted" : "Archived"} ${m.from}'s message`, undo);
}
inbox.addEventListener("click", (e) => {
  const item = e.target.closest("[data-act]");
  if (item) act(e.target.closest("li").dataset.id, item.dataset.act, item.matches('[role="menuitem"]'));
});
// the menus: first item on open, arrows and Home/End, Escape and Tab close
inbox.addEventListener("toggle", (e) => {
  if (!e.target.matches(".ld-menu")) return;
  const button = e.target.previousElementSibling;
  button.setAttribute("aria-expanded", String(e.newState === "open"));
  if (e.newState !== "open") return;
  if (!ANCHORING) {
    const p = placeBeside(button.getBoundingClientRect(), e.target.getBoundingClientRect(), { width: innerWidth, height: innerHeight }, { side: "bottom" });
    Object.assign(e.target.style, { left: `${p.x}px`, top: `${p.y}px` });
  }
  e.target.querySelector('[role="menuitem"]').focus();
}, true);
inbox.addEventListener("keydown", (e) => {
  const menu = e.target.closest(".ld-menu");
  if (!menu) return;
  const items = [...menu.querySelectorAll('[role="menuitem"]')];
  const to = menuMove(items.length, items.indexOf(document.activeElement), e.key);
  if (to !== undefined) (e.preventDefault(), items[to].focus());
  else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), document.activeElement.click());
  else if (e.key === "Escape" || e.key === "Tab") (e.key === "Escape" && e.preventDefault(), menu.hidePopover(), menu.previousElementSibling.focus());
});
renderInbox();
