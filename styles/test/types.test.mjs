// The TS 6 consumer check, run against the real compiler. A consumer on
// TypeScript >= 6 (or 5.6+ with noUncheckedSideEffectImports, which is the
// same check) must be able to side-effect-import every CSS entry point
// without a local `declare module` shim (issue #10). The fixture is a
// minimal app with this package linked into node_modules.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const TSC = createRequire(import.meta.url).resolve("typescript/bin/tsc");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));

const TSCONFIG = {
  compilerOptions: {
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "bundler",
    strict: true,
    noEmit: true,
    resolveJsonModule: true,
    noUncheckedSideEffectImports: true,
    skipLibCheck: true,
  },
  include: ["src"],
};

/** Every concrete CSS subpath in exports, with the wildcards expanded to one real file. */
function cssSubpaths() {
  return Object.keys(pkg.exports)
    .filter((k) => k !== "./manifest")
    .map((k) => (k.includes("*") ? k.replace("*", "button") : k))
    .map((k) => `${pkg.name}${k.slice(1)}`);
}

/** Builds a throwaway consumer; `packageJson` lets a test ship a variant of ours. */
function fixture(packageJson, source) {
  const dir = mkdtempSync(join(tmpdir(), "ld-types-"));
  const link = join(dir, "node_modules", ...pkg.name.split("/"));
  mkdirSync(dirname(link), { recursive: true });
  mkdirSync(join(dir, "src"));
  if (packageJson === pkg) {
    symlinkSync(ROOT, link, "dir");
  } else {
    // A modified package.json needs a real directory: link every file we ship
    // and drop the variant manifest on top.
    mkdirSync(link);
    for (const entry of pkg.files) symlinkSync(join(ROOT, entry), join(link, entry));
    writeFileSync(join(link, "package.json"), JSON.stringify(packageJson));
  }
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(TSCONFIG));
  writeFileSync(join(dir, "src", "main.ts"), source);
  return dir;
}

function tsc(dir) {
  const r = spawnSync(process.execPath, [TSC, "-p", dir], { encoding: "utf-8" });
  return { status: r.status, out: r.stdout + r.stderr };
}

test("every CSS entry point side-effect-imports cleanly under the TS 6 check", () => {
  const imports = cssSubpaths().map((s) => `import "${s}";`);
  const source = [
    ...imports,
    `import manifest from "${pkg.name}/manifest";`,
    "const _themes: string[] = Object.keys(manifest.themes);",
  ].join("\n");
  const { status, out } = tsc(fixture(pkg, source));
  assert.equal(status, 0, out);
});

test("the check is live: without the types condition the same imports fail", () => {
  // Guards the test itself — if the compiler flag ever stopped biting, the
  // positive test above would pass vacuously.
  const stripped = {
    ...pkg,
    exports: Object.fromEntries(
      Object.entries(pkg.exports).map(([k, v]) => [k, typeof v === "object" ? v.default : v])
    ),
  };
  const { status, out } = tsc(fixture(stripped, `import "${pkg.name}/neon-butterfly";`));
  assert.notEqual(status, 0);
  assert.match(out, /TS2(307|882)/, out);
});
