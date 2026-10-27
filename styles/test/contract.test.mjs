// The theme contract, enforced. Every theme must be:
//  - scoped: no rule applies without a data-ld-style="<theme>" opt-in,
//  - collision-free: keyframe names unique across themes,
//  - complete: the shared baseline token set fully declared,
//  - registered: manifest.json, package.json files/exports, and the theme
//    directories all agree.
// A new theme that passes this suite works in every consumer that reads the
// manifest — that is the whole point of the contract.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf-8"));
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
const themeDirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "test" && e.name !== "node_modules")
  .map((e) => e.name);

// The z-index layers, bottom to top. Identical in every theme (tested below).
const LAYERS = ["z-base", "z-sticky", "z-header", "z-dropdown", "z-overlay", "z-modal", "z-toast", "z-tooltip"];

// Baseline token set every theme must declare. Additions here are a contract
// change: bump manifest.json's "contract" and update consumers. Contract 2
// added the motion, elevation, and z-index layer scales.
const REQUIRED_TOKENS = [
  "bg", "bg-blend", "surface", "surface-sunken", "surface-glass", "on-surface",
  "faint", "primary", "primary-glow", "primary-border", "on-primary",
  "accent", "accent-glow", "border", "border-lit",
  "info", "success", "warning", "danger",
  "code-keyword", "code-string", "code-number", "code-comment",
  "code-function", "code-variable", "code-type", "code-meta",
  "font-display", "font-body", "font-mono",
  "font-weight", "font-weight-medium", "font-weight-bold",
  "text-sm", "tracking-wide",
  "radius", "radius-lg", "blur", "transition",
  "duration-fast", "duration-base", "duration-slow",
  "ease-standard", "ease-enter", "ease-exit", "ease-spring",
  "elevation-1", "elevation-2", "elevation-3", "elevation-4",
  ...LAYERS,
  "space-1", "space-2", "space-3", "space-4", "space-5",
].map((n) => `--ld-${n}`);

/** Split a selector list on top-level commas (commas inside () and [] don't count). */
function splitSelectors(prelude) {
  const parts = [];
  let depth = 0;
  let buf = "";
  for (const ch of prelude) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(buf.trim());
      buf = "";
    } else buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

/** Selectors, keyframe names, and top-level @imports of one CSS file. */
function parseCss(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [];
  const keyframes = [];
  const imports = [];
  const stack = [];
  let buf = "";
  for (const ch of css) {
    if (ch === "{") {
      const prelude = buf.trim();
      buf = "";
      const top = stack[stack.length - 1];
      if (prelude.startsWith("@keyframes")) {
        keyframes.push(prelude.slice("@keyframes".length).trim());
        stack.push("keyframes");
      } else if (prelude.startsWith("@")) {
        stack.push("at");
      } else if (top === "keyframes") {
        stack.push("kf-step");
      } else {
        selectors.push(...splitSelectors(prelude));
        stack.push("rule");
      }
    } else if (ch === "}") {
      stack.pop();
      buf = "";
    } else if (ch === ";") {
      const stmt = buf.trim();
      buf = "";
      if (stack.length === 0 && stmt.startsWith("@import")) imports.push(stmt);
    } else buf += ch;
  }
  return { selectors, keyframes, imports };
}

function themeCssFiles(theme) {
  const dir = join(ROOT, theme);
  const files = ["tokens.css", "base.css"];
  for (const f of readdirSync(join(dir, "components"))) {
    if (f.endsWith(".css")) files.push(join("components", f));
  }
  return files.map((f) => join(dir, f));
}

test("manifest, package.json, and theme directories agree", () => {
  const manifestThemes = Object.keys(manifest.themes).sort();
  assert.deepEqual([...themeDirs].sort(), manifestThemes);
  for (const theme of manifestThemes) {
    assert.ok(pkg.files.includes(theme), `package.json files misses ${theme}`);
    for (const sub of ["", "/tokens", "/base", "/components/*"]) {
      assert.ok(pkg.exports[`./${theme}${sub}`], `package.json exports misses ./${theme}${sub}`);
    }
  }
  assert.equal(pkg.exports["./all"].default, "./all.css");
  assert.equal(pkg.exports["./manifest"], "./manifest.json");
  assert.ok(pkg.files.includes("all.css") && pkg.files.includes("manifest.json"));
});

test("every CSS export carries a types condition so TS 6 side-effect imports resolve", () => {
  // TS >= 6 rejects `import "@lepid-labs/styles/<theme>"` unless the subpath
  // resolves to typed module (TS2882). Each CSS export therefore maps to
  // { types: css.d.ts, default: <css> } — "types" first, because resolvers
  // take the first matching condition.
  for (const [subpath, target] of Object.entries(pkg.exports)) {
    if (subpath === "./manifest") continue;
    assert.equal(typeof target, "object", `${subpath}: not a conditions object`);
    assert.deepEqual(Object.keys(target), ["types", "default"], `${subpath}: condition order`);
    assert.equal(target.types, "./css.d.ts", `${subpath}: types target`);
    assert.match(target.default, /\.css$/, `${subpath}: default must stay the CSS file`);
    if (!subpath.includes("*")) {
      assert.ok(existsSync(join(ROOT, target.default)), `${subpath}: ${target.default} missing`);
    }
  }
  assert.ok(existsSync(join(ROOT, "css.d.ts")));
  assert.ok(pkg.files.includes("css.d.ts"), "css.d.ts must ship in the tarball");
  assert.match(readFileSync(join(ROOT, "css.d.ts"), "utf-8"), /^\s*export \{\};\s*$/m);
});

test("manifest entries are well-formed", () => {
  assert.equal(typeof manifest.contract, "number");
  for (const [theme, entry] of Object.entries(manifest.themes)) {
    assert.ok(["dark", "light"].includes(entry.scheme), `${theme}: bad scheme`);
    assert.ok(Array.isArray(entry.fonts) && entry.fonts.length > 0, `${theme}: no fonts`);
    for (const url of entry.fonts) {
      assert.match(url, /^https:\/\/fonts\.googleapis\.com\/css2\?/, `${theme}: ${url}`);
    }
  }
});

test("all.css imports every theme and nothing else", () => {
  const { imports, selectors } = parseCss(readFileSync(join(ROOT, "all.css"), "utf-8"));
  assert.deepEqual(selectors, []);
  const imported = imports.map((i) => i.match(/"\.\/([^/]+)\/index\.css"/)?.[1]).sort();
  assert.deepEqual(imported, [...themeDirs].sort());
});

for (const theme of themeDirs) {
  const guard = `[data-ld-style="${theme}"]`;

  test(`${theme}: every selector is guarded by its own opt-in attribute`, () => {
    for (const file of themeCssFiles(theme)) {
      const { selectors } = parseCss(readFileSync(file, "utf-8"));
      for (const sel of selectors) {
        assert.ok(sel.includes(guard), `${file}: unguarded selector: ${sel}`);
      }
    }
  });

  test(`${theme}: index.css pulls tokens, base, and every component file`, () => {
    const { imports, selectors } = parseCss(
      readFileSync(join(ROOT, theme, "index.css"), "utf-8")
    );
    assert.deepEqual(selectors, []);
    const names = imports.map((i) => i.match(/"\.\/(.+)\.css"/)?.[1]);
    const expected = themeCssFiles(theme).map((f) =>
      f.slice(join(ROOT, theme).length + 1).replace(/\.css$/, "").split("\\").join("/")
    );
    assert.deepEqual([...names].sort(), [...expected].sort());
  });

  test(`${theme}: declares the full baseline token set and a color-scheme`, () => {
    const tokens = readFileSync(join(ROOT, theme, "tokens.css"), "utf-8");
    const declared = new Set(tokens.match(/--ld-[\w-]+(?=\s*:)/g));
    const missing = REQUIRED_TOKENS.filter((t) => !declared.has(t));
    assert.deepEqual(missing, [], `${theme} misses baseline tokens`);
    assert.match(tokens, /color-scheme:\s*(dark|light)\s*;/);
  });

  test(`${theme}: color-scheme matches the manifest`, () => {
    const tokens = readFileSync(join(ROOT, theme, "tokens.css"), "utf-8");
    const scheme = tokens.match(/color-scheme:\s*(dark|light)/)?.[1];
    assert.equal(scheme, manifest.themes[theme].scheme);
  });
}

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

/** Leaf rules of one CSS file: selector list, declarations, enclosing at-rule preludes. */
function cssRules(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const stack = [];
  let buf = "";
  for (const ch of css) {
    if (ch === "{") {
      stack.push(buf.trim());
      buf = "";
    } else if (ch === "}") {
      const prelude = stack.pop();
      if (prelude !== undefined && !prelude.startsWith("@") && !stack.some((p) => p.startsWith("@keyframes"))) {
        rules.push({ selectors: splitSelectors(prelude), body: buf, at: [...stack] });
      }
      buf = "";
    } else buf += ch;
  }
  return rules;
}

test("the z-index layer scale is identical in every theme and strictly ascending", () => {
  // Overlays from different components must interleave the same way whichever
  // theme is active, so the layer values are structure, not theme character.
  const scales = themeDirs.map((theme) => {
    const tokens = readFileSync(join(ROOT, theme, "tokens.css"), "utf-8");
    return LAYERS.map((l) => Number(tokens.match(new RegExp(`--ld-${l}:\\s*(-?\\d+)\\s*;`))?.[1]));
  });
  for (const [i, scale] of scales.entries()) {
    assert.deepEqual(scale, scales[0], `${themeDirs[i]}: layer values drifted from ${themeDirs[0]}`);
  }
  assert.ok(scales[0].every((v, i) => i === 0 || v > scales[0][i - 1]), `layers out of order: ${scales[0]}`);
});

test("component z-index values come from the layer scale", () => {
  // Only local stacking inside one component (-1, 0, 1) may stay literal;
  // anything that floats over the page takes a --ld-z-* layer.
  for (const theme of themeDirs) {
    for (const file of themeCssFiles(theme)) {
      for (const [, value] of readFileSync(file, "utf-8").matchAll(/z-index:\s*([^;]+);/g)) {
        assert.ok(/^(-?1|0|var\(--ld-z-[\w-]+\))$/.test(value.trim()), `${file}: z-index: ${value}`);
      }
    }
  }
});

test("hover motion is gated on a real hover", () => {
  // Hover Trap: on touch a tap leaves :hover stuck, so a hover rule that moves
  // or animates must sit inside @media (hover: hover). The same affordance
  // reaches the keyboard through a :focus-visible / :focus-within twin.
  const MOTION = /(^|;)\s*(transform|animation)\s*:\s*(?!none\b)[^\s;]/;
  for (const theme of themeDirs) {
    for (const file of themeCssFiles(theme)) {
      for (const rule of cssRules(readFileSync(file, "utf-8"))) {
        if (!MOTION.test(rule.body)) continue;
        const gated = rule.at.some((p) => /@media\s*\(hover:\s*hover\)/.test(p));
        for (const sel of rule.selectors) {
          assert.ok(!sel.includes(":hover") || gated, `${file}: ungated hover motion: ${sel}`);
        }
      }
    }
  }
});

test("every theme carries the interactive-card contract", () => {
  // .ld-card--interactive: the React Card's `interactive` writes the modifier
  // and the caller marks the primary link .ld-card__link, whose ::after is the
  // full-card hit area. Every theme must style the lift, focus ring, press,
  // and nested-control layer, and drop the transform under reduced motion.
  const PARTS = [
    ".ld-card--interactive", ".ld-card--interactive:hover", ".ld-card--interactive .ld-card__link",
    ".ld-card--interactive .ld-card__link::after", ".ld-card--interactive .ld-card__link:focus-visible::after",
    ".ld-card--interactive:has(.ld-card__link:focus-visible)", ".ld-card--interactive:has(.ld-card__link:active)",
    ":not(.ld-card__link)",
  ];
  for (const theme of themeDirs) {
    const rules = cssRules(readFileSync(join(ROOT, theme, "components", "card.css"), "utf-8"));
    const selectors = rules.flatMap((r) => r.selectors);
    for (const part of PARTS) {
      const hits = selectors.filter((s) => s.endsWith(part));
      assert.ok(hits.length > 0, `${theme}: card.css never styles ${part}`);
      for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
    }
    const lift = rules.find((r) => r.selectors.some((s) => s.endsWith(".ld-card--interactive:hover")) && /transform/.test(r.body));
    assert.ok(lift?.at.some((p) => /\(hover:\s*hover\)/.test(p)), `${theme}: card lift is not gated on hover`);
    const still = rules.filter((r) => r.at.some((p) => p.includes("prefers-reduced-motion")) && /transform:\s*none/.test(r.body));
    for (const state of [":hover", ":has(.ld-card__link:focus-visible)", ":has(.ld-card__link:active)"]) {
      assert.ok(
        still.some((r) => r.selectors.some((s) => s.endsWith(`.ld-card--interactive${state}`))),
        `${theme}: the ${state} lift survives reduced motion`,
      );
    }
  }
});

test("every theme carries the form-states contract", () => {
  // Field writes aria-invalid / .ld-field--success and fills the hint and status
  // line; Button writes aria-busy and aria-disabled with a .ld-btn-reason sibling;
  // PasswordField and OtpInput render the parts below. Every theme must style each
  // hook, mark errors with an icon (not colour alone), and keep the busy spinner
  // turning, only slower, under reduced motion.
  const PARTS = {
    field: [
      ".ld-input:where([placeholder]:not(:placeholder-shown))", ".ld-select[aria-invalid=\"true\"]",
      ".ld-field--success .ld-input", ".ld-input:disabled", ".ld-input[readonly]", ".ld-field__hint",
      ".ld-field__message", ".ld-field__message--error", ".ld-field__message--success",
      ".ld-field__message:not(:empty)::before",
    ],
    button: [
      '.ld-btn[aria-busy="true"]', '.ld-btn[aria-busy="true"] > *', '.ld-btn[aria-busy="true"]::after',
      '.ld-btn[aria-disabled="true"]', '.ld-btn[aria-disabled="true"]:focus-visible', ".ld-btn-reason",
    ],
    password: [
      ".ld-password__control", ".ld-password__toggle", ".ld-password__strength", ".ld-password__meter",
      ".ld-password__score", ".ld-password__rules", ".ld-password__rule::before", ".ld-password__rule--met",
      ...[0, 1, 2, 3, 4].map((s) => `.ld-password__meter[data-ld-strength="${s}"] .ld-progress__bar`),
    ],
    otp: [".ld-otp", ".ld-otp .ld-otp__cell", ".ld-otp .ld-otp__cell:placeholder-shown"],
  };
  for (const theme of themeDirs) {
    for (const [name, parts] of Object.entries(PARTS)) {
      const rules = cssRules(readFileSync(join(ROOT, theme, "components", `${name}.css`), "utf-8"));
      const selectors = rules.flatMap((r) => r.selectors);
      for (const part of parts) {
        const hits = selectors.filter((s) => s.endsWith(part));
        assert.ok(hits.length > 0, `${theme}: ${name}.css never styles ${part}`);
        for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
      }
      if (name === "field") {
        const error = rules.find((r) => r.selectors.some((s) => s.endsWith(".ld-field__message--error")));
        assert.match(error?.body ?? "", /--ld-field-icon:\s*url\(/, `${theme}: field errors carry no icon`);
      }
      if (name === "button") {
        const slowed = rules.find(
          (r) => r.at.some((p) => p.includes("prefers-reduced-motion")) && r.selectors.some((s) => s.endsWith('[aria-busy="true"]::after')),
        );
        assert.match(slowed?.body ?? "", /animation-duration/, `${theme}: busy spinner is not slowed under reduced motion`);
      }
    }
  }
});

test("every theme carries the feedback contract", () => {
  // Skeleton, EmptyState, Toaster and SaveStatus write the hooks below. Every
  // theme must style each one, put the toast stack on the toast layer clear of
  // notches, stop the undo countdown with the stack, still the skeleton shimmer
  // under reduced motion, and slow (never stop) the saving spinner.
  const SAVE = ["idle", "pending", "saving", "saved", "offline", "error"].map((s) => `.ld-save-status[data-ld-save="${s}"]`);
  const PARTS = {
    skeleton: [".ld-skeleton", ".ld-skeleton--text", ".ld-skeleton--circle", ".ld-skeleton--block"],
    empty: [
      ".ld-empty", ".ld-empty__icon", ".ld-empty__title", ".ld-empty__body", ".ld-empty__actions",
      ".ld-empty--first-use .ld-empty__icon", ".ld-empty--no-results .ld-empty__icon", ".ld-empty--cleared .ld-empty__icon",
    ],
    toast: [
      ".ld-toaster", ".ld-toast", ".ld-toast::before", ".ld-toast--success", ".ld-toast--warning", ".ld-toast--danger",
      ".ld-toast__body", ".ld-toast__title", ".ld-toast__countdown", ".ld-toaster[data-ld-paused] .ld-toast__countdown",
    ],
    "save-status": [".ld-save-status", ".ld-save-status::before", ...SAVE, ".ld-save-status__retry"],
  };
  const find = (rules, end, at) =>
    rules.find((r) => r.selectors.some((s) => s.endsWith(end)) && (!at || r.at.some((p) => p.includes(at))));
  for (const theme of themeDirs) {
    const rules = {};
    for (const [name, parts] of Object.entries(PARTS)) {
      rules[name] = cssRules(readFileSync(join(ROOT, theme, "components", `${name}.css`), "utf-8"));
      const selectors = rules[name].flatMap((r) => r.selectors);
      for (const part of parts) {
        const hits = selectors.filter((s) => s.includes(part));
        assert.ok(hits.length > 0, `${theme}: ${name}.css never styles ${part}`);
        for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
      }
    }
    const stack = find(rules.toast, ".ld-toaster")?.body ?? "";
    assert.match(stack, /z-index:\s*var\(--ld-z-toast\)/, `${theme}: the toast stack is not on the toast layer`);
    assert.match(stack, /env\(safe-area-inset-bottom\)/, `${theme}: the toast stack ignores the safe area`);
    assert.match(find(rules.toast, "[data-ld-paused] .ld-toast__countdown")?.body ?? "", /animation-play-state:\s*paused/, `${theme}: the countdown runs on while paused`);
    assert.match(find(rules.skeleton, ".ld-skeleton", "prefers-reduced-motion")?.body ?? "", /animation:\s*none/, `${theme}: the skeleton shimmer survives reduced motion`);
    assert.match(
      find(rules["save-status"], '[data-ld-save="saving"]::before', "prefers-reduced-motion")?.body ?? "",
      /animation-duration/,
      `${theme}: the saving spinner is not slowed under reduced motion`,
    );
  }
});

test("every theme carries the overlays contract", () => {
  // Tooltip, Menu/ContextMenu, Sheet, CommandPalette and SearchInput write the
  // hooks below. Every theme must style each one, put floating parts on their
  // layer, slide sheets in with @starting-style and clear the safe area, still the
  // motion under reduced motion, and drop the UA popover box under the toaster.
  const PARTS = {
    kbd: [".ld-kbd"],
    tooltip: [".ld-tooltip", '.ld-tooltip[data-ld-side="bottom"]', ".ld-tooltip:not(:popover-open)"],
    menu: [
      ".ld-menu", '.ld-menu[data-ld-side="top"]', ".ld-menu__item", ".ld-menu__item:focus", ".ld-menu__item--danger",
      '.ld-menu__item[aria-disabled="true"]', ".ld-menu__icon", ".ld-menu__label", ".ld-menu__shortcut",
      '.ld-menu__item[role="menuitemcheckbox"]::before', '.ld-menu__item[role="menuitemradio"]::before',
      ".ld-menu__group-label", ".ld-menu__separator", ".ld-context-target",
    ],
    sheet: [
      ".ld-dialog--sheet", ".ld-dialog--drawer", ".ld-dialog--drawer-start", ".ld-dialog--sheet:not([open])",
      ".ld-dialog--sheet::backdrop", ".ld-dialog__handle", ".ld-dialog__handle:active",
    ],
    command: [
      ".ld-command", ".ld-command__search", ".ld-command__icon", ".ld-command__input", ".ld-command__list",
      ".ld-command__group-label", ".ld-command__option", '.ld-command__option[aria-selected="true"]',
      '.ld-command__option[aria-disabled="true"]', ".ld-command__option-icon", ".ld-command__label",
      ".ld-command__loading",
    ],
    search: [
      ".ld-search", ".ld-search__input", ".ld-search__icon", ".ld-search__hint", ".ld-search__clear",
      ".ld-search:has(.ld-search__input:placeholder-shown) .ld-search__clear", ".ld-match",
    ],
  };
  const body = (rules, end, at) =>
    rules.find((r) => r.selectors.some((s) => s.endsWith(end)) && (!at || r.at.some((p) => p.includes(at))))?.body ?? "";
  for (const theme of themeDirs) {
    const rules = {};
    for (const [name, parts] of Object.entries(PARTS)) {
      const file = join(ROOT, theme, "components", `${name}.css`);
      assert.ok(existsSync(file), `${theme}: components/${name}.css missing`);
      rules[name] = cssRules(readFileSync(file, "utf-8"));
      const selectors = rules[name].flatMap((r) => r.selectors);
      for (const part of parts) {
        const hits = selectors.filter((s) => s.endsWith(part));
        assert.ok(hits.length > 0, `${theme}: ${name}.css never styles ${part}`);
        for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
      }
    }
    assert.match(body(rules.tooltip, ".ld-tooltip"), /z-index:\s*var\(--ld-z-tooltip\)/, `${theme}: tooltip is not on the tooltip layer`);
    assert.match(body(rules.tooltip, ".ld-tooltip"), /position-area:/, `${theme}: tooltip is not anchor-positioned`);
    assert.match(body(rules.menu, ".ld-menu"), /z-index:\s*var\(--ld-z-dropdown\)/, `${theme}: menu is not on the dropdown layer`);
    assert.match(body(rules.menu, ".ld-menu"), /position-try-fallbacks:/, `${theme}: menu never flips at the edge`);
    assert.ok(
      rules.sheet.some((r) => r.selectors.some((s) => s.endsWith(".ld-dialog--sheet")) && /env\(safe-area-inset-bottom\)/.test(r.body)),
      `${theme}: sheet ignores the safe area`,
    );
    assert.match(body(rules.sheet, ".ld-dialog--sheet[open]", "@starting-style"), /translate:/, `${theme}: sheet does not slide in`);
    assert.match(body(rules.sheet, ".ld-dialog--sheet:not([open])", "prefers-reduced-motion"), /translate:\s*none/, `${theme}: sheet slides under reduced motion`);
    assert.match(body(rules.sheet, ".ld-dialog__handle"), /touch-action:\s*none/, `${theme}: the handle scrolls instead of dragging`);
    const toaster = cssRules(readFileSync(join(ROOT, theme, "components", "toast.css"), "utf-8"));
    assert.match(body(toaster, ".ld-toaster"), /inset:\s*auto[\s\S]*margin:\s*0/, `${theme}: the toaster keeps the UA popover box`);
  }
});

test("every theme carries the data contract", () => {
  // SortHeader, the selection cells, BulkActionBar, Pagination, the chips and the
  // charts write the hooks below. Every theme must style each one, keep the sticky
  // header and the bulk bar on the sticky layer (the bar in the flow, clear of the
  // home indicator, with scroll padding so focus is not hidden under it), mark a
  // pressed chip with an icon, and tell chart series apart by dash, not hue alone.
  const PARTS = {
    table: [
      ".ld-table .ld-num", ".ld-table--sticky thead th", ".ld-table--compact", ".ld-table--comfortable",
      ".ld-table-scroll", ".ld-table__sort", ".ld-table__sort:focus-visible", ".ld-table__sort-icon",
      '.ld-table th[aria-sort="ascending"] .ld-table__sort-asc', '.ld-table th[aria-sort="descending"] .ld-table__sort-desc',
      ".ld-table .ld-table__select", ".ld-table__select-hit", '.ld-table tbody tr[aria-selected="true"]',
    ],
    form: [".ld-checkbox:indeterminate"],
    "bulk-bar": [".ld-bulk-bar", ".ld-bulk-bar[hidden]", ".ld-bulk-bar--top", ".ld-bulk-bar__count", ".ld-bulk-bar__actions"],
    pagination: [
      ".ld-pagination__list", ".ld-pagination__link", ".ld-pagination__link:focus-visible",
      '.ld-pagination__link[aria-current="page"]', '.ld-pagination__link[aria-disabled="true"]',
      ".ld-pagination__ellipsis", ".ld-pagination__text", ".ld-pagination-bar", ".ld-pagination__summary",
      ".ld-pagination__size", ".ld-load-more",
    ],
    chip: [
      ".ld-chip", ".ld-chip:focus-visible", '.ld-chip[aria-pressed="true"]', '.ld-chip[aria-pressed="true"]::before',
      ".ld-chip:disabled", ".ld-chip--removable", ".ld-chip__remove", ".ld-chip__remove:focus-visible",
      ".ld-chip-group", ".ld-chip-group__chips", ".ld-chip-group__count", ".ld-chip-group--scroll .ld-chip-group__chips",
    ],
    chart: [
      ".ld-chart", ".ld-chart__title", ".ld-chart__svg", ".ld-chart__grid", ".ld-chart__baseline", ".ld-chart__tick",
      ".ld-chart__axis-label", ".ld-chart__break", ".ld-chart__bar", ".ld-chart__bar--highlight", ".ld-chart__value",
      ".ld-chart__line", ".ld-chart__points", ".ld-chart__label", ".ld-chart__data > summary",
      ".ld-sparkline", ".ld-sparkline__line", ".ld-sparkline__dot", ".ld-sparkline__value",
    ],
  };
  const body = (rules, end, at) =>
    rules.find((r) => r.selectors.some((s) => s.endsWith(end)) && (!at || r.at.some((p) => p.includes(at))))?.body ?? "";
  for (const theme of themeDirs) {
    const rules = {};
    for (const [name, parts] of Object.entries(PARTS)) {
      const file = join(ROOT, theme, "components", `${name}.css`);
      assert.ok(existsSync(file), `${theme}: components/${name}.css missing`);
      rules[name] = cssRules(readFileSync(file, "utf-8"));
      const selectors = rules[name].flatMap((r) => r.selectors);
      for (const part of parts) {
        const hits = selectors.filter((s) => s.endsWith(part));
        assert.ok(hits.length > 0, `${theme}: ${name}.css never styles ${part}`);
        for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
      }
    }
    const sticky = body(rules.table, ".ld-table--sticky thead th");
    assert.match(sticky, /position:\s*sticky[\s\S]*z-index:\s*var\(--ld-z-sticky\)/, `${theme}: the sticky header is not on the sticky layer`);
    const bar = body(rules["bulk-bar"], ".ld-bulk-bar");
    assert.match(bar, /position:\s*sticky/, `${theme}: the bulk bar leaves the flow (it would cover the last row)`);
    assert.match(bar, /z-index:\s*var\(--ld-z-sticky\)/, `${theme}: the bulk bar is not on the sticky layer`);
    assert.match(bar, /env\(safe-area-inset-bottom\)/, `${theme}: the bulk bar ignores the safe area`);
    assert.match(body(rules["bulk-bar"], ".ld-bulk-bar[hidden]"), /display:\s*none/, `${theme}: an empty bulk bar still shows`);
    assert.ok(
      rules["bulk-bar"].some((r) => r.selectors.some((s) => s.includes(":root:has(.ld-bulk-bar")) && /scroll-padding/.test(r.body)),
      `${theme}: focus can scroll under the bulk bar`,
    );
    assert.match(body(rules["bulk-bar"], ".ld-bulk-bar", "prefers-reduced-motion"), /translate:\s*none/, `${theme}: the bulk bar slides under reduced motion`);
    assert.match(body(rules.chip, '.ld-chip[aria-pressed="true"]::before'), /mask:\s*url\(/, `${theme}: a pressed chip differs by colour alone`);
    for (const k of [1, 2, 3]) {
      assert.match(body(rules.chart, `.ld-chart__series--${k}`), /--ld-chart-dash:/, `${theme}: chart series ${k} differs by colour alone`);
    }
    for (const k of [1, 2, 3, 4]) assert.match(body(rules.chart, ".ld-chart"), new RegExp(`--ld-chart-${k}:`), `${theme}: --ld-chart-${k} missing`);
  }
});

/** WCAG contrast ratio of two #rrggbb colours. */
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("every theme carries the surfaces contract", () => {
  // Accordion, InlineEdit, StarRating, the settings layout and PresenceCursors /
  // AvatarStack write the hooks below. Every theme must style each one, open the
  // accordion smoothly only where it can (and not under reduced motion) with the
  // chevron on the panel's own timing, swap inline-edit text for an input in one
  // shared box, show the edit pencil on touch, keep hover previews behind a real
  // hover, stick the settings nav only when there is room, and keep presence on
  // its layer, out of the way of clicks, in colours that hold contrast.
  const PARTS = {
    accordion: [
      ".ld-accordion", ".ld-accordion__item", ".ld-accordion__summary", ".ld-accordion__summary::-webkit-details-marker",
      ".ld-accordion__summary:focus-visible", ".ld-accordion__panel", ".ld-accordion__item::details-content",
      ".ld-accordion__item[open]::details-content",
    ],
    "inline-edit": [
      ".ld-inline-edit", ".ld-inline-edit__display", ".ld-inline-edit__input", ".ld-inline-edit__display:focus-visible",
      '.ld-inline-edit__input[aria-invalid="true"]', ".ld-inline-edit__text", ".ld-inline-edit__text--empty",
      ".ld-inline-edit--multiline .ld-inline-edit__input", ".ld-inline-edit__icon",
      '.ld-inline-edit[data-ld-edit="saving"] .ld-inline-edit__icon', ".ld-inline-edit[data-ld-saved] .ld-inline-edit__icon",
    ],
    rating: [
      ".ld-rating", ".ld-rating__legend", ".ld-rating__option", ".ld-rating__input", ".ld-rating__option:has(:focus-visible)",
      ".ld-rating__glyph", ".ld-rating__glyph::before", ".ld-rating__glyph::after", ".ld-rating__option:has(:checked) .ld-rating__glyph",
      ".ld-rating__value", ".ld-rating__clear", ".ld-rating--display", ".ld-rating__stars", ".ld-rating__count",
    ],
    settings: [
      ".ld-settings", ".ld-settings__nav", ".ld-settings__body", ".ld-settings__link", ".ld-settings__link:focus-visible",
      ".ld-settings__link[aria-current]", ".ld-settings__section", ".ld-settings__header", ".ld-settings__title",
      ".ld-settings__description", ".ld-settings__row", ".ld-settings__label", ".ld-settings__hint", ".ld-settings__control",
      ".ld-settings__section--danger",
    ],
    presence: [
      ".ld-presence", ".ld-cursor", ".ld-cursor[data-ld-idle]", ".ld-cursor__pointer", ".ld-cursor__name", ".ld-avatar-stack",
      ".ld-avatar", ".ld-avatar__img", ".ld-avatar--overflow", ...[1, 2, 3, 4, 5, 6, 7, 8].map((k) => `.ld-cursor[data-ld-color="${k}"]`),
    ],
  };
  const body = (rules, end, at) =>
    rules.find((r) => r.selectors.some((s) => s.endsWith(end)) && (!at || r.at.some((p) => p.includes(at))))?.body ?? "";
  const timing = (css) => css.match(/var\(--ld-duration-\w+\)\s+var\(--ld-ease-\w+\)/)?.[0];
  for (const theme of themeDirs) {
    const rules = {};
    for (const [name, parts] of Object.entries(PARTS)) {
      const file = join(ROOT, theme, "components", `${name}.css`);
      assert.ok(existsSync(file), `${theme}: components/${name}.css missing`);
      rules[name] = cssRules(readFileSync(file, "utf-8"));
      const selectors = rules[name].flatMap((r) => r.selectors);
      for (const part of parts) {
        const hits = selectors.filter((s) => s.endsWith(part));
        assert.ok(hits.length > 0, `${theme}: ${name}.css never styles ${part}`);
        for (const sel of hits) assert.ok(sel.includes(`[data-ld-style="${theme}"]`), `${theme}: unguarded selector: ${sel}`);
      }
    }
    const acc = rules.accordion;
    assert.match(body(acc, ".ld-accordion__item"), /interpolate-size:\s*allow-keywords/, `${theme}: the accordion cannot animate to auto`);
    const panel = body(acc, ".ld-accordion__item::details-content", "@supports");
    assert.match(panel, /block-size:\s*0/, `${theme}: the accordion panel is not animated behind @supports`);
    const chevron = acc.find((r) => r.selectors.some((s) => /\[open\] > \.ld-accordion__summary::(before|after)$/.test(s)));
    assert.match(chevron?.body ?? "", /rotate:/, `${theme}: the chevron does not turn`);
    const turn = acc.find((r) => r.selectors.some((s) => /\.ld-accordion__summary::(before|after)$/.test(s) && !s.includes("[open]")) && /transition:/.test(r.body));
    assert.equal(timing(turn?.body ?? ""), timing(panel), `${theme}: the chevron and the panel run on different timings`);
    assert.match(body(acc, "::details-content", "prefers-reduced-motion"), /transition:\s*none/, `${theme}: the accordion animates under reduced motion`);

    const edit = rules["inline-edit"];
    const shared = edit.find((r) => r.selectors.some((s) => s.endsWith(".ld-inline-edit__display")) && r.selectors.some((s) => s.endsWith(".ld-inline-edit__input")) && /font:\s*inherit/.test(r.body));
    assert.ok(shared && /padding:/.test(shared.body) && /border:/.test(shared.body), `${theme}: the inline-edit text and input do not share one box`);
    assert.match(body(edit, ".ld-inline-edit__icon", "(hover: none)"), /opacity:\s*1/, `${theme}: the edit pencil is hover-only`);
    assert.match(body(edit, '[data-ld-edit="saving"] .ld-inline-edit__icon', "prefers-reduced-motion"), /animation-duration/, `${theme}: the saving spinner is not slowed under reduced motion`);

    for (const r of rules.rating) {
      if (r.selectors.some((s) => s.includes(":hover"))) assert.ok(r.at.some((p) => /\(hover:\s*hover\)/.test(p)), `${theme}: the rating preview is not gated on a real hover`);
    }
    const has = (end, re) => rules.rating.some((r) => r.selectors.some((s) => s.endsWith(end)) && re.test(r.body));
    assert.ok(has(".ld-rating__glyph::after", /clip-path:[^;]*--ld-fill/), `${theme}: stars do not fill fractionally`);
    assert.ok(has(".ld-rating__glyph::before", /mask:[^;]*--ld-star-outline/), `${theme}: an empty star differs by colour alone`);

    const sticky = rules.settings.filter((r) => /position:\s*sticky/.test(r.body));
    assert.ok(sticky.length > 0 && sticky.every((r) => r.at.some((p) => p.startsWith("@container"))), `${theme}: the settings nav sticks without room for it`);

    const layer = rules.presence.find((r) => r.selectors.some((s) => s.endsWith(".ld-presence")) && /z-index/.test(r.body))?.body ?? "";
    assert.match(layer, /z-index:\s*var\(--ld-z-sticky\)/, `${theme}: presence is not on the sticky layer`);
    assert.match(layer, /pointer-events:\s*none/, `${theme}: remote cursors take clicks`);
    assert.match(body(rules.presence, ".ld-cursor[data-ld-idle]"), /opacity:\s*0/, `${theme}: idle cursors never fade`);
    const tokens = readFileSync(join(ROOT, theme, "tokens.css"), "utf-8");
    const grounds = ["bg", "bg-blend", "surface", "sky-start", "sky-end"]
      .map((n) => tokens.match(new RegExp(`--ld-${n}:\\s*(#[0-9a-f]{6})\\s*;`, "i"))?.[1])
      .filter(Boolean);
    const palette = rules.presence.find((r) => /--ld-presence-ink:/.test(r.body))?.body ?? "";
    const ink = palette.match(/--ld-presence-ink:\s*(#[0-9a-f]{6})/i)?.[1];
    assert.ok(ink, `${theme}: --ld-presence-ink missing`);
    for (let k = 1; k <= 8; k++) {
      const hue = palette.match(new RegExp(`--ld-presence-${k}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
      assert.ok(hue, `${theme}: --ld-presence-${k} missing`);
      for (const g of grounds) assert.ok(contrast(hue, g) >= 3, `${theme}: presence ${k} ${hue} is under 3:1 on ${g}`);
      assert.ok(contrast(hue, ink) >= 4.5, `${theme}: name tags on presence ${k} ${hue} are under 4.5:1`);
    }
  }
});

test("keyframe names are ld-prefixed and unique across all themes", () => {
  const seen = new Map();
  for (const theme of themeDirs) {
    for (const file of themeCssFiles(theme)) {
      for (const name of parseCss(readFileSync(file, "utf-8")).keyframes) {
        assert.match(name, /^ld-/, `${file}: keyframe ${name}`);
        assert.ok(!seen.has(name), `keyframe ${name} in both ${seen.get(name)} and ${file}`);
        seen.set(name, file);
      }
    }
  }
});

test("no legacy nb- prefix survives anywhere the system is defined or documented", () => {
  // The 0.3.x → 1.0.0 rename must be total: a stray --nb-* token, .nb-* class,
  // or data-nb-style guard would silently do nothing under the ld- guard.
  // Keyframe names legitimately keep an inner theme tag (ld-nb-spin), so the
  // check requires nb- to start an identifier.
  const LEGACY = /--nb-|data-nb-|\bnbStyle\b|(?<![\w-])nb-/;
  const REPO = resolve(ROOT, "..");
  const roots = [ROOT, join(REPO, "components/react/src"), join(REPO, "site"), join(REPO, "skills")];
  const files = [join(REPO, "README.md")];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === "test" || e.name === "styles" && dir === join(REPO, "site")) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(css|md|html|tsx?|json)$/.test(e.name)) files.push(p);
    }
  };
  roots.forEach(walk);
  // The README's migration section is the one place the old prefix belongs.
  const MIGRATION = /### Migrating from 0\.3\.x[\s\S]*?(?=\n### )/;
  const offenders = files.filter((f) =>
    LEGACY.test(readFileSync(f, "utf-8").replace(MIGRATION, ""))
  );
  assert.deepEqual(offenders.map((f) => f.slice(REPO.length + 1)), []);
});
