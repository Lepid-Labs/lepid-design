// Type declaration for every CSS entry point in this package.
//
// TypeScript >= 6 (and 5.6+ with noUncheckedSideEffectImports) requires a
// side-effect import such as `import "@lepid-labs/styles/neon-butterfly"` to
// resolve to a module with types. CSS files have none, so every CSS subpath
// in package.json's "exports" carries a "types" condition pointing here.
// Bundlers and Node keep resolving the "default" condition to the .css file.
export {};
