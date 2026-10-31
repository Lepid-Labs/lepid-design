// UserMenu, IdentityName and AccessPanel rendered with react-dom in happy-dom: naming, the identity header, copy and actions.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h } from "react";
import { render, click, toggle, $, $$ } from "./dom.mjs";
import { AccessPanel, IdentityName, MenuItem, UserMenu } from "../dist/index.js";

const ada = { id: "u-1", name: "Ada Lovelace", email: "ada@example.test" };

test("IdentityName: name, with the email only when it adds something", async () => {
  const a = await render(h(IdentityName, { user: ada }));
  assert.equal(a.container.textContent, "Ada Lovelace (ada@example.test)");
  const b = await render(h(IdentityName, { user: { name: "ada@example.test", email: "ada@example.test" } }));
  assert.equal(b.container.textContent, "ada@example.test");
});

test("UserMenu: an avatar menu button named for the user, the menu headed by who they are", async () => {
  const log = [];
  await render(h(UserMenu, { user: ada }, h(MenuItem, { onSelect: () => log.push("profile") }, "Profile & sign-out")));
  const [button, menu] = [$("button"), $("[role=menu]")];
  assert.equal(button.getAttribute("aria-label"), "Account: Ada Lovelace");
  assert.equal(button.getAttribute("aria-haspopup"), "menu");
  assert.ok($(".ld-avatar", button).textContent.startsWith("AL"), "initials in the avatar");
  assert.equal(menu.getAttribute("aria-label"), "Account");
  const group = $("[role=group]", menu);
  assert.equal(group.getAttribute("aria-labelledby"), $(".ld-menu__header").id);
  assert.equal($(".ld-menu__header-text").textContent, "Ada Lovelaceada@example.test");
  assert.equal($(".ld-menu__header .ld-avatar").getAttribute("aria-hidden"), "true");
  assert.ok($("[role=separator]", group));
  await toggle(menu, "open");
  assert.equal(document.activeElement.textContent, "Profile & sign-out", "opening focuses the first action, not the header");
  await click(document.activeElement);
  assert.deepEqual(log, ["profile"]);
});

test("UserMenu: no email line when there is none", async () => {
  await render(h(UserMenu, { user: { id: "u-2", name: "Grace" }, label: "Signed in" }, h(MenuItem, null, "Out")));
  assert.equal($(".ld-menu__header-text").textContent, "Grace");
  assert.equal($("button").getAttribute("aria-label"), "Signed in: Grace");
});

test("AccessPanel: signed out offers sign-in", async () => {
  const log = [];
  const { container: c } = await render(h(AccessPanel, { state: "signed-out", appName: "Inventory", onSignIn: () => log.push("in") }));
  assert.equal($("h2", c).textContent, "Sign in to continue");
  assert.match($(".ld-empty__body", c).textContent, /use Inventory\./);
  await click($(".ld-empty__actions button", c));
  assert.deepEqual(log, ["in"]);
});

test("AccessPanel: no access names the account and links to switch it", async () => {
  const { container: c } = await render(h(AccessPanel, { state: "no-access", user: ada, switchAccountHref: "/profile" }));
  assert.equal($("h2", c).textContent, "No access");
  assert.match($(".ld-empty__body", c).textContent, /signed in as Ada Lovelace \(ada@example\.test\), but this account has no access to this app\./);
  assert.equal($(".ld-empty__actions a", c).getAttribute("href"), "/profile");
  const { container: anon } = await render(h(AccessPanel, { state: "no-access" }));
  assert.match($(".ld-empty__body", anon).textContent, /^Your account has no access to this app\./);
  assert.equal($(".ld-empty__actions", anon), null, "no action without somewhere to go");
});

test("AccessPanel: unavailable is announced and offers a retry", async () => {
  const log = [];
  const { container: c } = await render(h(AccessPanel, { state: "unavailable", onRetry: () => log.push("retry") }));
  assert.equal($(".ld-empty", c).getAttribute("role"), "alert");
  await click($(".ld-empty__actions button", c));
  assert.deepEqual(log, ["retry"]);
});

test("AccessPanel: title and body can be replaced", async () => {
  await render(h(AccessPanel, { state: "signed-out", title: "Welcome back" }, h("p", null, "Custom")));
  assert.equal($("h2").textContent, "Welcome back");
  assert.deepEqual($$(".ld-empty__body p").map((p) => p.textContent), ["Custom"]);
});
