#!/usr/bin/env bash
# rename-nb-prefix.sh — codemod: nb- → ld- (ui-std-lib 0.3.x → 1.0.0)
#
# Rewrites every design-system identifier in place:
#   --nb-<token>          → --ld-<token>
#   data-nb-style         → data-ld-style
#   nb-<class|keyframe>   → ld-<...>   (only where nb- starts an identifier)
#
# Theme-scoped keyframe names keep their inner theme tag: nb-nb-pulse-glow
# becomes ld-nb-pulse-glow, nb-lp-spin becomes ld-lp-spin. The script is
# idempotent — running it twice changes nothing the second time.
#
# Usage:
#   scripts/rename-nb-prefix.sh <path>...
# Each path is a file or a directory (walked recursively; node_modules, .git,
# and dist are skipped). Only text files with these extensions are touched:
#   css scss html htm js jsx ts tsx mjs cjs svelte vue astro md mdx json txt
#
# Requires perl (preinstalled on macOS and every mainstream Linux).
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "usage: $0 <file-or-dir>..." >&2
  exit 2
fi

EXTS=(css scss html htm js jsx ts tsx mjs cjs svelte vue astro md mdx json txt)

rewrite() {
  perl -pi -e '
    s/--nb-/--ld-/g;
    s/data-nb-style/data-ld-style/g;
    s/(?<![\w-])nb-/ld-/g;
  ' "$@"
}

files=()
for target in "$@"; do
  if [[ -d "$target" ]]; then
    name_args=()
    for ext in "${EXTS[@]}"; do name_args+=(-o -name "*.${ext}"); done
    while IFS= read -r -d '' f; do files+=("$f"); done < <(
      find "$target" \
        \( -name node_modules -o -name .git -o -name dist \) -prune -o \
        -type f \( -false "${name_args[@]}" \) -print0
    )
  elif [[ -f "$target" ]]; then
    files+=("$target")
  else
    echo "skip: $target is not a file or directory" >&2
  fi
done

if [[ ${#files[@]} -eq 0 ]]; then
  echo "nothing to rewrite" >&2
  exit 0
fi

rewrite "${files[@]}"
echo "rewrote ${#files[@]} file(s)"
