# neon-butterfly

Dark, mono-spaced, neon-accented terminal aesthetic. Deep navy backgrounds with
frosted-glass surfaces; lilac is the primary voice, neon lime the accent that
signals activity. Everything is uppercase, tracked-out JetBrains Mono — the UI
should feel like a beautiful command console, not a document.

## Color

| Role | Value | Usage |
| --- | --- | --- |
| Background | `#0b1326` | Page background (often blended over imagery with `luminosity`) |
| Surface | `#171f33` | Solid panels, inputs, dialogs |
| Surface glass | `rgba(23,31,51,0.75)` + 12px blur | Cards, nav links, alerts |
| On-surface | `#dae2fd` | Body text |
| Faint | `#958da1` | Secondary text, labels, idle chevrons |
| Primary | `#d2bbff` (lilac) | Emphasis, hover states, active tabs, glow |
| Accent | `#39ff14` (neon lime) | Activity signals: checked states, chevrons on hover, success |
| Info | `#4dc9ff` | Informational callouts and badges |
| Success | `#39ff14` | Shares the accent — success *is* the neon signal |
| Warning | `#ffd23f` | Caution states |
| Danger | `#ff2d78` | Destructive actions, errors |
| Border | `rgba(255,255,255,0.1)` | All resting borders |

The signature page background is the butterfly-circuit artwork
(`assets/butterfly-circuit.png`) blended into the navy with `luminosity` —
apply via `.ld-bg` on `<body>`. Optional; plain `--ld-bg` navy is also correct.

Rules: color is communication — resting UI stays in navy/faint; lilac and lime
appear only on interaction or state. Never use pure white or pure black.

## Typography

- **Family:** JetBrains Mono (weights 450 regular, 700 bold); fallback `ui-monospace`.
- **Interactive text** (buttons, links, tabs, labels, table headers): uppercase,
  700, 14px (labels/headers 11–12px), letter-spacing `0.1em`.
- **Body text:** sentence case, 450.

## Shape & effects

- Radius `0.5rem` everywhere (pills for switches/progress).
- Borders are 1px hairlines; emphasis comes from border *color*, not weight.
- Glow, not shadow: elevation is expressed with colored `box-shadow` glows
  (`ld-pulse-glow` on hover) rather than dark drop shadows.
- Transitions 0.3s; hover motion is a 4px `translateX` slide on links.
- Respect `prefers-reduced-motion`.

## Components

Class prefix `ld-`. Variants use BEM-ish modifiers (`ld-btn--accent`).

- **Card** `.ld-card` — frosted glass panel.
- **NavLink** `.ld-link` — the switchboard link: `>` chevron turns lime on hover.
- **Button** `.ld-btn` — `--primary`, `--accent`, `--danger` variants; `--sm`
  compact size (badge-scaled) for inline/table-row actions.
- **Form** `.ld-input`, `.ld-textarea`, `.ld-select`, `.ld-label`, `.ld-field`,
  `.ld-checkbox`, `.ld-radio`, `.ld-switch`, `.ld-choice` — checked states glow lime.
- **Badge** `.ld-badge` + semantic modifiers.
- **Alert** `.ld-alert` — left accent bar carries the semantic color.
- **Dialog** `.ld-dialog` — native `<dialog>`, lilac border + glow, blurred backdrop.
- **Tabs** `.ld-tabs`/`.ld-tab`/`.ld-tabpanel` — active tab underlined in lilac with text glow.
- **Table** `.ld-table` — lilac header rule, glass row hover.
- **Progress** `.ld-progress`, **Spinner** `.ld-spinner` — glowing lilac indicators.
- **Muted text** `.ld-muted` — faint secondary/empty-state text;
  `color: var(--ld-faint)` only, no italic — this theme's mono/uppercase
  terminal voice never reaches for a literary flourish.
- **Pre / log block** `.ld-pre` — command/log `<pre>`; sunken background,
  hairline border, radius, small mono, horizontal scroll.

## Code syntax

Tokens `--ld-code-*`, part of the baseline contract. Lilac keywords, neon-lime
strings, gold numbers, info-cyan functions, light-cyan types, softened-pink
variables, dimmed-faint comments, faint meta.

## Scoping

Every rule is guarded by `data-ld-style="neon-butterfly"` (self or ancestor),
wrapped in zero-specificity `:where()`. Set the attribute on `<html>` for a
page or on a container for an embedded island.
