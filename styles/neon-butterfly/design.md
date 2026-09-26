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
- **Status card** `.ld-status-card` — dense dashboard card (from pulse's repo
  card): 3px left edge takes a semantic `--<tone>`, `data-ld-attention="<tone>"`
  adds an outline + glow ring, `data-ld-changed` replays a 30s tint flash.
  Parts: `__watermark`, `__head`, `__prefix`, `__title`, `__meta`, `__note`,
  `__rows`, `__row` (`-lead`/`-main`/`-trail`), `__footer`, `__empty`.
- **NavLink** `.ld-link` — the switchboard link: `>` chevron turns lime on hover.
- **Button** `.ld-btn` — `--primary`, `--accent`, `--danger` variants; `--sm`
  compact size (badge-scaled) for inline/table-row actions.
- **Hold button** `.ld-btn--hold` (+ `__ring`, `__body`, `__label`, `__hint`,
  `__meter`) — hold-to-confirm: a 3px conic ring around the icon well fills
  as `--ld-hold` goes 0→1. `--danger` paints it **lime** — this theme reads
  the ring as an activity signal, not a warning; `--primary` lilac,
  `--accent` lime. `data-ld-hold="fired"` lights the border and glows
  (dropped under reduced motion; the fill stays). Window:
  `--ld-hold-duration` 250 ms — terminal-quick.
- **Button group** `.ld-btn-group` (+ `--block`) — one long track with
  `.ld-btn` segments lined up inside; the track owns the chrome and the
  segments drop theirs. Glass track, hairline border, faint mono labels.
  The pressed segment (`aria-pressed="true"` / `.ld-btn--active`) takes the
  lilac edge and a lilac text glow; no hover pulse inside the track.
  With one pressed segment the chrome is a single sliding pill: the edge
  nearer the new segment leads, the far edge trails on a spring that squashes ~7% and settles
  (`--ld-slide-lead` / `--ld-slide-trail`, direction from `data-ld-dir`).
  Variants tint the label only; `--block` fills the row with equal-width
  segments. Use `role="group"` + `aria-label`.
- **Form** `.ld-input`, `.ld-textarea`, `.ld-select`, `.ld-label`, `.ld-field`,
  `.ld-checkbox`, `.ld-radio`, `.ld-switch`, `.ld-choice` — checked states glow lime.
- **Badge** `.ld-badge` + semantic modifiers; `--sm` is the 9px dashboard
  pill, `--pulse` the one solid amber call to action with a breathing glow.
- **Alert** `.ld-alert` — left accent bar carries the semantic color.
- **Dialog** `.ld-dialog` — native `<dialog>`, lilac border + glow, blurred backdrop.
- **Tabs** `.ld-tabs`/`.ld-tab`/`.ld-tabpanel` — active tab underlined in lilac with text glow; the underline is one lit bar that stretches to the new tab and snaps back (same slide tokens).
- **Table** `.ld-table` — lilac header rule, glass row hover.
- **Progress** `.ld-progress`, **Spinner** `.ld-spinner` — glowing lilac indicators.
- **App shell** `.ld-shell` (+ `__skip`, `__header`, `__toggle`, `__brand`,
  `__actions`, `__nav`, `__scrim`, `__main`, `__footer`; `.ld-topnav`/`__item`;
  `.ld-sidenav` + `__section`, `__heading`, `__item`, `__icon`, `__label`,
  `__badge`, `__footer`) — brand uppercase lilac with a glow text-shadow; section headings prefixed with a lime `//`. Items are uppercase mono; hover nudges right with a lilac border and lights the icon lime; the current page is a lilac-bordered pane with a slow pulsing glow and a lime icon. The header and nav are unfilled — hairline
  borders over the page background (`.ld-bg`), which the shell paints; the
  header blurs what scrolls under it. The drawer and tab bar take a fill. Structure (`components/layout.css`) is shared by every theme:
  collapsed rail on `data-ld-nav-collapsed`, drawer on `data-ld-nav-open`
  below 48rem, `--tabbar` docks the nav at the bottom. The header
  always spans the full width above the nav.
- **Page layouts** `.ld-page` (`--narrow`/`--wide`/`--full`, `__header`,
  `__eyebrow`, `__title`, `__subtitle`, `__actions`), `.ld-grid`,
  `.ld-split`, `.ld-aside-layout`, `.ld-center` — structure only
  (`components/page.css`, shared by every theme); the page
  title uses the display face.
- **Stepper** `.ld-stepper` (+ `__step`, `__node`, `__label`) — milestone
  rail: glowing lilac fill on a surface track, 2rem nodes, uppercase mono
  labels. `__step--complete` is a solid lilac node; `--current` is the
  activity signal — 2px lime border, lime icon and glow, lime label;
  `--upcoming` a hairline surface node in faint. The rail is per-step
  (`::before` track, `::after` fill), so the fill follows the modifiers and
  `aria-current="step"` marks the active node.
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
