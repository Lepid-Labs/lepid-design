// Attribute and activation logic behind Table / TableRow. Runs the TypeScript
// source directly (Node strips types); the React wrappers only spread these
// and read the DOM facts (event target, nested control, selection) they take.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isRowActivationClick,
  isRowActivationKey,
  ROW_NESTED_CONTROLS,
  tableAttrs,
  tableRowAttrs,
} from "../src/table-state.ts";

test("tableAttrs: plain table is the base class; interactive adds the modifier; className last", () => {
  assert.deepEqual(tableAttrs({}), { className: "ld-table" });
  assert.equal(tableAttrs({ interactive: true, className: "mine" }).className, "ld-table ld-table--interactive mine");
  assert.equal(tableAttrs({ interactive: false }).className, "ld-table");
});

test("tableRowAttrs: a plain row gets nothing", () => {
  assert.deepEqual(tableRowAttrs({}), {});
});

test("tableRowAttrs: an activatable row joins the tab order", () => {
  assert.deepEqual(tableRowAttrs({ activatable: true }), { tabIndex: 0 });
});

test("tableRowAttrs: selected is emitted as aria-selected only when given", () => {
  assert.equal(tableRowAttrs({ activatable: true, selected: true })["aria-selected"], true);
  assert.equal(tableRowAttrs({ activatable: true, selected: false })["aria-selected"], false);
  assert.equal("aria-selected" in tableRowAttrs({ activatable: true }), false);
});

test("isRowActivationKey: Enter and Space on the row itself activate", () => {
  assert.equal(isRowActivationKey("Enter", true), true);
  assert.equal(isRowActivationKey(" ", true), true);
  assert.equal(isRowActivationKey("a", true), false);
  assert.equal(isRowActivationKey("Tab", true), false);
});

test("isRowActivationKey: keys from a control inside the row never activate the row", () => {
  assert.equal(isRowActivationKey("Enter", false), false);
  assert.equal(isRowActivationKey(" ", false), false);
});

test("isRowActivationClick: nested controls and text selections don't activate", () => {
  assert.equal(isRowActivationClick(false, ""), true);
  assert.equal(isRowActivationClick(true, ""), false);
  assert.equal(isRowActivationClick(false, "copied id"), false);
});

test("ROW_NESTED_CONTROLS covers the native interactive elements", () => {
  for (const sel of ["a[href]", "button", "input", "select", "textarea", "label", '[role="button"]']) {
    assert.ok(ROW_NESTED_CONTROLS.split(", ").includes(sel), `missing ${sel}`);
  }
});
