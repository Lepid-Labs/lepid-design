// AppShell, its header and side nav, and the page layouts rendered with react-dom in happy-dom.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h } from "react";
import { render, click, keyDown, act, $, $$, window } from "./dom.mjs";
import {
  AppShell, AppHeader, ShellToggle, TopNav, TopNavItem, SideNav, SideNavSection, SideNavItem, useShell,
  Page, PageHeader, Grid, Split, AsideLayout, Center,
} from "../dist/index.js";

/** Count the matchMedia "change" listeners the shell holds, through happy-dom's real lists. */
function watchMedia(t) {
  const real = window.matchMedia;
  const held = new Set();
  t.mock.method(window, "matchMedia", (q) => {
    const mql = real.call(window, q);
    const [add, remove] = [mql.addEventListener.bind(mql), mql.removeEventListener.bind(mql)];
    mql.addEventListener = (type, fn) => (type === "change" && held.add(fn), add(type, fn));
    mql.removeEventListener = (type, fn) => (held.delete(fn), remove(type, fn));
    return mql;
  });
  return held;
}

const shell = (props = {}) => h(AppShell, {
  header: h(AppHeader, {
    brand: "Lepid", brandHref: "/", actions: h("button", null, "Account"),
    nav: h(TopNav, { "aria-label": "Sections" }, h(TopNavItem, { href: "/a", active: true }, "A"), h(TopNavItem, { href: "/b" }, "B")),
  }),
  nav: h(SideNav, { "aria-label": "Main", footer: "v1" },
    h(SideNavSection, { title: "Work" },
      h(SideNavItem, { href: "#inbox", active: true, icon: "📥", badge: "3" }, "Inbox"),
      h(SideNavItem, { as: "button", type: "button" }, "Archive"))),
  ...props,
}, h("p", null, "Content"));

test("AppShell: skip link, landmarks, labelled nav groups and current pages", async (t) => {
  watchMedia(t);
  await render(shell());
  const root = $(".ld-shell");
  const main = $("main.ld-shell__main");
  assert.equal($("a.ld-shell__skip").getAttribute("href"), `#${main.id}`);
  assert.equal(main.tabIndex, -1, "the skip target takes focus");
  assert.equal(root.classList.contains("ld-shell--tabbar"), false, "a header means the drawer");
  assert.equal($("a.ld-shell__brand").getAttribute("href"), "/");
  assert.equal($("nav.ld-topnav").getAttribute("aria-label"), "Sections");
  assert.deepEqual($$(".ld-topnav__item").map((a) => a.getAttribute("aria-current")), ["page", null]);
  assert.equal($(".ld-shell__actions button").textContent, "Account");
  assert.equal($("aside nav.ld-sidenav").getAttribute("aria-label"), "Main");
  const group = $("[role=group].ld-sidenav__section");
  assert.equal($(`#${CSS.escape(group.getAttribute("aria-labelledby"))}`).textContent, "Work");
  const [inbox, archive] = $$(".ld-sidenav__item");
  assert.equal(inbox.getAttribute("aria-current"), "page");
  assert.equal($(".ld-sidenav__icon", inbox).getAttribute("aria-hidden"), "true");
  assert.equal($(".ld-sidenav__badge", inbox).textContent, "3");
  assert.equal(archive.tagName, "BUTTON");
  assert.equal($(".ld-sidenav__footer").textContent, "v1");
  assert.equal($(".ld-shell__scrim").getAttribute("aria-hidden"), "true");
});

test("AppShell wide: the toggle collapses the rail, and rail items get their tooltip", async (t) => {
  watchMedia(t);
  const changes = [];
  await render(shell({ onNavCollapsedChange: (c) => changes.push(c) }));
  const toggle = $("button.ld-shell__toggle");
  assert.equal(toggle.getAttribute("aria-label"), "Toggle navigation");
  assert.equal(toggle.getAttribute("aria-controls"), $("aside.ld-shell__nav").id);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.equal($(".ld-sidenav__item").getAttribute("title"), null);
  await click(toggle);
  assert.equal($(".ld-shell").hasAttribute("data-ld-nav-collapsed"), true);
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
  assert.equal($(".ld-sidenav__item").getAttribute("title"), "Inbox", "a collapsed rail shows labels as tooltips");
  assert.equal($(".ld-shell").hasAttribute("data-ld-nav-open"), false, "wide never opens the drawer");
  await click(toggle);
  assert.deepEqual(changes, [true, false]);
});

test("AppShell narrow: the drawer opens, and Escape, the scrim or a link closes it", async (t) => {
  const held = watchMedia(t);
  t.after(() => window.happyDOM.setWindowSize({ width: 1024 }));
  const { unmount } = await render(shell({ navCollapsed: true }));
  assert.equal(held.size, 1, "the shell listens for the breakpoint");
  await act(async () => window.happyDOM.setWindowSize({ width: 600 })); // a real media-query change
  const root = $(".ld-shell");
  const toggle = $("button.ld-shell__toggle");
  assert.equal(toggle.getAttribute("aria-expanded"), "false", "a collapsed rail stays collapsed, the drawer is shut");
  assert.equal($(".ld-sidenav__item").getAttribute("title"), null, "no rail tooltips in the drawer");
  await click(toggle);
  assert.equal(root.hasAttribute("data-ld-nav-open"), true);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  await keyDown(document.body, "Escape");
  assert.equal(root.hasAttribute("data-ld-nav-open"), false);
  await click(toggle);
  await click($(".ld-shell__scrim"));
  assert.equal(root.hasAttribute("data-ld-nav-open"), false);
  await click(toggle);
  await click($(".ld-sidenav__item[href='#inbox']"));
  assert.equal(root.hasAttribute("data-ld-nav-open"), false, "following a link out of the drawer closes it");
  await click(toggle);
  await click($("button.ld-sidenav__item"));
  assert.equal(root.hasAttribute("data-ld-nav-open"), true, "a non-link click keeps it open");
  await unmount();
  assert.equal(held.size, 0, "unmount drops the media-query listener");
});

test("ShellToggle and useShell outside a shell, a tab-bar shell, and no skip link", async () => {
  const Probe = () => h("output", null, String(useShell()));
  await render(h("div", null, h(ShellToggle), h(Probe)));
  assert.equal($("button"), null, "no toggle outside an AppShell");
  assert.equal($("output").textContent, "null");
  document.body.innerHTML = "";
  await render(h(AppShell, { skipLink: false, footer: "©" }, h(ShellToggle)));
  assert.equal($(".ld-shell").className, "ld-shell ld-shell--tabbar", "no header means the tab bar");
  assert.equal($(".ld-shell__skip"), null);
  assert.equal($("button"), null, "no toggle without a nav");
  assert.equal($("footer.ld-shell__footer").textContent, "©");
  await render(h(AppShell, { nav: h(SideNav, { "aria-label": "Main" }) }, h(ShellToggle, { label: "Menu" })));
  assert.equal($("button.ld-shell__toggle").getAttribute("aria-label"), "Menu");
});

test("Page and layouts: elements, width modifier, header slots and custom-property sizes", async () => {
  await render(h("div", null,
    h(Page, { width: "wide", title: "Billing", eyebrow: "Settings", subtitle: "Plans", actions: h("button", null, "Upgrade") },
      h(Grid, { min: "12rem" }, "g"),
      h(Split, { list: "list", listWidth: "20rem" }, "detail"),
      h(AsideLayout, { aside: "help", asideWidth: "16rem", asideLabel: "Help" }, "main"),
      h(Center, { maxWidth: "40rem", style: { color: "red" } }, "c")),
    h(Page, null, h(PageHeader, { title: "Plain" }))));
  const [wide, plain] = $$(".ld-page");
  assert.equal(wide.className, "ld-page ld-page--wide");
  assert.equal(plain.className, "ld-page");
  assert.equal($("h1.ld-page__title", wide).textContent, "Billing");
  assert.equal($(".ld-page__eyebrow").textContent, "Settings");
  assert.equal($(".ld-page__subtitle").textContent, "Plans");
  assert.equal($(".ld-page__actions button").textContent, "Upgrade");
  assert.equal($$("h1", plain).length, 1);
  assert.equal($(".ld-page__eyebrow", plain), null);
  assert.equal($(".ld-grid").style.getPropertyValue("--ld-grid-min"), "12rem");
  assert.equal($(".ld-split").style.getPropertyValue("--ld-split-list"), "20rem");
  assert.equal($(".ld-split__list").textContent + $(".ld-split__detail").textContent, "listdetail");
  assert.equal($("aside.ld-aside-layout__aside").getAttribute("aria-label"), "Help");
  assert.equal($(".ld-aside-layout").style.getPropertyValue("--ld-aside-w"), "16rem");
  const center = $(".ld-center");
  assert.equal(center.style.getPropertyValue("--ld-center-max"), "40rem");
  assert.equal(center.style.color, "red");
});
