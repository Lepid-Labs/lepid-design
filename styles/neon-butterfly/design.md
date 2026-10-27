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
  (`ld-pulse-glow` on hover) rather than dark drop shadows. `--ld-elevation-1..4`
  (raised, lifted, floating, modal) widen the lilac light; the floating level
  adds a lilac hairline and a dark drop to part from the content beneath.
- Motion is snappy: `--ld-duration-fast/base/slow` 0.15/0.3/0.55s; exits cut
  off sharply (`--ld-ease-exit`), like a console clearing. Hover motion is a 4px
  `translateX` slide on links.
- Respect `prefers-reduced-motion`.
- Hover motion runs only where hover is real (`@media (hover: hover)`); every
  hover state has a `:focus-visible` or `:focus-within` twin for the keyboard.
- Layers take the shared `--ld-z-*` scale, never a literal z-index (see
  `docs/guides/foundation.md`).

## Components

Class prefix `ld-`. Variants use BEM-ish modifiers (`ld-btn--accent`).

- **Card** `.ld-card` — frosted glass panel. `--interactive` makes it one
  clickable target (its primary link carries `.ld-card__link`): hover lifts it
  2px, lights the border lilac and widens the glow; keyboard focus draws a lilac
  ring around the whole panel; a press settles it to level 1.
- **Status card** `.ld-status-card` — dense dashboard card (from pulse's repo
  card): 3px left edge takes a semantic `--<tone>`, `data-ld-attention="<tone>"`
  adds an outline + glow ring, `data-ld-changed` replays a 30s tint flash.
  Parts: `__watermark`, `__head`, `__prefix`, `__title`, `__meta`, `__note`,
  `__rows`, `__row` (`-lead`/`-main`/`-trail`), `__footer`, `__empty`.
- **NavLink** `.ld-link` — the switchboard link: `>` chevron turns lime on hover
  or keyboard focus.
- **Button** `.ld-btn` — `--primary`, `--accent`, `--danger` variants; `--sm`
  compact size (badge-scaled) for inline/table-row actions. `aria-busy="true"`
  hides the label (it keeps its width) under a spinner whose leading arc is
  lime, the activity signal. `aria-disabled="true"` looks like `:disabled` but
  stays focusable (0.8 on focus so the edge reads), with its reason in
  `.ld-btn-reason`, faint 12px text below.
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
- **Icon button** `.ld-icon-btn` (+ `--active`, `--danger`) — chromeless
  2rem square for icon-only actions (`<button>` or `<a>`; always
  `aria-label`). Faint glyph that turns lilac on hover; active
  (`--active`, `aria-pressed="true"`, `aria-current="page"`) is lilac with a
  soft glow. `--danger` turns the glyph red on hover. Child `svg` 1.25em.
- **Form** `.ld-input`, `.ld-textarea`, `.ld-select`, `.ld-label`, `.ld-field`,
  `.ld-checkbox`, `.ld-radio`, `.ld-switch`, `.ld-choice` — checked states glow lime.
- **Field states** (`components/field.css`) — filled (needs a placeholder)
  takes a dim lilac edge; error (`aria-invalid="true"`) a pink edge and glow;
  success (`.ld-field--success`) a lime edge and glow; disabled a dark,
  scan-lined well in faint text; read-only drops the well for a dashed
  hairline. `.ld-field__hint` is faint 12px; `.ld-field__message--error` /
  `--success` glows like a console line and leads with a masked circle-bang /
  check icon, so no state is colour alone.
- **Password** `.ld-password` (+ `__control`, `__input`, `__toggle`,
  `__strength`, `__meter`, `__score`, `__rules`, `__rule`, `__rule--met`) —
  the reveal `.ld-icon-btn` sits inside the input's right edge; the meter bar
  runs pink, amber, then lime with `data-ld-strength` 0–4 beside an uppercase
  score; checklist rings become glowing lime checks.
- **One-time code** `.ld-otp` / `.ld-otp__cell` — a row of input wells, one
  bold digit each glowing lilac, lime caret; empty cells show a faint drawn dot.
- **Badge** `.ld-badge` + semantic modifiers; `--sm` is the 9px dashboard
  pill, `--pulse` the one solid amber call to action with a breathing glow.
- **Alert** `.ld-alert` — left accent bar carries the semantic color.
- **Dialog** `.ld-dialog` — native `<dialog>`, lilac border + glow, blurred backdrop.
- **Tabs** `.ld-tabs`/`.ld-tab`/`.ld-tabpanel` — active tab underlined in lilac with text glow; the underline is one lit bar that stretches to the new tab and snaps back (same slide tokens).
- **Table** `.ld-table` — lilac header rule, glass row hover. `.ld-table--interactive` adds the pointer, a lilac focus outline, and a selected row (`aria-selected`) with a lilac left bar and inner glow; selected rows look the same in any table.
  `.ld-table__sort` headers are hairline buttons with dim twin arrows; the
  sorted column (`aria-sort`) turns lilac and its one arrow lights lime.
  `.ld-table__select` cells hold a full-cell checkbox target; the
  indeterminate select-all is a lime dash. `--sticky` keeps the header on
  navy glass on `--ld-z-sticky`; `--compact` is a tight console listing,
  `--comfortable` opens and stripes rows in faint lilac (`--ld-table-pad-y`).
  `.ld-num` right-aligns on tabular figures; `.ld-table-scroll` scrolls a wide
  or tall table in its own box.
- **Bulk action bar** `.ld-bulk-bar` (+ `--top`, `__count`, `__actions`) — a
  frosted navy console strip with a lilac hairline and glow, sticky along the
  bottom edge on `--ld-z-sticky` (in the flow, so it never covers the last
  row; the page gets scroll padding while it shows). The count reads like a
  prompt in lime with a blinking block cursor (steady under reduced motion);
  it snaps in from below.
- **Pagination** `.ld-pagination` (+ `__list`, `__link`, `__prev`, `__next`,
  `__page`, `__ellipsis`, `__text`, `__summary`, `__size`),
  `.ld-pagination-bar`, `.ld-load-more` — hairline console cells in tracked
  uppercase; the current page is a solid lilac block, chevrons light lime on
  hover. Previous/Next drop their words below 30rem.
- **Chip** `.ld-chip` (+ `--removable`, `__label`, `__remove`;
  `.ld-chip-group`, `--scroll`, `__chips`, `__count`, `__clear`) — hairline
  console tags (one radius, no pills) in tracked uppercase; pressed
  (`aria-pressed`, `--selected`) takes a lime edge, glow and check. The remove
  button is a square 24px target that turns pink; the live count is lime.
- **Chart** `.ld-chart` (`__title`, `__svg`, `__grid`, `__baseline`,
  `__break`, `__tick`, `__axis-label`, `__bar`, `__bar--highlight`,
  `__value`, `__series--0..3`, `__line`, `__points`, `__label`, `__data`),
  `.ld-sparkline` — an oscilloscope: lilac hairline bars over a faint fill,
  the called-out bar burning lime, crisp glowing traces with hollow markers on
  a dotted grid, tracked uppercase labels. Series run lilac, lime, info,
  warning (`--ld-chart-1..4`) and differ by dash and marker too.
- **Progress** `.ld-progress`, **Spinner** `.ld-spinner` — glowing lilac indicators.
- **Skeleton** `.ld-skeleton` (`--text`, `--circle`, `--block`) — navy
  hairline wells a thin, sharp lilac scanline sweeps, like a console
  redrawing; a still lilac tint under reduced motion. Always `aria-hidden`; the
  loading region takes `aria-busy`.
- **Empty state** `.ld-empty` (+ `__icon`, `__title`, `__body`, `__actions`) —
  centred hairline icon well, uppercase tracked 12px title, faint body.
  `--first-use` lights the well and title lilac; `--no-results` dashes the
  well; `--cleared` gives it the neon lime signal.
- **Toast** `.ld-toaster` / `.ld-toast` (+ `--success`, `--warning`,
  `--danger`, `__body`, `__title`, `__message`, `__action`, `__close`,
  `__countdown`) — frosted navy pane whose hairline and glow take the variant's
  hue, a masked icon, an uppercase tracked title. Snaps in from the side on
  `--ld-duration-fast` like a console line (a fade under reduced motion). The
  action is a lime ghost `--sm` button; its countdown is a segmented lime bar
  that shortens by clipping and stops under `[data-ld-paused]`. Stack
  bottom-right on `--ld-z-toast`, top edge below 48rem, safe-area aware.
  A manual popover: it shows above an open modal and follows it, so its
  buttons work there.
- **Save status** `.ld-save-status` (+ `__text`, `__retry`; `data-ld-save`) —
  uppercase tracked 11px: a blinking lime block cursor while saving, lime
  check once saved, amber cloud offline, pink bang and danger text on error.
- **Tooltip** `.ld-tooltip` (`data-ld-side`) — a navy readout boxed in a
  lilac hairline with a lilac glow, uppercase tracked bold mono 11px in lilac,
  in the top layer on `--ld-z-tooltip`. Anchored above its trigger, flipping
  below; it cuts on instantly and fades off.
- **Menu** `.ld-menu` (+ `__item`, `__item--danger`, `__icon`, `__label`,
  `__shortcut`, `__group-label`, `__separator`; `.ld-context-target` on a
  context-menu region) — a frosted navy panel in a lilac hairline on
  `--ld-elevation-3`; items are uppercase tracked mono. The focused item is the
  switchboard row: lilac text on a faint lilac wash, its `>` chevron lit lime.
  Checkbox and radio items read `[x]` / `(*)` in lime; separators are dashed;
  danger items are hot pink; disabled items dim but stay focusable. Snaps open,
  cuts off on close.
- **Sheet / drawer** `.ld-dialog--sheet`, `.ld-dialog--drawer`
  (`--drawer-start`), `.ld-dialog__handle` — the navy dialog pinned to an edge,
  with the lilac hairline and glow on its inner edge only and the one 0.5rem
  radius. Runs in on the enter curve (`@starting-style`) and is cut away on the
  sharp exit; a fade under reduced motion. The handle is a lilac bar that turns
  lime while held. Safe-area aware.
- **Command palette** `.ld-command` (+ `__search`, `__icon`, `__input`,
  `__list`, `__group`, `__group-label`, `__option`, `__option-icon`, `__label`,
  `__shortcut`, `__loading`) — reads like a prompt: a lime `>` leads the input
  line, which underlines lilac with focus. The active option is lilac on a
  lilac wash in a lilac hairline; matched letters (`.ld-match`) are bold lime.
- **Search** `.ld-search` (+ `__input`, `__icon`, `__hint`, `__clear`) — an
  `.ld-input` with a lime caret and the glyph inset, lit lime with focus (a
  lilac-and-lime spinner while loading); key cap hint while empty, clear button
  once filled.
- **Key hint** `.ld-kbd` — a key cap drawn in a faint hairline, uppercase
  bold mono 10px.
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
  hairline border, radius, small mono, horizontal scroll. `.ld-pre--log`
  bounds it (`--ld-log-max-height`, 420px), scrolls both ways, wraps long
  lines, and adds faint 4px scanlines.
- **Copy control** `.ld-pre-copy` — an `.ld-icon-btn` pinned top-right in
  a `.ld-pre-wrap`; fades in on hover/focus-within, always shown on touch
  (`hover: none`). `data-ld-copy="copied"` swaps the copy glyph for a
  success-tinted check; `"failed"` tints it danger. Status goes to a
  visually hidden `aria-live` `.ld-pre-copy-status`.

## Code syntax

Tokens `--ld-code-*`, part of the baseline contract. Lilac keywords, neon-lime
strings, gold numbers, info-cyan functions, light-cyan types, softened-pink
variables, dimmed-faint comments, faint meta.

## Scoping

Every rule is guarded by `data-ld-style="neon-butterfly"` (self or ancestor),
wrapped in zero-specificity `:where()`. Set the attribute on `<html>` for a
page or on a container for an embedded island.
