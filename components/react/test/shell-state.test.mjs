// State logic behind AppShell: what the nav toggle flips on each viewport and
// the attributes the shell root carries. Runs the TypeScript source directly
// (Node strips types); the React wrapper only spreads these.
import assert from "node:assert/strict";
import { test } from "node:test";
import { navExpanded, shellAttrs, toggleNav } from "../src/shell-state.ts";

const closed = { collapsed: false, open: false };

test("toggleNav: wide viewports collapse the rail and leave the drawer alone", () => {
  assert.deepEqual(toggleNav(closed, false), { collapsed: true, open: false });
  assert.deepEqual(toggleNav({ collapsed: true, open: false }, false), closed);
});

test("toggleNav: narrow viewports open the drawer and keep the rail preference", () => {
  assert.deepEqual(toggleNav({ collapsed: true, open: false }, true), { collapsed: true, open: true });
  assert.deepEqual(toggleNav({ collapsed: true, open: true }, true), { collapsed: true, open: false });
});

test("navExpanded: reads the state that matters for the current viewport", () => {
  assert.equal(navExpanded(closed, false), true);
  assert.equal(navExpanded({ collapsed: true, open: false }, false), false);
  assert.equal(navExpanded({ collapsed: true, open: true }, true), true);
  assert.equal(navExpanded(closed, true), false);
});

test("shellAttrs: presence attributes only for true states, consumer className appended", () => {
  assert.deepEqual(shellAttrs(closed), { className: "ld-shell" });
  assert.deepEqual(shellAttrs({ collapsed: true, open: true }, "mine"), {
    className: "ld-shell mine",
    "data-ld-nav-collapsed": "",
    "data-ld-nav-open": "",
  });
});
