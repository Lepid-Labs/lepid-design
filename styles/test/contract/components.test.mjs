// The component contracts that predate the gap slices: every theme styles the same hooks.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT, themeDirs, parseCss } from "./helpers.mjs";

test("every theme's button.css declares a guarded .ld-btn--sm compact variant", () => {
  // The compact size is part of the button contract: every theme must carry it
  // so a screen keeps its inline/table-row actions when it swaps data-ld-style.
  for (const theme of themeDirs) {
    const file = join(ROOT, theme, "components", "button.css");
    const { selectors } = parseCss(readFileSync(file, "utf-8"));
    const guard = `[data-ld-style="${theme}"]`;
    const sm = selectors.filter((s) => /\.ld-btn--sm(?![\w-])/.test(s));
    assert.ok(sm.length > 0, `${theme}: button.css is missing a .ld-btn--sm rule`);
    for (const sel of sm) {
      assert.ok(sel.includes(guard), `${theme}: unguarded .ld-btn--sm selector: ${sel}`);
    }
  }
});

test("every theme carries the hold-to-confirm button contract", () => {
  // .ld-btn--hold and its subparts (issue #29): the React HoldButton writes
  // --ld-hold and data-ld-hold, so every theme must style the same hooks and
  // publish its commitment window as --ld-hold-duration.
  const PARTS = [
    ".ld-btn--hold", ".ld-btn__ring", ".ld-btn__body", ".ld-btn__label",
    ".ld-btn__hint", ".ld-btn__meter", '[data-ld-hold="fired"]',
  ];
  for (const theme of themeDirs) {
    const file = join(ROOT, theme, "components", "button-hold.css");
    assert.ok(existsSync(file), `${theme}: components/button-hold.css missing`);
    const { selectors } = parseCss(readFileSync(file, "utf-8"));
    for (const part of PARTS) {
      assert.ok(selectors.some((s) => s.includes(part)), `${theme}: button-hold.css never styles ${part}`);
    }
    const tokens = readFileSync(join(ROOT, theme, "tokens.css"), "utf-8");
    assert.match(tokens, /--ld-hold-duration:\s*[\d.]+m?s\s*;/, `${theme}: --ld-hold-duration token`);
  }
});

test("every theme carries the button-group contract", () => {
  // .ld-btn-group: the track owns the chrome and its direct-child .ld-btn
  // segments drop theirs. The React ButtonGroup writes only the track class
  // (+ --block); the pressed segment is lit from aria-pressed on the child
  // (.ld-btn--active for non-buttons), so every theme must style those hooks.
  const PARTS = [
    ".ld-btn-group", ".ld-btn-group--block", ".ld-btn-group--block > .ld-btn",
    ".ld-btn-group > .ld-btn", ".ld-btn-group > .ld-btn:hover", ".ld-btn-group > .ld-btn:focus-visible",
    ".ld-btn-group > .ld-btn--active", '.ld-btn-group > .ld-btn[aria-pressed="true"]',
    ".ld-btn-group > .ld-btn:disabled",
  ];
  for (const theme of themeDirs) {
    const file = join(ROOT, theme, "components", "button-group.css");
    assert.ok(existsSync(file), `${theme}: components/button-group.css missing`);
    const { selectors } = parseCss(readFileSync(file, "utf-8"));
    for (const part of PARTS) {
      assert.ok(selectors.some((s) => s.endsWith(part)), `${theme}: button-group.css never styles ${part}`);
    }
    // variants must be re-tinted inside the track, or a solid --primary/--danger
    // fill (and its on-fill text colour) would leak into a chromeless segment
    for (const variant of ["primary", "accent", "danger"]) {
      assert.ok(
        selectors.some((s) => s.endsWith(`.ld-btn-group > .ld-btn--${variant}`)),
        `${theme}: button-group.css never re-tints .ld-btn--${variant} inside the group`,
      );
    }
  }
});

test("every theme carries the icon-button contract", () => {
  // .ld-icon-btn (issue #8): the React IconButton writes the class plus the
  // --active / --danger modifiers, and callers light it from aria-pressed
  // (toggle) or aria-current="page" (nav link), so every theme must style
  // each hook — and the theme's index.css must pull the file in.
  const PARTS = [
    ".ld-icon-btn", ".ld-icon-btn > svg", ".ld-icon-btn:hover", ".ld-icon-btn:focus-visible",
    ".ld-icon-btn--active", '.ld-icon-btn[aria-pressed="true"]', '.ld-icon-btn[aria-current="page"]',
    ".ld-icon-btn--danger:hover", ".ld-icon-btn:disabled", '.ld-icon-btn[aria-disabled="true"]',
  ];
  for (const theme of themeDirs) {
    const file = join(ROOT, theme, "components", "icon-button.css");
    assert.ok(existsSync(file), `${theme}: components/icon-button.css missing`);
    const { selectors } = parseCss(readFileSync(file, "utf-8"));
    for (const part of PARTS) {
      assert.ok(selectors.some((s) => s.endsWith(part)), `${theme}: icon-button.css never styles ${part}`);
    }
    const { imports } = parseCss(readFileSync(join(ROOT, theme, "index.css"), "utf-8"));
    assert.ok(
      imports.some((i) => i.includes("components/icon-button.css")),
      `${theme}: index.css never imports components/icon-button.css`,
    );
  }
});

test("every theme carries the interactive-table contract", () => {
  // .ld-table--interactive (issue #7): the React Table writes the modifier and
  // TableRow makes rows focusable and marks the chosen one aria-selected, so
  // every theme must style the pointer, focus, press, and selected hooks.
  const PARTS = [
    ".ld-table--interactive tbody tr", ".ld-table--interactive tbody tr:focus-visible",
    ".ld-table--interactive tbody tr:active", '.ld-table--interactive tbody tr[aria-selected="true"]',
  ];
  for (const theme of themeDirs) {
    const file = join(ROOT, theme, "components", "table.css");
    const { selectors } = parseCss(readFileSync(file, "utf-8"));
    const guard = `[data-ld-style="${theme}"]`;
    for (const part of PARTS) {
      const hits = selectors.filter((s) => s.endsWith(part));
      assert.ok(hits.length > 0, `${theme}: table.css never styles ${part}`);
      for (const sel of hits) assert.ok(sel.includes(guard), `${theme}: unguarded selector: ${sel}`);
    }
  }
});

test("every theme carries the log-block contract", () => {
  // .ld-pre--log (issue #9): the React LogBlock writes the modifier and sets
  // --ld-log-max-height inline, so every theme must style it and honour the var.
  for (const theme of themeDirs) {
    const file = join(ROOT, theme, "components", "pre.css");
    const css = readFileSync(file, "utf-8");
    const { selectors } = parseCss(css);
    const hits = selectors.filter((s) => s.endsWith(".ld-pre--log"));
    assert.ok(hits.length > 0, `${theme}: pre.css never styles .ld-pre--log`);
    for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
    assert.match(css, /max-height:\s*var\(--ld-log-max-height\b/, `${theme}: .ld-pre--log ignores --ld-log-max-height`);
  }
});

test("every theme carries the code-copy contract", () => {
  // .ld-pre-copy (issue #23): an .ld-icon-btn pinned inside .ld-pre-wrap. The
  // React CodeBlock and the documented plain-HTML snippet both flip
  // data-ld-copy="copied" | "failed" and write status into the hidden live
  // span, so every theme must style the reveal, both states, the glyph swap,
  // the status span, and keep the control visible where there's no hover.
  const PARTS = [
    ".ld-pre-wrap", ".ld-pre-wrap > .ld-pre", ".ld-pre-copy",
    ".ld-pre-wrap:hover .ld-pre-copy", ".ld-pre-wrap:focus-within .ld-pre-copy",
    '.ld-pre-copy[data-ld-copy="copied"]', '.ld-pre-copy[data-ld-copy="failed"]',
    ".ld-pre-copy__check", '.ld-pre-copy[data-ld-copy="copied"] .ld-pre-copy__icon',
    '.ld-pre-copy[data-ld-copy="copied"] .ld-pre-copy__check', ".ld-pre-copy-status",
  ];
  for (const theme of themeDirs) {
    const css = readFileSync(join(ROOT, theme, "components", "pre.css"), "utf-8");
    const { selectors } = parseCss(css);
    for (const part of PARTS) {
      const hits = selectors.filter((s) => s.endsWith(part));
      assert.ok(hits.length > 0, `${theme}: pre.css never styles ${part}`);
      for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
    }
    assert.match(css, /@media\s*\(hover:\s*none\)\s*\{[^}]*\.ld-pre-copy\s*\{[^}]*opacity:\s*1/, `${theme}: copy control hidden on touch`);
  }
});

test("every theme carries the sliding-indicator contract", () => {
  // Tabs and ButtonGroup stamp data-ld-dir="forward" | "back" on the track and
  // the theme slides one indicator (tabs ::after, button-group ::before) whose
  // leading edge is picked from it. Every theme must answer both directions on
  // both tracks, declare the two timing tokens, and drop the motion when asked.
  for (const theme of themeDirs) {
    const tokens = readFileSync(join(ROOT, theme, "tokens.css"), "utf-8");
    for (const token of ["--ld-slide-lead", "--ld-slide-trail"]) {
      assert.match(tokens, new RegExp(`${token}\\s*:`), `${theme}: tokens.css misses ${token}`);
    }
    for (const [name, track] of [["tabs", ".ld-tabs"], ["button-group", ".ld-btn-group"]]) {
      const pseudo = name === "tabs" ? "::after" : "::before";
      const css = readFileSync(join(ROOT, theme, "components", `${name}.css`), "utf-8");
      const { selectors } = parseCss(css);
      for (const dir of ["forward", "back"]) {
        const part = `${track}[data-ld-dir="${dir}"]${pseudo}`;
        assert.ok(selectors.some((s) => s.endsWith(part)), `${theme}: ${name}.css never styles ${part}`);
      }
      assert.ok(
        selectors.some((s) => s.endsWith(`${track}[data-ld-dir]${pseudo}`)),
        `${theme}: ${name}.css never stills the indicator under prefers-reduced-motion`,
      );
      assert.match(css, /@supports \(anchor-name: --ld-a\) and \(anchor-scope: --ld-a\)/, `${theme}: ${name}.css indicator is not gated on anchor positioning`);
    }
  }
});

test("every theme carries the status-card contract", () => {
  // .ld-status-card and its parts (issue #27): the React StatusCard writes
  // the tone modifier, data-ld-attention, and data-ld-changed, so every theme
  // must style the same hooks. The compact and pulsing badge variants are
  // part of the same contract — the card's meta row is built from them.
  const PARTS = [
    ".ld-status-card", ".ld-status-card--info", ".ld-status-card--success",
    ".ld-status-card--warning", ".ld-status-card--danger",
    "[data-ld-attention]", '[data-ld-attention="info"]', '[data-ld-attention="success"]',
    '[data-ld-attention="danger"]', "[data-ld-changed]",
    ".ld-status-card__watermark", ".ld-status-card__head", ".ld-status-card__prefix",
    ".ld-status-card__title", ".ld-status-card__meta", ".ld-status-card__note",
    ".ld-status-card__rows", ".ld-status-card__row", ".ld-status-card__row-lead",
    ".ld-status-card__row-main", ".ld-status-card__row-trail",
    ".ld-status-card__footer", ".ld-status-card__empty",
  ];
  for (const theme of themeDirs) {
    const file = join(ROOT, theme, "components", "status-card.css");
    assert.ok(existsSync(file), `${theme}: components/status-card.css missing`);
    const { selectors, keyframes } = parseCss(readFileSync(file, "utf-8"));
    for (const part of PARTS) {
      assert.ok(selectors.some((s) => s.includes(part)), `${theme}: status-card.css never styles ${part}`);
    }
    assert.ok(keyframes.some((k) => k.endsWith("-status-flash")), `${theme}: no status-flash keyframes`);
    const badge = parseCss(readFileSync(join(ROOT, theme, "components", "badge.css"), "utf-8"));
    for (const part of [".ld-badge--sm", ".ld-badge--pulse"]) {
      assert.ok(badge.selectors.some((s) => s.includes(part)), `${theme}: badge.css never styles ${part}`);
    }
  }
});

test("every theme carries the stepper contract", () => {
  // .ld-stepper and its parts (issue #13): the React Stepper writes the three
  // state modifiers and aria-current="step" on the active node, and every
  // theme derives the rail fill from those same hooks — so each must style
  // all of them, or a stepper would lose its rail when data-ld-style swaps.
  const PARTS = [
    ".ld-stepper", ".ld-stepper__step", ".ld-stepper__step::before", ".ld-stepper__step::after",
    ".ld-stepper__step--complete", ".ld-stepper__step--current", ".ld-stepper__step--upcoming",
    ".ld-stepper__node", ".ld-stepper__label",
  ];
  for (const theme of themeDirs) {
    const file = join(ROOT, theme, "components", "stepper.css");
    assert.ok(existsSync(file), `${theme}: components/stepper.css missing`);
    const { selectors } = parseCss(readFileSync(file, "utf-8"));
    for (const part of PARTS) {
      assert.ok(selectors.some((s) => s.includes(part)), `${theme}: stepper.css never styles ${part}`);
    }
    // the fill must follow the complete modifier, not a caller-computed value
    assert.ok(
      selectors.some((s) => s.includes(".ld-stepper__step--complete::after")),
      `${theme}: stepper.css never fills the rail segment of a complete step`,
    );
    for (const state of ["complete", "current", "upcoming"]) {
      for (const part of ["__node", "__label"]) {
        assert.ok(
          selectors.some((s) => s.includes(`.ld-stepper__step--${state} .ld-stepper${part}`)),
          `${theme}: stepper.css never styles ${part} in the ${state} state`,
        );
      }
    }
  }
});

test("every theme carries the app-shell and page-layout contract", () => {
  // layout.css (grid areas, sticky offsets, rail, drawer, tab bar) and
  // page.css (the page layouts) are structure, identical in every theme but
  // for the guard, so a shell never changes shape when data-ld-style swaps.
  // shell.css is the themed chrome and must dress every part AppShell renders.
  const STRUCTURE = [
    ".ld-shell", ".ld-shell__skip", ".ld-shell__header", ".ld-shell__toggle", ".ld-shell__brand",
    ".ld-shell__actions", ".ld-shell__nav", ".ld-shell__scrim", ".ld-shell__main", ".ld-shell__footer",
    ".ld-shell[data-ld-nav-collapsed]", ".ld-shell[data-ld-nav-open]", ".ld-shell--tabbar",
    ".ld-topnav", ".ld-topnav__item", ".ld-sidenav", ".ld-sidenav__section", ".ld-sidenav__heading",
    ".ld-sidenav__item", ".ld-sidenav__icon", ".ld-sidenav__label", ".ld-sidenav__badge", ".ld-sidenav__footer",
  ];
  const PAGE = [
    ".ld-page", ".ld-page--narrow", ".ld-page--wide", ".ld-page--full", ".ld-page__header",
    ".ld-page__heading", ".ld-page__title", ".ld-page__actions",
    ".ld-grid", ".ld-split", ".ld-split__list", ".ld-split__detail",
    ".ld-aside-layout", ".ld-aside-layout__main", ".ld-aside-layout__aside", ".ld-center",
  ];
  const CHROME = [
    ".ld-shell__skip", ".ld-shell__header", ".ld-shell__toggle", ".ld-shell__brand", ".ld-shell__nav",
    ".ld-shell__scrim", ".ld-shell__footer", ".ld-topnav__item", '.ld-topnav__item[aria-current="page"]',
    ".ld-sidenav__heading", ".ld-sidenav__item", ".ld-sidenav__item:hover", ".ld-sidenav__item:focus-visible",
    ".ld-sidenav__item--active", '.ld-sidenav__item[aria-current="page"]', ".ld-shell--tabbar",
    ".ld-page__eyebrow", ".ld-page__title", ".ld-page__subtitle",
  ];
  const normalized = (theme, name) =>
    readFileSync(join(ROOT, theme, "components", `${name}.css`), "utf-8").replaceAll(theme, "<theme>");
  for (const theme of themeDirs) {
    for (const [name, parts] of [["layout", STRUCTURE], ["page", PAGE], ["shell", CHROME]]) {
      const file = join(ROOT, theme, "components", `${name}.css`);
      assert.ok(existsSync(file), `${theme}: components/${name}.css missing`);
      const { selectors } = parseCss(readFileSync(file, "utf-8"));
      for (const part of parts) {
        assert.ok(selectors.some((s) => s.includes(part)), `${theme}: ${name}.css never styles ${part}`);
      }
    }
    for (const name of ["layout", "page"]) {
      assert.equal(normalized(theme, name), normalized(themeDirs[0], name), `${theme}: ${name}.css drifted from ${themeDirs[0]}`);
    }
    // the shell paints the theme's page background without an extra class
    const base = parseCss(readFileSync(join(ROOT, theme, "base.css"), "utf-8"));
    assert.ok(base.selectors.some((s) => s.endsWith(".ld-shell")), `${theme}: base.css never gives .ld-shell the page background`);
  }
});
