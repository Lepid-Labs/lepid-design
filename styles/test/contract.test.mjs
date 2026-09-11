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

// Baseline token set every theme must declare. Additions here are a contract
// change: bump manifest.json's "contract" and update consumers.
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
