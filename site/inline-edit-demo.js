// Plain-JS stand-in for the React InlineEdit, shared by surfaces.html and
// layout-settings.html. The state machine (ui/inline-edit.js) decides; this
// swaps the button and input, runs the save, and moves focus.
import { INLINE_EDIT_SAVED_MS, inlineEdit, inlineEditKey, inlineEditState } from "./ui/inline-edit.js";

let seq = 0;

/** Turn `root` (an empty .ld-inline-edit) into an editor. `save(value)` returns a promise. */
export function inlineEditor(root, { label, value, save, validate, multiline = false, placeholder = "", type = "text" }) {
  const id = `ie-${++seq}`;
  let s = inlineEditState(value);
  let returnFocus = false;
  let height;
  let settle;
  root.classList.toggle("ld-inline-edit--multiline", multiline);
  root.innerHTML = `<p class="ld-field__message ld-field__message--error" id="${id}-message" aria-live="polite"></p>
    <span class="sr-only" role="status"></span>`;
  const message = root.firstElementChild;
  const status = root.lastElementChild;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "ld-inline-edit__display";
  trigger.innerHTML = `<span class="sr-only">Edit ${label}: </span><span class="ld-inline-edit__text"></span><span class="ld-inline-edit__icon" aria-hidden="true"></span>`;
  const field = document.createElement(multiline ? "textarea" : "input");
  if (!multiline) field.type = type;
  Object.assign(field, { className: "ld-inline-edit__input", id, placeholder });
  field.setAttribute("aria-label", label);

  function send(e) {
    const prev = s;
    s = inlineEdit(s, e);
    if (s === prev) return;
    if (s.mode === "saving" && prev.mode !== "saving") {
      Promise.resolve(save(s.draft)).then(() => send({ type: "saved" }), (err) => send({ type: "failed", error: err?.message || "Couldn't save. Try again." }));
    }
    if (s.saved && !prev.saved) settle = setTimeout(() => send({ type: "settle" }), INLINE_EDIT_SAVED_MS);
    if (!s.saved) clearTimeout(settle);
    paint(prev);
  }

  function paint(prev) {
    const open = s.mode === "editing" || s.mode === "error";
    const wasOpen = prev && (prev.mode === "editing" || prev.mode === "error");
    root.dataset.ldEdit = s.mode;
    root.toggleAttribute("data-ld-saved", !!s.saved);
    message.textContent = s.mode === "error" ? s.error : "";
    status.textContent = s.mode === "saving" ? "Saving" : s.saved ? "Saved" : "";
    const shown = s.mode === "saving" ? s.draft : s.value;
    const text = trigger.querySelector(".ld-inline-edit__text");
    text.textContent = shown || placeholder;
    text.classList.toggle("ld-inline-edit__text--empty", !shown);
    trigger.toggleAttribute("aria-busy", s.mode === "saving");
    if (field.value !== s.draft) field.value = s.draft;
    for (const attr of ["aria-invalid", "aria-describedby", "aria-errormessage"]) {
      if (s.mode !== "error") field.removeAttribute(attr);
      else field.setAttribute(attr, attr === "aria-invalid" ? "true" : message.id);
    }
    if (!prev || open === wasOpen) return;
    const at = document.activeElement;
    const ours = !at || at === document.body || at === trigger;
    (open ? trigger : field).replaceWith(open ? field : trigger);
    if (open) {
      if (multiline) field.style.minHeight = `${height}px`;
      // a save that fails after the reader moved on must not pull focus back
      if (ours) field.focus(), field.select();
    } else if (returnFocus) {
      returnFocus = false;
      trigger.focus();
    }
  }

  function commit(focusBack) {
    if (s.mode !== "editing" && s.mode !== "error") return;
    const refused = validate?.(s.draft);
    if (refused) return send({ type: "failed", error: refused });
    returnFocus = focusBack;
    send({ type: "commit" });
  }

  trigger.addEventListener("click", () => ((height = trigger.offsetHeight), send({ type: "start" })));
  trigger.addEventListener("keydown", (e) => e.key === "F2" && (e.preventDefault(), (height = trigger.offsetHeight), send({ type: "start" })));
  field.addEventListener("input", () => send({ type: "change", draft: field.value }));
  field.addEventListener("blur", () => commit(false));
  field.addEventListener("keydown", (e) => {
    const act = inlineEditKey(e, multiline);
    if (!act) return;
    e.preventDefault();
    e.stopPropagation();
    if (act === "commit") return commit(true);
    returnFocus = true;
    send({ type: "cancel" });
  });

  root.prepend(trigger);
  paint();
}

/** A fake request: resolves after `ms`, or rejects with `reason()` when it returns one. */
export const fakeRequest = (ms, reason = () => "") => () =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const why = reason();
      why ? reject(new Error(why)) : resolve();
    }, ms),
  );
