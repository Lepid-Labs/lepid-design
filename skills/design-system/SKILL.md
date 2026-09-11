---
name: design-system
description: Use the Lepid Design system when building or restyling UI in any Lepid Labs app. Trigger whenever creating pages, components, forms, dialogs, or styling in these repos — the app should consume @lepid-labs/styles and @lepid-labs/ui-react rather than ad-hoc CSS or one-off components.
---

# Using the Lepid Design system

All Lepid Labs apps standardize their UX on `lepid-design`
(github.com/lepid-labs/lepid-design). Never write ad-hoc colors, fonts, or
component styles in an app — consume the system.

## Rules

1. **Tokens, not literals.** Use `--ld-*` custom properties for every color,
   font, radius, and spacing value. If a needed token doesn't exist, propose
   adding it to `lepid-design` rather than hardcoding.
2. **Existing components first.** Before building UI, check the component
   inventory below. App-local components are only for genuinely app-specific
   composites — and should still be built from `ld-*` classes.
3. **Read the style's `design.md`** before designing new screens — it states
   the aesthetic rules that the CSS alone does not encode.
4. **Gaps go upstream.** A missing component belongs in `lepid-design` as a PR,
   not in the app. File an issue on `lepid-labs/lepid-design` if not building it now.

## Consuming

Every rule is scoped: nothing applies until an element carries
`data-ld-style="<theme>"`. Put it on `<html>` for a page the app owns, or on a
mount container to theme one subtree (embed-safe: the CSS is inert everywhere
else, and the `:where()` guards are zero-specificity so any consumer rule
overrides). Several themes can load together; swapping is an attribute flip.

React apps:

```tsx
import "@lepid-labs/styles/luminous-precision"; // one theme…
import "@lepid-labs/styles/all";                // …or all of them, for runtime switching
import { Button, Card, Dialog, Tabs, Field, Input, Alert } from "@lepid-labs/ui-react";
```

```html
<html data-ld-style="luminous-precision">
```

Themes are drop-in swappable: all define the same `--ld-*` baseline tokens
(enforced by the contract test — including `--ld-code-*` syntax colors and a
`color-scheme`) and the same `ld-*` classes, so changing the attribute restyles
the app without touching markup.

`@lepid-labs/styles/manifest` is the machine-readable roster — theme names,
scheme (`dark`/`light`), and Google Fonts URLs. Validate configured theme names
and inject font links from it rather than hardcoding lists, so new themes work
by name alone.

Both packages are on the public npm registry — no `.npmrc` needed.

Plain HTML / no-build apps (jsDelivr, pin a tag):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lepid-labs/lepid-design@v1.0.0/styles/luminous-precision/index.css">
```

Include the theme's webfont links (URLs in the manifest) — the system does not
bundle fonts. `summer-cloud` also wants `.ld-bg` on `<body>` for its sky
gradient.

## Component inventory

React exports (each renders the matching `ld-*` CSS class, usable directly in
non-React apps):

| React | CSS class | Notes |
| --- | --- | --- |
| `Button` | `.ld-btn` | variants: `primary`, `accent`, `danger` |
| `HoldButton` | `.ld-btn--hold` | hold-to-confirm; `onConfirm` fires once when the ring completes; `duration`, `hint`, `icon`, `showMeter`, `confirmOnKeyboardTap` |
| `Card` | `.ld-card` | glass panel |
| `StatusCard` | `.ld-status-card` | dashboard card: `tone` edge, `attention` ring, `changedAt` flash, `prefix`/`title`/`href`, `meta`, `note`, `watermark`; body from `StatusCardRows`/`StatusCardRow`/`StatusCardFooter`/`StatusCardEmpty` |
| `NavLink` | `.ld-link` | chevron + glow hover |
| `Input`/`Textarea`/`Select` | `.ld-input` etc. | pair with `Field`/`Label` |
| `Checkbox`/`Radio`/`Switch` | `.ld-checkbox` etc. | `label` prop wraps in `.ld-choice` |
| `Badge` | `.ld-badge` | semantic variants; `size="sm"` (`--sm`) for dashboard pills, `pulse` (`--pulse`) for the one glowing call to action |
| `Alert` | `.ld-alert` | `variant` + optional `title` |
| `Dialog` | `.ld-dialog` | native `<dialog>`, `open`/`onClose`/`actions` |
| `Tabs` | `.ld-tabs` | `items: {id, label, content}[]` |
| `Progress`/`Spinner` | `.ld-progress`/`.ld-spinner` | |
| — (CSS only) | `.ld-table` | style `<table>` directly |

Theme-specific additions (styled only under that theme — check before using):
`summer-cloud` adds `.ld-chip` (filter chip, `--selected`), `.ld-card--floating`,
`.ld-btn--ghost`, and `.ld-num` for numeric table cells.

Visual reference: the GH Pages showcase for this repo renders every component
per style.

## Adding a new style

Copy the `styles/neon-butterfly/` layout: `tokens.css` (the full baseline
`--ld-*` set, every rule guarded by `data-ld-style="<name>"`, plus a
`color-scheme`), `base.css`, `components/*.css` (guarded selectors,
theme-unique `@keyframes` names), `index.css`, and a `design.md` capturing the
aesthetic. Then register it:

1. `styles/manifest.json` — name, scheme, font links.
2. `styles/package.json` — add the directory to `files` and its four `exports`
   entries (theme, `/tokens`, `/base`, `/components/*`).
3. `README.md` — the themes table.

Run `pnpm --filter @lepid-labs/styles test` — the contract test enforces all of
the above and is the definition of done. The showcase and the GH Pages
workflow pick the theme up from the manifest automatically.
