// The consumer codemod (scripts/rename-nb-prefix.sh) is the migration path
// from 0.3.x to 1.0.0, so its rewrite rules are pinned here: every kind of
// identifier converts, theme-tagged keyframe names keep their inner tag, and
// running it twice is a no-op.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = resolve(fileURLToPath(import.meta.url), "../../../scripts/rename-nb-prefix.sh");

function codemod(files) {
  const dir = mkdtempSync(join(tmpdir(), "nb-codemod-"));
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  execFileSync("bash", [SCRIPT, dir], { stdio: ["ignore", "ignore", "inherit"] });
  return Object.fromEntries(
    Object.keys(files).map((name) => [name, readFileSync(join(dir, name), "utf-8")])
  );
}

test("renames tokens, classes, and the style attribute in CSS", () => {
  const out = codemod({
    "theme.css": [
      ':where([data-nb-style="summer-cloud"]) { --nb-bg: #fff; --nb-space-2: 8px; }',
      ':where([data-nb-style="summer-cloud"] *).nb-btn.nb-btn--sm { padding: var(--nb-space-2); }',
    ].join("\n"),
  });
  assert.equal(
    out["theme.css"],
    [
      ':where([data-ld-style="summer-cloud"]) { --ld-bg: #fff; --ld-space-2: 8px; }',
      ':where([data-ld-style="summer-cloud"] *).ld-btn.ld-btn--sm { padding: var(--ld-space-2); }',
    ].join("\n")
  );
});

test("keyframes keep their theme tag: nb-nb-* becomes ld-nb-*", () => {
  const out = codemod({
    "anim.css": "@keyframes nb-nb-pulse-glow {} @keyframes nb-lp-spin {}\n.nb-spinner { animation: nb-nb-spin 1s; }",
  });
  assert.equal(
    out["anim.css"],
    "@keyframes ld-nb-pulse-glow {} @keyframes ld-lp-spin {}\n.ld-spinner { animation: ld-nb-spin 1s; }"
  );
});

test("rewrites markup, JSX class strings, and prose across file types", () => {
  const out = codemod({
    "index.html": '<html data-nb-style="neon-butterfly"><body class="nb-bg"><a class="nb-link nb-btn--primary">',
    "src/Button.tsx": 'const classes = ["nb-btn"]; classes.push(`nb-btn--${variant}`);',
    "docs/README.md": "Use `--nb-*` tokens and `nb-*` classes; set `data-nb-style`.",
    "notes.rst": ".nb-card is not touched: unknown extension",
  });
  assert.equal(out["index.html"], '<html data-ld-style="neon-butterfly"><body class="ld-bg"><a class="ld-link ld-btn--primary">');
  assert.equal(out["src/Button.tsx"], 'const classes = ["ld-btn"]; classes.push(`ld-btn--${variant}`);');
  assert.equal(out["docs/README.md"], "Use `--ld-*` tokens and `ld-*` classes; set `data-ld-style`.");
  assert.equal(out["notes.rst"], ".nb-card is not touched: unknown extension");
});

test("leaves words that merely contain nb- alone", () => {
  const out = codemod({ "a.css": ".thumbnb-x { } /* unb-ound, snb-1 */" });
  assert.equal(out["a.css"], ".thumbnb-x { } /* unb-ound, snb-1 */");
});

test("is idempotent", () => {
  const once = codemod({ "t.css": ".nb-card { color: var(--nb-primary); animation: nb-nb-spin 1s; }" });
  const twice = codemod({ "t.css": once["t.css"] });
  assert.equal(twice["t.css"], once["t.css"]);
  assert.equal(once["t.css"], ".ld-card { color: var(--ld-primary); animation: ld-nb-spin 1s; }");
});
