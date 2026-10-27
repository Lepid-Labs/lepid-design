// Shared by the theme contract suite (contract/*.test.mjs): the package files it reads, the
// baseline token set, and the small CSS parsers the rules are checked with.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
export const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf-8"));
export const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
export const themeDirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "test" && e.name !== "node_modules")
  .map((e) => e.name);

// The z-index layers, bottom to top. Identical in every theme (foundation.test.mjs).
export const LAYERS = ["z-base", "z-sticky", "z-header", "z-dropdown", "z-overlay", "z-modal", "z-toast", "z-tooltip"];

// Baseline token set every theme must declare. Additions here are a contract
// change: bump manifest.json's "contract" and update consumers. Contract 2
// added the motion, elevation, and z-index layer scales.
export const REQUIRED_TOKENS = [
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
export function splitSelectors(prelude) {
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
export function parseCss(css) {
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

export function themeCssFiles(theme) {
  const dir = join(ROOT, theme);
  const files = ["tokens.css", "base.css"];
  for (const f of readdirSync(join(dir, "components"))) {
    if (f.endsWith(".css")) files.push(join("components", f));
  }
  return files.map((f) => join(dir, f));
}

/** Leaf rules of one CSS file: selector list, declarations, enclosing at-rule preludes. */
export function cssRules(css) {
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

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
