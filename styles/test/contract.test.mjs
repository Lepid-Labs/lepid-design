// The theme contract, enforced. Every theme must be:
//  - scoped: no rule applies without a data-ld-style="<theme>" opt-in,
//  - collision-free: keyframe names unique across themes,
//  - complete: the shared baseline token set fully declared,
//  - registered: manifest.json, package.json files/exports, and the theme
//    directories all agree.
// A new theme that passes this suite works in every consumer that reads the
// manifest — that is the whole point of the contract.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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
  assert.equal(pkg.exports["./all"], "./all.css");
  assert.equal(pkg.exports["./manifest"], "./manifest.json");
  assert.ok(pkg.files.includes("all.css") && pkg.files.includes("manifest.json"));
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
  const LEGACY = /--nb-|data-nb-|(?<![\w-])nb-/;
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
