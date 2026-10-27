// No-build demo of Tooltip, Menu, ContextMenu and Sheet. It drives plain markup with
// the same pure helpers the React components use (built into ui/ by the Pages
// workflow; locally, symlink site/ui to components/react/dist after a build).
import { placeAtPoint, placeBeside } from "./ui/floating.js";
import { LONG_PRESS_MS, LONG_PRESS_SLOP, menuMove, menuTypeahead, typeaheadBuffer } from "./ui/menu-nav.js";
import { sheetOffset, shouldDismissSheet } from "./ui/sheet-drag.js";
import { TOOLTIP_HIDE_MS, tooltipDelay } from "./ui/tooltip-state.js";

const $ = (id) => document.getElementById(id);
const ANCHORING = CSS.supports("anchor-name: --ld-a");
const viewport = () => ({ width: innerWidth, height: innerHeight });
const shown = (el) => el.matches(":popover-open");

// Tooltips: when one last closed, so moving along the toolbar hands off at once
let lastHiddenAt;
let tipSeq = 0;
for (const trigger of document.querySelectorAll("[data-tip]")) {
  const id = `tip-${++tipSeq}`;
  const tip = Object.assign(document.createElement("span"), { id, className: "ld-tooltip", textContent: trigger.dataset.tip });
  tip.setAttribute("role", "tooltip");
  tip.popover = "hint";
  if (tip.popover !== "hint") tip.popover = "manual";
  tip.dataset.ldSide = trigger.dataset.tipSide ?? "top";
  trigger.after(tip);
  trigger.setAttribute(trigger.dataset.tipKind === "label" ? "aria-labelledby" : "aria-describedby", id);
  trigger.style.anchorName = `--${id}`;
  tip.style.positionAnchor = `--${id}`;
  let timer;
  const reveal = () => {
    if (shown(tip)) return;
    tip.showPopover();
    if (ANCHORING) return;
    const at = placeBeside(trigger.getBoundingClientRect(), tip.getBoundingClientRect(), viewport(), { side: tip.dataset.ldSide, align: "center", gap: 6 });
    Object.assign(tip.style, { left: `${at.x}px`, top: `${at.y}px` });
    tip.dataset.ldSide = at.side;
  };
  const conceal = () => (clearTimeout(timer), shown(tip) && tip.hidePopover());
  const show = (wait) => (clearTimeout(timer), (timer = setTimeout(reveal, wait)));
  const hide = () => (clearTimeout(timer), (timer = setTimeout(conceal, TOOLTIP_HIDE_MS)));
  const delay = () => tooltipDelay(Date.now(), { open: !!document.querySelector(".ld-tooltip:popover-open"), lastHiddenAt });
  trigger.addEventListener("pointerenter", (e) => e.pointerType !== "touch" && show(delay()));
  trigger.addEventListener("pointerleave", hide);
  trigger.addEventListener("pointerdown", conceal);
  trigger.addEventListener("focus", () => trigger.matches(":focus-visible") && show(delay()));
  trigger.addEventListener("blur", conceal);
  if (trigger.hasAttribute("data-tip-tap")) trigger.addEventListener("click", () => show(0)); // a blocked button says why
  tip.addEventListener("pointerenter", () => clearTimeout(timer));
  tip.addEventListener("pointerleave", hide);
  tip.addEventListener("toggle", (e) => e.newState !== "open" && (lastHiddenAt = Date.now()));
  document.addEventListener("keydown", (e) => e.key === "Escape" && shown(tip) && (e.preventDefault(), conceal()), true);
}

// Menus: roving focus, typeahead, Escape and Tab; one handler for both kinds
const ITEMS = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
const log = (text) => ($("menu-log").textContent = text);
function wireMenu(menu, back) {
  let typed;
  const items = () => [...menu.querySelectorAll(ITEMS)];
  const close = (refocus) => (shown(menu) && menu.hidePopover(), refocus && back()?.focus());
  const activate = (item, stayOpen) => {
    if (item.getAttribute("aria-disabled") === "true") return;
    const role = item.getAttribute("role");
    if (role === "menuitemcheckbox") item.setAttribute("aria-checked", String(item.getAttribute("aria-checked") !== "true"));
    if (role === "menuitemradio")
      for (const r of item.closest('[role="group"]').querySelectorAll('[role="menuitemradio"]')) r.setAttribute("aria-checked", String(r === item));
    log(`Chose “${item.querySelector(".ld-menu__label").textContent}”.`);
    if (!(stayOpen && role !== "menuitem")) close(true);
  };
  menu.addEventListener("keydown", (e) => {
    const list = items();
    const current = list.indexOf(document.activeElement);
    const to = menuMove(list.length, current, e.key);
    if (to !== undefined) (e.preventDefault(), list[to].focus());
    else if (e.key === "Escape") (e.preventDefault(), close(true));
    else if (e.key === "Tab") close(true);
    else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), current >= 0 && activate(list[current], e.key === " "));
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typed = typeaheadBuffer(typed, e.key, Date.now());
      const at = menuTypeahead(list.map((i) => i.textContent), current, typed.text);
      if (at >= 0) list[at].focus();
    }
  });
  menu.addEventListener("click", (e) => e.target.closest(ITEMS) && activate(e.target.closest(ITEMS), false));
  menu.addEventListener("pointermove", (e) => e.target.closest(ITEMS)?.focus());
  return { items, close };
}

for (const button of document.querySelectorAll("[popovertarget][aria-haspopup='menu']")) {
  const menu = $(button.getAttribute("popovertarget"));
  const { items } = wireMenu(menu, () => button);
  let last = false;
  button.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    last = e.key === "ArrowUp";
    if (!shown(menu)) menu.showPopover();
  });
  menu.addEventListener("toggle", (e) => {
    button.setAttribute("aria-expanded", String(e.newState === "open"));
    if (e.newState !== "open") return;
    if (!ANCHORING) {
      const at = placeBeside(button.getBoundingClientRect(), menu.getBoundingClientRect(), viewport());
      Object.assign(menu.style, { left: `${at.x}px`, top: `${at.y}px` });
    }
    (last ? items().at(-1) : items()[0])?.focus();
    last = false;
  });
}

// Context menu: the Actions menu's items, opened at the pointer and kept on screen
const files = $("files");
const fileMenu = $("file-menu");
fileMenu.innerHTML = $("actions-menu").innerHTML;
let before = null;
let press;
const ctx = wireMenu(fileMenu, () => before);
const openAt = (x, y) => {
  if (shown(fileMenu)) return;
  before = document.activeElement;
  fileMenu.showPopover();
  const at = placeAtPoint({ x, y }, fileMenu.getBoundingClientRect(), viewport());
  Object.assign(fileMenu.style, { left: `${at.x}px`, top: `${at.y}px` });
  ctx.items()[0]?.focus();
};
const cancelPress = () => (clearTimeout(press?.timer), (press = undefined));
files.addEventListener("contextmenu", (e) => (e.preventDefault(), cancelPress(), openAt(e.clientX, e.clientY)));
files.addEventListener("keydown", (e) => {
  if (e.key !== "ContextMenu" && !(e.shiftKey && e.key === "F10")) return;
  e.preventDefault();
  const r = e.target.getBoundingClientRect();
  openAt(r.left, r.bottom);
});
files.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "touch") return;
  cancelPress();
  press = { x: e.clientX, y: e.clientY, timer: setTimeout(() => openAt(e.clientX, e.clientY), LONG_PRESS_MS) };
});
files.addEventListener("pointermove", (e) => press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > LONG_PRESS_SLOP && cancelPress());
files.addEventListener("pointerup", cancelPress);
files.addEventListener("pointercancel", cancelPress);

// Sheets: backdrop click and Escape close; the bottom sheet's handle drags it away
for (const button of document.querySelectorAll("[data-sheet]")) button.addEventListener("click", () => $(button.dataset.sheet).showModal());
for (const dialog of document.querySelectorAll(".ld-dialog--sheet, .ld-dialog--drawer")) {
  dialog.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return dialog.close();
    const r = dialog.getBoundingClientRect();
    const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (e.target === dialog && outside) dialog.close();
  });
  const handle = dialog.querySelector(".ld-dialog__handle");
  if (!handle) continue;
  let drag;
  handle.addEventListener("pointerdown", (e) => {
    handle.setPointerCapture(e.pointerId);
    drag = { start: e.clientY, y: e.clientY, t: e.timeStamp, v: 0 };
    dialog.style.transition = "none";
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag) return;
    drag.v = (e.clientY - drag.y) / Math.max(1, e.timeStamp - drag.t);
    Object.assign(drag, { y: e.clientY, t: e.timeStamp });
    dialog.style.translate = `0 ${sheetOffset(e.clientY - drag.start)}px`;
  });
  const release = (e) => {
    if (!drag) return;
    const offset = sheetOffset(e.clientY - drag.start);
    const v = drag.v;
    drag = undefined;
    dialog.style.removeProperty("transition");
    dialog.style.removeProperty("translate");
    if (e.type === "pointerup" && shouldDismissSheet({ offset, height: dialog.offsetHeight, velocity: v })) dialog.close();
  };
  handle.addEventListener("pointerup", release);
  handle.addEventListener("pointercancel", release);
}
