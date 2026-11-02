// The views rendered in happy-dom: ListView, DetailView and FormView, and the view actions behind them.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, useState } from "react";
import { $, $$, byText, click, fire, render, type, wait, window } from "./dom.mjs";
import { DetailView, FormView, Input, ListView, Toaster } from "../dist/index.js";

const books = [
  { id: 1, title: "Dune", pages: 412 },
  { id: 2, title: "Emma", pages: 474 },
  { id: 3, title: "Ubik", pages: 202 },
];
const loaded = (data) => ({ data, error: null, isPending: false });
const columns = [
  { header: "Title", cell: (b) => b.title },
  { header: "Pages", cell: (b) => b.pages, numeric: true },
];

/** A promise the test settles by hand, to look at the busy state in between. */
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

test("ListView: a string `empty` becomes an EmptyState; no table for no rows", async () => {
  await render(h(ListView, { title: "Books", query: loaded([]), columns, empty: "No books yet" }));
  assert.equal($("h1").textContent, "Books");
  assert.equal($(".ld-empty__title").textContent, "No books yet");
  assert.equal($("table"), null);
});

test("ListView: rowHref links the first cell and a plain click on the row follows it", async () => {
  await render(h(ListView, { title: "Books", query: loaded(books), columns, rowHref: (b) => `/books/${b.id}` }));
  assert.deepEqual($$("thead th").map((th) => th.textContent), ["Title", "Pages"]);
  assert.match($$("thead th")[1].className, /ld-num/);
  const [row] = $$("tbody tr");
  assert.equal(row.querySelector("a").getAttribute("href"), "/books/1");
  assert.equal(row.tabIndex, -1, "the link is the only tab stop in the row");
  await click(row.cells[1], { ctrlKey: true });
  assert.notEqual(window.location.pathname, "/books/1", "a modified click is left alone");
  await click(row.cells[1]);
  assert.equal(window.location.pathname, "/books/1");
});

test("ListView: a row action confirms, spins while it runs, and toasts a failure", async () => {
  const runs = [];
  let pending;
  const del = { label: "Delete", danger: true, confirm: (b) => `Delete ${b.title}?`,
    run: (b) => (runs.push(b.title), (pending = deferred()).promise) };
  await render(h("div", null, h(Toaster), h(ListView, { title: "Books", query: loaded(books), columns, rowActions: [del] })));
  const button = $("button[aria-label='Delete Emma']");
  assert.equal(button.textContent, "Delete");
  assert.match(button.className, /ld-btn--danger/);
  await click(button);
  assert.equal($(".ld-dialog__title").textContent, "Delete Emma?");
  const confirm = $$(".ld-dialog__actions button")[1];
  assert.equal(confirm.textContent, "Delete", "the confirm button takes the action's label");
  assert.match(confirm.className, /ld-btn--danger/);
  await click(confirm);
  assert.deepEqual(runs, ["Emma"]);
  assert.equal(button.getAttribute("aria-busy"), "true");
  assert.notEqual($("button[aria-label='Delete Dune']").getAttribute("aria-busy"), "true", "only that row spins");
  pending.reject(new Error("Emma is on loan"));
  await wait();
  assert.notEqual(button.getAttribute("aria-busy"), "true");
  assert.ok(byText("Delete failed"), "the toast names the action");
  assert.ok(byText("Emma is on loan"));
});

test("ListView: a cancelled confirm does not run", async () => {
  const runs = [];
  const del = { label: "Delete", confirm: "Sure?", run: (b) => runs.push(b.id) };
  await render(h(ListView, { title: "Books", query: loaded(books), columns, rowActions: [del] }));
  await click($("button[aria-label='Delete Dune']"));
  await click(byText("Cancel", "button"));
  assert.deepEqual(runs, []);
});

test("ListView: bulk actions add selection and the bar, get the chosen rows, and clear on success", async () => {
  const got = [];
  const archive = { label: "Archive", run: (rows) => got.push(rows.map((b) => b.title)) };
  await render(h(ListView, { title: "Books", query: loaded(books), columns, bulkActions: [archive] }));
  const bar = $(".ld-bulk-bar");
  assert.equal(bar.hidden, true);
  await click($("input[aria-label='Select Dune']"));
  await click($("input[aria-label='Select Ubik']"));
  assert.equal(bar.hidden, false);
  assert.equal($(".ld-bulk-bar__count").textContent, "2 selected");
  await click(byText("Archive", "button"));
  await wait();
  assert.deepEqual(got, [["Dune", "Ubik"]]);
  assert.equal(bar.hidden, true, "the selection clears once the action succeeds");
});

test("ListView: the selection count drops rows that left the data", async () => {
  const props = { title: "Books", columns, bulkActions: [{ label: "Archive", run() {} }] };
  const { rerender } = await render(h(ListView, { ...props, query: loaded(books) }));
  await click($("thead input[type=checkbox]"));
  assert.equal($(".ld-bulk-bar__count").textContent, "3 selected");
  await rerender(h(ListView, { ...props, query: loaded(books.slice(1)) }));
  assert.equal($(".ld-bulk-bar__count").textContent, "2 selected");
});

test("DetailView: header from the item, actions run on it; an error with no data shows an alert", async () => {
  const runs = [];
  const view = (query) => h(DetailView, { query, eyebrow: "Books", title: (b) => b.title, subtitle: (b) => `${b.pages} pages`,
    actions: [{ label: "Archive", run: (b) => runs.push(b.id) }], children: (b) => h("p", { id: "body" }, `#${b.id}`) });
  const { rerender } = await render(view(loaded(books[0])));
  assert.equal($("h1").textContent, "Dune");
  assert.equal($(".ld-page__subtitle").textContent, "412 pages");
  assert.equal($(".ld-page__eyebrow").textContent, "Books");
  assert.equal($("#body").textContent, "#1");
  await click(byText("Archive", "button"));
  assert.deepEqual(runs, [1]);
  await rerender(view({ data: undefined, error: new Error("Not found"), isPending: false }));
  assert.equal($("h1"), null);
  assert.equal($(".ld-alert").textContent.trim(), "Not found");
});

test("FormView: submit hands over FormData; a throw shows above the buttons; resetOnSuccess clears", async () => {
  const sent = [];
  let fail = true;
  await render(h(FormView, { title: "New book", submitLabel: "Add book", resetOnSuccess: true,
    onSubmit: (data) => {
      sent.push(Object.fromEntries(data));
      if (fail) throw new Error("Title is taken");
    } }, h(Input, { name: "title", "aria-label": "Title", defaultValue: "" })));
  assert.equal($("h1").textContent, "New book");
  const input = $("input[name=title]");
  await type(input, "Dune");
  await fire($("form"), "submit");
  assert.deepEqual(sent, [{ title: "Dune" }]);
  assert.equal($(".ld-alert").textContent.trim(), "Title is taken");
  assert.equal(input.value, "Dune", "a failure keeps what was typed");
  fail = false;
  await fire($("form"), "submit");
  assert.equal($(".ld-alert"), null);
  assert.equal(input.value, "", "reset after success");
});

function DialogHost({ onSubmit }) {
  const [open, setOpen] = useState(false);
  return h("div", null, h("button", { onClick: () => setOpen(true) }, "open"),
    h(FormView, { open, title: "Edit", onCancel: () => setOpen(false), onSubmit },
      h(Input, { name: "title", "aria-label": "Title", defaultValue: "Dune" })));
}

test("FormView dialog: Cancel first, Escape ignored mid-save, fresh fields and error on reopen", async () => {
  let pending;
  await render(h(DialogHost, { onSubmit: () => (pending = deferred()).promise }));
  await click(byText("open", "button"));
  const dialog = $("dialog");
  assert.equal(dialog.open, true);
  assert.deepEqual($$(".ld-dialog__actions button").map((b) => b.textContent), ["Cancel", "Save"]);
  await type($("input[name=title]"), "Dun");
  await fire($("form"), "submit");
  assert.equal((await fire(dialog, "cancel")).defaultPrevented, true, "Escape cannot hide a running save");
  pending.reject(new Error("Server said no"));
  await wait();
  assert.equal($(".ld-alert").textContent.trim(), "Server said no");
  assert.equal((await fire(dialog, "cancel")).defaultPrevented, false);
  await click(byText("Cancel", "button"));
  assert.equal(dialog.open, false);
  await click(byText("open", "button"));
  assert.equal($("input[name=title]").value, "Dune", "fields start from their defaults again");
  assert.equal($(".ld-alert"), null, "and the last error is gone");
});
