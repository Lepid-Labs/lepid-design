// No-build demo of the feedback components. It drives plain markup with the
// same pure helpers the React components use (built into ui/ by the Pages
// workflow; locally, symlink site/ui to components/react/dist after a build).
// The toast part is a small vanilla twin of the React Toaster.
import { autosave, autosaveState, saveStatus, savedAgo, shouldAnnounceSave } from "./ui/autosave-state.js";
import { loadingIndicator, trackLoading } from "./ui/loading-delay.js";
import {
  addToast, dismissToast, expiredToasts, nextToastExpiry, pauseToasts, toastDuration, toastQueue, visibleToasts,
} from "./ui/toast-queue.js";
import { scheduleUndoable } from "./ui/undoable.js";

const $ = (id) => document.getElementById(id);
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

// Loading: nothing under the delay, then a skeleton that never flashes
const people = $("people");
const PEOPLE = [["AL", "Ada Lovelace", "Analyst"], ["GH", "Grace Hopper", "Compilers"], ["KJ", "Katherine Johnson", "Orbits"]];
const results = () =>
  el(`<ul>${PEOPLE.map(([i, n, r]) => `<li class="person"><span class="ld-badge ld-badge--primary">${i}</span><span>${n} · ${r}</span></li>`).join("")}</ul>`);
let win, loadTimer, skeletonSince;
function paintPeople() {
  const now = Date.now();
  const { visible, next } = loadingIndicator(win, now);
  if (visible && skeletonSince === undefined) {
    skeletonSince = now;
    people.replaceChildren(...PEOPLE.map(() => $("people-skeleton").content.cloneNode(true)));
  } else if (!visible && win?.end !== undefined && people.hasAttribute("aria-busy")) {
    people.replaceChildren(results());
    people.removeAttribute("aria-busy");
    $("load-log").textContent = skeletonSince === undefined
      ? `Loaded in ${win.end - win.start} ms: no indicator shown.`
      : `Loaded in ${win.end - win.start} ms; the skeleton showed for ${now - skeletonSince} ms.`;
    skeletonSince = undefined;
  }
  clearTimeout(loadTimer);
  if (next !== undefined) loadTimer = setTimeout(paintPeople, Math.max(0, next - Date.now()));
}
people.replaceChildren(results());
for (const button of document.querySelectorAll("[data-load]")) {
  button.addEventListener("click", () => {
    if (people.hasAttribute("aria-busy")) return;
    people.setAttribute("aria-busy", "true"); // the old list stays until there is something better to show
    win = trackLoading(win, true, Date.now());
    paintPeople();
    setTimeout(() => {
      win = trackLoading(win, false, Date.now());
      paintPeople();
    }, Number(button.dataset.load));
  });
}

// Toasts: the queue, clocks and pause logic are the pure helpers; this is the view
let q = toastQueue();
let stack = null; // the <section>, present only while toasts show
let hovered = false, focused = false, back = null, expiry, seq = 0;
const nodes = new Map(); // id -> { el, said }
const polite = el(`<div role="status" aria-atomic="false" class="sr-only"></div>`);
const assertive = el(`<div role="alert" aria-atomic="false" class="sr-only"></div>`);
document.body.append(polite, assertive);
const CROSS = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>`;

function update(next) {
  q = next;
  for (const t of q.items) t.data.undo?.[t.runningSince === undefined ? "pause" : "resume"]();
  render();
}
const syncPause = () => update(pauseToasts(q, document.hidden || (!!stack && (hovered || focused)), Date.now()));
document.addEventListener("visibilitychange", syncPause);

function render() {
  const shown = visibleToasts(q);
  for (const [id, node] of nodes) {
    if (shown.some((t) => t.id === id)) continue;
    node.el.remove();
    node.said.remove();
    nodes.delete(id);
  }
  if (!shown.length && stack) {
    stack.remove();
    stack = null;
    hovered = focused = false;
    q = pauseToasts(q, document.hidden, Date.now());
  }
  if (shown.length && !stack) document.body.append((stack = makeStack()));
  for (const t of shown) {
    if (nodes.has(t.id)) continue;
    const node = makeToast(t);
    nodes.set(t.id, node);
    stack.append(node.el);
    (t.data.variant === "danger" ? assertive : polite).append(node.said);
  }
  stack?.toggleAttribute("data-ld-paused", q.paused);
  clearTimeout(expiry);
  const wait = nextToastExpiry(q, Date.now());
  if (wait === undefined) return;
  expiry = setTimeout(() => {
    const ids = expiredToasts(q, Date.now());
    if (ids.length) ids.forEach((id) => close(id, "timeout"));
    else render();
  }, wait);
}

function makeStack() {
  const s = el(`<section class="ld-toaster" aria-label="Notifications (F8)"></section>`);
  s.addEventListener("pointerenter", () => ((hovered = true), syncPause()));
  s.addEventListener("pointerleave", () => ((hovered = false), syncPause()));
  s.addEventListener("focusin", () => ((focused = true), syncPause()));
  s.addEventListener("focusout", (e) => !s.contains(e.relatedTarget) && ((focused = false), syncPause()));
  return s;
}

function makeToast(t) {
  const { title, message, variant = "info", action, undo } = t.data;
  const label = undo ? "Undo" : action?.label;
  const node = el(`<div class="ld-toast ld-toast--${variant}" role="group" aria-labelledby="toast-${t.id}">
    <div class="ld-toast__body" id="toast-${t.id}">${title ? `<div class="ld-toast__title">${title}</div>` : ""}<div class="ld-toast__message">${message}</div></div>
    ${label ? `<button type="button" class="ld-btn ld-btn--sm ld-toast__action">${label}</button>` : ""}
    <button type="button" class="ld-icon-btn ld-toast__close" aria-label="Dismiss" title="Dismiss">${CROSS}</button>
    ${label && t.duration !== null ? `<span class="ld-toast__countdown" aria-hidden="true" style="--ld-toast-duration: ${t.duration}ms"></span>` : ""}
  </div>`);
  node.querySelector(".ld-toast__action")?.addEventListener("click", () => closeFrom(t.id, "action", node));
  node.querySelector(".ld-toast__close").addEventListener("click", () => closeFrom(t.id, "dismiss", node));
  node.addEventListener("keydown", (e) => e.key === "Escape" && (e.stopPropagation(), closeFrom(t.id, "dismiss", node)));
  return { el: node, said: el(`<p>${title ? `${title} ` : ""}${message}${label ? ` (${label}, F8)` : ""}</p>`) };
}

function toast(options) {
  const id = `t${++seq}`;
  const duration = options.undo
    ? options.undo.delay
    : toastDuration({ variant: options.variant, duration: options.duration, hasAction: !!options.action });
  update(addToast(q, { id, duration, data: options }, Date.now()));
}

function close(id, reason) {
  const item = q.items.find((t) => t.id === id);
  if (!item) return;
  update(dismissToast(q, id, Date.now()));
  const { undo, action } = item.data;
  if (reason !== "action") undo?.flush();
  else if (undo) undo.undo();
  else action?.onAction();
}

// keyboard users land on the next toast or back where F8 took them; a click lets focus go
function closeFrom(id, reason, node) {
  const active = document.activeElement;
  if (node.contains(active)) {
    const others = [...stack.querySelectorAll(".ld-toast")].filter((t) => t !== node);
    const next = active.matches(":focus-visible") ? (others.at(-1)?.querySelector("button") ?? back) : null;
    next?.isConnected ? next.focus() : active.blur();
  }
  close(id, reason);
}

addEventListener("keydown", (e) => {
  if (e.key !== "F8" || !stack) return;
  e.preventDefault();
  if (!stack.contains(document.activeElement)) back = document.activeElement;
  [...stack.querySelectorAll(".ld-toast")].at(-1)?.querySelector("button")?.focus();
});
addEventListener("pagehide", () => q.items.forEach((t) => t.data.undo?.flush()));

const SAMPLES = {
  info: { message: "A new version is ready; it applies on your next visit." },
  success: { variant: "success", title: "Deployed", message: "web-frontend v2.4.1 is live." },
  warning: { variant: "warning", message: "Build minutes are at 85% of this month's quota." },
  danger: { variant: "danger", title: "Deploy failed", message: "The health check timed out after 60 s." },
  action: { message: "Invite sent to the design team.", action: { label: "View", onAction: () => {} } },
};
for (const b of document.querySelectorAll("[data-toast]")) b.addEventListener("click", () => toast(SAMPLES[b.dataset.toast]));

// Undo: archive at once, commit when the toast closes without an undo
const mail = ["Weekly report", "Invoice #4471", "Standup notes", "Offsite agenda"].map((subject) => ({ subject, archived: false }));
const inbox = $("inbox");
const undoLog = (text) => ($("undo-log").textContent = text);
function paintInbox(focusAt) {
  const rows = mail.filter((m) => !m.archived).map((m) => {
    const li = el(`<li><span>${m.subject}</span><button type="button" class="ld-btn ld-btn--sm">Archive</button></li>`);
    li.querySelector("button").addEventListener("click", () => archive(m));
    return li;
  });
  inbox.replaceChildren(...rows);
  if (!rows.length) inbox.append(el(`<li style="display: block"><div class="ld-empty ld-empty--cleared"><h3 class="ld-empty__title">Inbox zero</h3></div></li>`));
  if (focusAt !== undefined) inbox.querySelectorAll("button")[Math.min(focusAt, rows.length - 1)]?.focus();
}
function archive(m) {
  const at = mail.filter((x) => !x.archived).indexOf(m);
  m.archived = true;
  paintInbox(document.activeElement?.closest("#inbox") ? at : undefined);
  const undo = scheduleUndoable({
    commit: () => undoLog(`“${m.subject}” archived for good.`),
    undo: () => ((m.archived = false), paintInbox(), undoLog(`“${m.subject}” is back.`)),
  });
  toast({ message: `Archived “${m.subject}”.`, undo });
}
paintInbox();

// Autosave: the state machine decides; this wires timers, a fake request and the view
const LABELS = {
  idle: "", pending: "Unsaved changes", saving: "Saving…", saved: "Saved",
  offline: "Offline: changes will save when you reconnect", error: "Changes not saved",
};
const save = $("save");
const online = () => navigator.onLine && !$("sim-offline").checked;
let s = autosaveState({ online: online() });
let dueTimer, lastSaid;
function send(e) {
  const prev = s;
  s = autosave(s, e);
  if (s.dueAt !== prev.dueAt) {
    clearTimeout(dueTimer);
    const at = s.dueAt;
    if (at !== undefined) dueTimer = setTimeout(() => send({ type: "due", at }), Math.max(0, at - Date.now()));
  }
  if (s.attempt !== prev.attempt) {
    fakeSave().then(() => send({ type: "saved", now: Date.now() }), () => send({ type: "failed", now: Date.now() }));
  }
  paintSave();
}
function fakeSave() {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (!online()) return reject(new Error("offline"));
      if ($("sim-fail").checked) return ($("sim-fail").checked = false), reject(new Error("server error"));
      resolve();
    }, 700),
  );
}
function paintSave() {
  const status = saveStatus(s);
  const ago = status === "saved" ? savedAgo(s.savedAt, Date.now()) : "";
  save.dataset.ldSave = status;
  save.querySelector(".ld-save-status__text").textContent = LABELS[status] + (ago && ` ${ago}`);
  save.querySelector(".ld-save-status__retry").style.display = status === "error" ? "" : "none";
  if (shouldAnnounceSave(lastSaid, status)) {
    lastSaid = status;
    save.querySelector('[role="status"]').textContent = LABELS[status];
  }
}
const connectivity = () => send(online() ? { type: "online", now: Date.now() } : { type: "offline" });
$("draft").addEventListener("input", () => send({ type: "edit", now: Date.now() }));
save.querySelector(".ld-save-status__retry").addEventListener("click", () => send({ type: "retry", now: Date.now() }));
$("sim-offline").addEventListener("change", connectivity);
addEventListener("online", connectivity);
addEventListener("offline", connectivity);
addEventListener("beforeunload", (e) => (s.dirty || s.inFlight) && e.preventDefault());
setInterval(paintSave, 30_000);
paintSave();
