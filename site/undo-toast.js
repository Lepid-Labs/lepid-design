// A one-toast vanilla twin of the React Toaster for the data demo: a success toast
// with an optional Undo (a scheduleUndoable handle) and its countdown. Undo runs
// the handle's undo; closing any other way (timeout, Dismiss, leaving) commits.
// The toast's clock and the undo window stop together while it is hovered or
// focused. Focus goes to `returnFocus` when the toast's own button closes it.
const CROSS = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 5l6 6M11 5l-6 6"/></svg>`;
const el = (html) => Object.assign(document.createElement("template"), { innerHTML: html.trim() }).content.firstElementChild;
let returnFocus;
export const toastReturnFocus = (node) => (returnFocus = node);

let current;
export function toast(message, undo) {
  const toaster = document.getElementById("toaster");
  current?.close("replaced");
  const node = el(`<div class="ld-toast ld-toast--success" role="group" aria-label="${message}">
    <div class="ld-toast__body"><div class="ld-toast__message">${message}</div></div>
    ${undo ? `<button type="button" class="ld-btn ld-btn--sm ld-toast__action">Undo</button>` : ""}
    <button type="button" class="ld-icon-btn ld-toast__close" aria-label="Dismiss" title="Dismiss">${CROSS}</button>
    ${undo ? `<span class="ld-toast__countdown" aria-hidden="true" style="--ld-toast-duration: ${undo.delay}ms"></span>` : ""}</div>`);
  let left = undo?.delay ?? 5000;
  let since = Date.now();
  let timer = setTimeout(() => me.close("timeout"), left);
  const me = (current = {
    close(reason) {
      clearTimeout(timer);
      node.remove();
      toaster.removeAttribute("data-ld-paused");
      if (current === me) current = undefined;
      reason === "undo" ? undo?.undo() : undo?.flush();
    },
  });
  node.querySelector(".ld-toast__action")?.addEventListener("click", () => (returnFocus?.focus(), me.close("undo")));
  node.querySelector(".ld-toast__close").addEventListener("click", () => (returnFocus?.focus(), me.close("dismiss")));
  // the toast's clock and the undo window stop together while it is hovered or focused
  let holds = 0;
  const pause = (on) => {
    holds += on ? 1 : -1;
    if (on && holds === 1) {
      clearTimeout(timer);
      left -= Date.now() - since;
      undo?.pause();
    } else if (!on && holds === 0) {
      since = Date.now();
      timer = setTimeout(() => me.close("timeout"), left);
      undo?.resume();
    }
    toaster.toggleAttribute("data-ld-paused", holds > 0);
  };
  node.addEventListener("pointerenter", () => pause(true));
  node.addEventListener("pointerleave", () => pause(false));
  node.addEventListener("focusin", () => pause(true));
  node.addEventListener("focusout", () => pause(false));
  toaster.replaceChildren(node);
  document.getElementById("toast-said").textContent = `${message}${undo ? " (Undo)" : ""}`;
}
addEventListener("pagehide", () => current?.close("unload"));

