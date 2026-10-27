// Shared happy-dom harness for the render tests (*.render.test.mjs). Importing it installs a
// browser window on globalThis, then loads react-dom against it; every test file that renders
// imports this first. Mounted roots are unmounted after each test.
//
// Render tests import the built package (../dist), not ../src: Node's type stripping runs .ts
// but cannot transform JSX, so the `test` script runs `tsc` before `node --test`.
import { after, afterEach } from "node:test";
import { Window } from "happy-dom";

export const window = new Window({ url: "http://localhost/" });

// The browser globals React and the components reach for. Defined (not assigned) because Node
// already owns some of them, like navigator and Event, as read-only getters.
const GLOBALS = [
  "window", "document", "navigator", "Node", "Element", "HTMLElement", "HTMLInputElement",
  "HTMLDialogElement", "Event", "KeyboardEvent", "MouseEvent", "PointerEvent", "FocusEvent",
  "InputEvent", "DataTransfer", "File", "FileList", "MutationObserver", "CSS", "getComputedStyle",
  "matchMedia", "requestAnimationFrame", "cancelAnimationFrame", "getSelection", "addEventListener",
  "removeEventListener", "innerWidth", "innerHeight", "scrollBy",
];
for (const name of GLOBALS) {
  const value = name === "window" ? window : window[name];
  Object.defineProperty(globalThis, name, {
    value: typeof value === "function" && !/^[A-Z]/.test(name) ? value.bind(window) : value,
    configurable: true,
    writable: true,
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// shortcut: happy-dom has no Popover API, so these no-ops only let components call it (no top
// layer, no light dismiss, no toggle event). Tests that need the open state fire `toggle` below.
for (const m of ["showPopover", "hidePopover", "togglePopover"]) window.HTMLElement.prototype[m] ??= () => {};

// Loaded after the globals: react-dom decides at import time whether it has a DOM.
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
export { act };

const mounted = new Set();

/** Render `ui` into a fresh container on document.body and flush effects. */
export async function render(ui) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(ui));
  const mount = { root, container };
  mounted.add(mount);
  return {
    container,
    rerender: (next) => act(async () => root.render(next)),
    unmount: async () => {
      mounted.delete(mount);
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

afterEach(async () => {
  for (const { root, container } of mounted) {
    await act(async () => root.unmount());
    container.remove();
  }
  mounted.clear();
  document.body.innerHTML = "";
});
after(() => window.happyDOM.close());

/** Dispatch inside act; resolves to the event so a test can read defaultPrevented. */
const send = async (el, event) => (await act(async () => void el.dispatchEvent(event)), event);

/** keydown (bubbling, cancelable) with `key` and any modifier flags. */
export const keyDown = (el, key, init = {}) =>
  send(el, new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));

export const click = (el, init = {}) =>
  send(el, new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }));

export const fire = (el, type, init = {}, Ctor = window.Event) =>
  send(el, new Ctor(type, { bubbles: true, cancelable: true, ...init }));

export const pointer = (el, type, init) => fire(el, type, init, window.PointerEvent);

/** Advance node:test's mocked timers (t.mock.timers.enable) inside act. */
export const tick = (t, ms) => act(async () => t.mock.timers.tick(ms));

/** Replace `el[method]` with a recorder; returns the list of calls. */
export function spy(el, method) {
  const calls = [];
  el[method] = (...args) => void calls.push(args);
  return calls;
}

/** Set a form control's value the way typing does, so React's onChange sees it. */
export function type(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  return send(el, new window.Event("input", { bubbles: true }));
}

/** What the browser fires when a popover opens or closes (happy-dom never does). */
export const toggle = (el, newState) =>
  send(el, Object.assign(new window.Event("toggle"), { newState, oldState: newState === "open" ? "closed" : "open" }));

export const focus = (el) => act(async () => el.focus());

/** Let timers registered with the real clock run, inside act. */
export const wait = (ms = 0) => act(() => new Promise((r) => setTimeout(r, ms)));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
/** The element whose text content (trimmed) is exactly `text`. */
export const byText = (text, sel = "*", root = document) =>
  $$(sel, root).find((el) => el.textContent.trim() === text && ![...el.children].some((c) => c.textContent.trim() === text));
