// No-build demo of the settings system: inline edits for identity fields, autosave
// with a SaveStatus per section for preferences (ui/autosave-state.js), reset for a
// changed preference, an explicit button for the password, a type-the-name confirm
// for the danger zone, and a section nav that follows the scroll.
import { autosave, autosaveState, saveStatus, savedAgo, shouldAnnounceSave } from "./ui/autosave-state.js";
import { fakeRequest, inlineEditor } from "./inline-edit-demo.js";

const $ = (id) => document.getElementById(id);

// Profile: identity fields save on Enter or blur, one at a time
inlineEditor($("name"), {
  label: "Display name",
  value: "Ada Lovelace",
  save: fakeRequest(600),
  validate: (v) => (v.trim() ? undefined : "Your name can't be empty."),
});
inlineEditor($("email"), {
  label: "Email",
  value: "ada@example.com",
  type: "email",
  save: (v) => fakeRequest(800, () => (v.startsWith("taken@") ? "That address belongs to another account." : ""))(),
  validate: (v) => (/^\S+@\S+\.\S+$/.test(v) ? undefined : "Enter an address like name@example.com."),
});
inlineEditor($("bio"), {
  label: "Bio",
  value: "",
  placeholder: "Add a line about yourself",
  multiline: true,
  save: fakeRequest(600),
});

// Preferences: every change autosaves; one SaveStatus per section says where it stands
const LABELS = {
  idle: "", pending: "Unsaved changes", saving: "Saving…", saved: "Saved",
  offline: "Offline: changes will save when you reconnect", error: "Changes not saved",
};
for (const section of document.querySelectorAll("[data-autosave]")) {
  const status = section.querySelector(".ld-save-status");
  const retry = status.querySelector(".ld-save-status__retry");
  let s = autosaveState({ online: navigator.onLine });
  let timer, said;
  const paint = () => {
    const kind = saveStatus(s);
    const ago = kind === "saved" ? savedAgo(s.savedAt, Date.now()) : "";
    status.dataset.ldSave = kind;
    status.querySelector(".ld-save-status__text").textContent = LABELS[kind] + (ago && ` ${ago}`);
    retry.style.display = kind === "error" ? "" : "none";
    if (shouldAnnounceSave(said, kind)) status.querySelector('[role="status"]').textContent = LABELS[(said = kind)];
  };
  const send = (e) => {
    const prev = s;
    s = autosave(s, e);
    if (s.dueAt !== prev.dueAt) {
      clearTimeout(timer);
      if (s.dueAt !== undefined) timer = setTimeout(() => send({ type: "due", at: s.dueAt }), Math.max(0, s.dueAt - Date.now()));
    }
    if (s.attempt !== prev.attempt) fakeRequest(700)().then(() => send({ type: "saved", now: Date.now() }), () => send({ type: "failed", now: Date.now() }));
    paint();
  };
  section.addEventListener("change", () => send({ type: "edit", now: Date.now() }));
  retry.addEventListener("click", () => send({ type: "retry", now: Date.now() }));
  addEventListener("online", () => send({ type: "online", now: Date.now() }));
  addEventListener("offline", () => send({ type: "offline" }));
  setInterval(paint, 30_000);
  paint();
}

// Modified from the default: a badge by the label and a Reset that reverts this one only
const valueOf = (c) => (c.type === "checkbox" ? String(c.checked) : c.value);
for (const control of document.querySelectorAll("[data-default]")) {
  const row = control.closest(".ld-settings__row");
  const badge = Object.assign(document.createElement("span"), { className: "ld-badge ld-badge--sm", textContent: "Modified" });
  badge.style.justifySelf = "start";
  const reset = Object.assign(document.createElement("button"), { type: "button", className: "ld-btn ld-btn--sm", textContent: "Reset" });
  const name = row.querySelector(".ld-label").textContent;
  reset.setAttribute("aria-label", `Reset ${name.toLowerCase()} to ${control.dataset.default === "false" ? "off" : control.dataset.default}`);
  const paint = () => {
    const changed = valueOf(control) !== control.dataset.default;
    if (changed && !badge.isConnected) row.querySelector(".ld-settings__label").append(badge), control.after(reset);
    if (!changed && badge.isConnected) badge.remove(), reset.remove();
  };
  control.addEventListener("change", paint);
  reset.addEventListener("click", () => {
    if (control.type === "checkbox") control.checked = control.dataset.default === "true";
    else control.value = control.dataset.default;
    control.focus(); // the button is about to go
    control.dispatchEvent(new Event("change", { bubbles: true })); // autosaves the reset too
  });
}

// Password: reveal toggles, and an explicit Update that shows it is busy
for (const field of document.querySelectorAll("[data-password]")) {
  const input = field.querySelector("input");
  const toggle = field.querySelector(".ld-password__toggle");
  toggle.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus and caret in the input
  toggle.addEventListener("click", () => {
    const shown = input.type === "password";
    input.type = shown ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(shown));
    toggle.querySelector("path:last-child").setAttribute("display", shown ? "inline" : "none");
  });
}
$("password-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const submit = $("p-submit");
  if (submit.getAttribute("aria-busy")) return;
  const next = $("p-new");
  const short = next.value.length < 12;
  $("p-new-message").textContent = short ? "Use at least 12 characters." : "";
  for (const [attr, v] of [["aria-invalid", "true"], ["aria-errormessage", "p-new-message"]]) short ? next.setAttribute(attr, v) : next.removeAttribute(attr);
  if (short) return next.focus();
  submit.setAttribute("aria-busy", "true");
  $("p-status").textContent = "Updating password";
  fakeRequest(900)().then(() => {
    submit.removeAttribute("aria-busy");
    $("p-status").textContent = "Password updated";
    e.target.reset();
    e.target.querySelector(".ld-settings__hint").textContent = "Changed just now.";
  });
});

// Danger zone: the delete stays aria-disabled, with its reason, until the name is typed
const dialog = $("del-dialog");
const confirmInput = $("del-confirm");
const del = $("del-submit");
const matches = () => confirmInput.value.trim() === "acme-web";
$("del-open").addEventListener("click", () => {
  $("del-form").reset();
  confirmInput.dispatchEvent(new Event("input"));
  dialog.showModal();
});
$("del-cancel").addEventListener("click", () => dialog.close());
confirmInput.addEventListener("input", () => {
  matches() ? del.removeAttribute("aria-disabled") : del.setAttribute("aria-disabled", "true");
  $("del-reason").textContent = matches() ? "" : "Type the workspace name first.";
});
$("del-form").addEventListener("submit", (e) => {
  if (!matches()) return e.preventDefault();
  $("del-done").textContent = "Deletion scheduled. (Demo: nothing was deleted.)";
});
dialog.addEventListener("close", () => $("del-open").focus());

// Section nav: the last section whose top has passed the upper third of the view is
// current (the last one, once the page can't scroll further)
const links = [...document.querySelectorAll(".ld-settings__link")];
const sections = [...document.querySelectorAll(".ld-settings__section")];
const mark = (id) => links.forEach((a) => (a.hash === `#${id}` ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
const spy = new IntersectionObserver(() => {
  const page = document.scrollingElement;
  const atEnd = page.scrollTop > 0 && page.scrollTop + innerHeight >= page.scrollHeight - 2;
  const passed = sections.filter((s) => s.getBoundingClientRect().top <= innerHeight * 0.3);
  mark((atEnd ? sections.at(-1) : passed.at(-1) ?? sections[0]).id);
}, { rootMargin: "0px 0px -70% 0px" });
sections.forEach((s) => spy.observe(s));
