# luminous-precision

Professional, nocturnal evolution of neon-butterfly — "Luminous Precision".
Deep obsidian foundation, glassmorphic indigo surfaces, and light used as the
interaction language: instead of heavy borders, elements glow. Vibrant orchid
is the primary voice; electric teal marks active paths and critical signals.
Sora headlines over JetBrains Mono body give it a commanding, high-tech,
developer-console feel without going full terminal. Derived from the
InfraPulse Stitch mockups (Stitch project 18185577263375001507).

## Color

| Role | Value | Usage |
| --- | --- | --- |
| Background | `#0a0c10` (deep obsidian) | Page background; `.ld-bg` adds soft orchid/teal radial underlays |
| Surface | `#1a1d29` (indigo) | Solid panels, dialogs |
| Surface sunken | `#0c0e14` | Inset fields, log wells, progress troughs |
| Surface glass | `rgba(26,29,41,0.4)` + 12px blur | Cards, nav links, alerts |
| On-surface | `#e2e2eb` | Body text |
| Faint | `#958e9b` | Secondary text, labels, idle tabs |
| Primary | `#c6a5ff` (vibrant orchid) | Primary buttons (solid fill), emphasis, glow |
| Accent | `#00f5ff` (electric teal) | Active states, focus rings, success paths, list-edge bars |
| Info | `#83b7ff` | Informational callouts and chips |
| Success | `#47e34e` | Live/healthy status |
| Warning | `#ffb86c` (amber) | Caution states |
| Danger | `#ff4d6d` (rose) | Destructive actions, errors |
| Border | `rgba(255,255,255,0.08)` | Resting borders |
| Border lit | `rgba(255,255,255,0.2)` | Top edge of glass panes — simulates overhead light |

Rules: color is functional, never decorative. Resting UI stays obsidian/faint;
orchid and teal appear on interaction, focus, and state. Depth comes from
tonal layers and glow, not drop shadows. Never pure white or pure black.

## Typography

- **Headlines:** Sora (500 md / 600 lg / 700 xl), tight letter-spacing
  (−0.01 to −0.02em); fallback `ui-sans-serif`.
- **Body & UI:** JetBrains Mono 400; fallback `ui-monospace`.
- **Labels & interactive text** (buttons, tabs, table headers): uppercase,
  600, 12–14px, letter-spacing `0.05em`.

## Shape & effects

- Radius `0.5rem` for buttons and inputs; `1rem` for cards, dialogs, and large
  containers. Pills reserved strictly for chips/badges and switches.
- Glass panes: 1px hairline borders with a lighter top edge
  (`--ld-border-lit`) to simulate overhead lighting; `backdrop-filter` 12px.
- Focus is electric teal: inputs drop the resting border for a teal line plus
  soft teal outer glow.
- Elevation = glow (`ld-pulse-glow` orchid, `ld-pulse-glow-accent` teal), not
  dark shadows. `--ld-elevation-1..4` (raised, lifted, floating, modal) widen
  the orchid glow; the floating level adds a lit hairline and a dark drop so a
  menu parts from the content beneath it.
- Motion is quick and exact: `--ld-duration-fast/base/slow` 0.15/0.3/0.45s,
  a crisp `--ld-ease-standard` (`cubic-bezier(0.2,0,0,1)`), and a spring that
  barely overshoots. Exits run faster than entrances. Respect
  `prefers-reduced-motion`.
- Hover motion runs only where hover is real (`@media (hover: hover)`); every
  hover state has a `:focus-visible` or `:focus-within` twin for the keyboard.
- Layers take the shared `--ld-z-*` scale, never a literal z-index (see
  `docs/guides/foundation.md`).
- 8px spacing rhythm; generous negative space so glows can breathe.

## Components

Class prefix `ld-` (shared token/class contract with the other themes).

- **Card** `.ld-card` — glass pane, 1rem radius, lit top edge.
  `--interactive` makes it one clickable target (its primary link carries
  `.ld-card__link`): hover lifts it 2px onto the level-2 glow, keyboard focus
  draws a teal ring around the whole pane, a press settles it to level 1.
- **Status card** `.ld-status-card` — dense dashboard card, 1rem radius, Sora title (from pulse's repo
  card): 3px left edge takes a semantic `--<tone>`, `data-ld-attention="<tone>"`
  adds an outline + glow ring, `data-ld-changed` replays a 30s tint flash.
  Parts: `__watermark`, `__head`, `__prefix`, `__title`, `__meta`, `__note`,
  `__rows`, `__row` (`-lead`/`-main`/`-trail`), `__footer`, `__empty`.
- **NavLink** `.ld-link` — glass list row; hover or keyboard focus shifts to
  solid indigo and lights a 2px teal bar on the left edge.
- **Button** `.ld-btn` — ghost by default; `--primary` is the one solid fill
  (orchid, dark text), `--accent` teal ghost, `--danger` rose ghost. `--sm` is a
  compact size scaled to `.ld-badge`, for inline and table-row actions.
  `aria-busy="true"` hides the label (it keeps its width) under a glowing
  spinner and stops the pulse. `aria-disabled="true"` looks like `:disabled`
  but stays focusable (it brightens to 0.8 on focus so the edge reads), with
  its reason in `.ld-btn-reason`, faint 12px text below.
- **Hold button** `.ld-btn--hold` (+ `__ring`, `__body`, `__label`, `__hint`,
  `__meter`) — hold-to-confirm: a 3px conic ring around the icon well fills
  as `--ld-hold` goes 0→1; `--danger` paints it rose, `--primary` orchid,
  `--accent` teal, neutral alone. `data-ld-hold="fired"` blooms the button
  and ring in the ring color (dropped under reduced motion; the fill stays).
  Window: `--ld-hold-duration` 300 ms. The ring *is* the confirmation.
- **Button group** `.ld-btn-group` (+ `--block`) — one long track with
  `.ld-btn` segments lined up inside; the track owns the chrome and the
  segments drop theirs. Lit-border track on the sunken well; faint mono
  labels. The pressed segment (`aria-pressed="true"` / `.ld-btn--active`) is a
  raised pane with an orchid border, orchid label and soft glow; no hover
  pulse inside the track.
  With one pressed segment the chrome is a single sliding pane: the edge
  nearer the new segment leads, the far edge trails on a tight spring with barely any overshoot
  (`--ld-slide-lead` / `--ld-slide-trail`, direction from `data-ld-dir`).
  Variants tint the label only; `--block` fills the row with equal-width
  segments. Use `role="group"` + `aria-label`.
- **Icon button** `.ld-icon-btn` (+ `--active`, `--danger`) — chromeless
  2rem square for icon-only actions (`<button>` or `<a>`; always
  `aria-label`). Faint glyph at rest; hover lights it orchid on a faint tint
  with a soft glow. Active (`--active`, `aria-pressed="true"`,
  `aria-current="page"`) is an orchid glyph in a hairline orchid inset.
  `--danger` turns the glyph red on hover. Child `svg` sized to 1.25em.
- **Form** `.ld-input`, `.ld-textarea`, `.ld-select`, `.ld-label`,
  `.ld-field`, `.ld-checkbox`, `.ld-radio`, `.ld-switch`, `.ld-choice` —
  checked/focus states glow teal.
- **Field states** (`components/field.css`) — filled (needs a placeholder)
  lights the hairline; error (`aria-invalid="true"`) a rose edge and glow;
  success (`.ld-field--success`) a green edge and glow; disabled a hatched,
  unlit well in faint text; read-only drops the well for a dashed hairline.
  `.ld-field__hint` is faint 12px; `.ld-field__message--error` / `--success`
  leads with a masked circle-bang / check icon, so no state is colour alone.
- **Password** `.ld-password` (+ `__control`, `__input`, `__toggle`,
  `__strength`, `__meter`, `__score`, `__rules`, `__rule`, `__rule--met`) —
  the reveal `.ld-icon-btn` sits inside the input's right edge; the meter bar
  glows rose, amber, then green with `data-ld-strength` 0–4 beside an
  uppercase score; checklist rings become lit green checks.
- **One-time code** `.ld-otp` / `.ld-otp__cell` — a row of input wells, one
  digit each, teal caret; empty cells show a faint drawn dot.
- **Badge** `.ld-badge` — pill chip: 15% tint of its hue behind
  full-saturation text (+ semantic modifiers). `--sm` is the 9px dashboard
  pill; `--pulse` the one solid amber call to action with a breathing glow.
- **Alert** `.ld-alert` — glass, 3px left bar carries the semantic color.
- **Dialog** `.ld-dialog` — native `<dialog>`, indigo pane with orchid glow,
  Sora title, blurred obsidian backdrop.
- **Tabs** `.ld-tabs`/`.ld-tab`/`.ld-tabpanel` — active tab underlined in
  teal with text glow; the underline is one lit bar that reaches for the new
  tab and settles with barely any overshoot (same slide tokens).
- **Table** `.ld-table` — lit header rule; row hover shifts glass and lights
  the teal left bar. `.ld-table--interactive` adds the pointer, an orchid
  focus outline, and a selected row (`aria-selected`) held in orchid glow
  with the teal bar; selected rows look the same in any table.
  `.ld-table__sort` headers are chromeless buttons with dim twin arrows; the
  sorted column (`aria-sort`) lights teal with one arrow. `.ld-table__select`
  cells hold a full-cell checkbox target (`.ld-table__select-hit`); the
  indeterminate select-all is a glowing teal bar. `--sticky` keeps the header
  on blurred obsidian on `--ld-z-sticky`; `--compact` tightens to a hairline
  grid, `--comfortable` opens and stripes rows (`--ld-table-pad-y`). `.ld-num`
  right-aligns on tabular figures. `.ld-table-scroll` scrolls a wide or tall
  table in its own box.
- **Bulk action bar** `.ld-bulk-bar` (+ `--top`, `__count`, `__actions`) —
  an indigo glass slab on `--ld-elevation-3`, sticky along the bottom edge on
  `--ld-z-sticky` (in the flow, so it never covers the last row; the page gets
  scroll padding while it shows). It rises 0.5rem into place; the count is
  uppercase teal with a glow.
- **Pagination** `.ld-pagination` (+ `__list`, `__link`, `__prev`, `__next`,
  `__page`, `__ellipsis`, `__text`, `__summary`, `__size`),
  `.ld-pagination-bar`, `.ld-load-more` — chromeless mono cells; the current
  page (`aria-current`) is an orchid-lit pane with a lit top edge, focus the
  teal path, the ends dim to 0.4. Previous/Next drop their words below 30rem.
- **Chip** `.ld-chip` (+ `--removable`, `__label`, `__remove`;
  `.ld-chip-group`, `--scroll`, `__chips`, `__count`, `__clear`) — glass
  pills on a hairline; pressed (`aria-pressed`, `--selected`) lights orchid
  and leads with a check. The remove button is a round 24px target that turns
  rose. `--scroll` is one sideways row that fades at the end.
- **Chart** `.ld-chart` (`__title`, `__svg`, `__grid`, `__baseline`,
  `__break`, `__tick`, `__axis-label`, `__bar`, `__bar--highlight`,
  `__value`, `__series--0..3`, `__line`, `__points`, `__label`, `__data`),
  `.ld-sparkline` — light as data: translucent orchid bars with a lit edge,
  the called-out bar glowing teal, thin glowing lines, gridlines barely there,
  Sora caption, faint mono ticks. Series run orchid, teal, info blue, amber
  (`--ld-chart-1..4`) and differ by dash and marker too; the axis break is
  amber.
- **Progress** `.ld-progress`, **Spinner** `.ld-spinner` — glowing orchid
  indicators (`--accent` bar variant in teal).
- **Skeleton** `.ld-skeleton` (`--text`, `--circle`, `--block`) — sunken
  hairline wells a dim orchid light passes across; a still orchid tint under
  reduced motion. Always `aria-hidden`; the loading region takes `aria-busy`.
- **Empty state** `.ld-empty` (+ `__icon`, `__title`, `__body`, `__actions`) —
  centred glass icon well, Sora title, faint body. `--first-use` enlarges the
  well and lights it orchid on the level-2 glow; `--no-results` dashes it;
  `--cleared` takes the success light.
- **Toast** `.ld-toaster` / `.ld-toast` (+ `--success`, `--warning`,
  `--danger`, `__body`, `__title`, `__message`, `__action`, `__close`,
  `__countdown`) — indigo glass on `--ld-elevation-3` with a lit top edge; a 3px
  left bar and a masked icon carry the variant, the title is Sora in the same
  hue. Rises 0.5rem into place on the enter curve (a fade under reduced
  motion). The action is a teal ghost `--sm` button; its countdown is a glowing
  2px teal bar that stops under `[data-ld-paused]`. Stack bottom-right on
  `--ld-z-toast`, top edge below 48rem, safe-area aware.
  A manual popover: it shows above an open modal and follows it, so its
  buttons work there.
- **Save status** `.ld-save-status` (+ `__text`, `__retry`; `data-ld-save`) —
  faint 12px mono text: glowing orchid spinner while saving, teal check once
  saved, amber cloud offline, rose bang and danger text on error.
- **Tooltip** `.ld-tooltip` (`data-ld-side`) — a small solid indigo label
  with a lit top edge and a faint orchid glow, mono 12px, in the top layer on
  `--ld-z-tooltip`. Anchored above its trigger, flipping below; rises 2px on the
  enter curve, fades out faster.
- **Menu** `.ld-menu` (+ `__item`, `__item--danger`, `__icon`, `__label`,
  `__shortcut`, `__group-label`, `__separator`; `.ld-context-target` on a
  context-menu region) — indigo glass on `--ld-elevation-3` with a lit top
  edge, anchored below its trigger and flipping at the edges. The focused item
  takes the teal path: orchid tint, orchid text, 2px teal bar. Checkbox and
  radio items draw a glowing teal check or dot in a leading slot; danger items
  are rose; disabled items dim to 0.45 but stay focusable.
- **Sheet / drawer** `.ld-dialog--sheet`, `.ld-dialog--drawer`
  (`--drawer-start`), `.ld-dialog__handle` — the dialog's indigo pane pinned to
  an edge, lit along its inner edge with an orchid glow. Slides in on the enter
  curve at base duration (`@starting-style`), out on the exit curve, faster;
  a fade under reduced motion. The handle is a lit hairline pill that turns
  orchid while held. Safe-area aware.
- **Command palette** `.ld-command` (+ `__search`, `__icon`, `__input`,
  `__list`, `__group`, `__group-label`, `__option`, `__option-icon`, `__label`,
  `__shortcut`, `__loading`) — a dialog set high on the screen; a borderless
  mono input over a hairline that turns teal with focus. The active option is
  the teal path; matched letters (`.ld-match`) glow teal.
- **Search** `.ld-search` (+ `__input`, `__icon`, `__hint`, `__clear`) — an
  `.ld-input` with the glyph inset (a glowing spinner while loading), lit teal
  with focus; key hint while empty, clear button once filled. `.ld-match` marks
  matched letters in teal.
- **Key hint** `.ld-kbd` — a sunken well with a lit top edge and a heavier
  foot, faint mono 11px.
- **Accordion** `.ld-accordion` (+ `__item`, `__summary`, `__panel`) — native
  `<details>`/`<summary>`: glass panes with a lit top edge and Sora headers; the
  whole row is the button, focus a teal inset ring. A faint chevron turns teal
  and flips on the panel's own duration and curve while the height opens
  (`interpolate-size` + `::details-content`; it snaps where unsupported and under
  reduced motion). An open pane takes the level-1 glow.
- **Inline edit** `.ld-inline-edit` (+ `--multiline`, `__display`, `__text`, `__icon`, `__input`; `data-ld-edit`,
  `data-ld-saved`) — the text and the
  input share one box (font, padding, 1px edge), so the swap moves nothing; only
  the edge lights teal with a soft glow. A pencil shows on hover and keyboard
  focus, always on touch; saving is a glowing orchid spinner, then a teal check;
  errors take the rose edge and the field error line.
- **Star rating** `.ld-rating` (+ `__legend`, `__options`, `__option`, `__input`, `__glyph`,
  `__value`, `__clear`; `--display`, `__stars`, `__count`) — faint
  outline stars; chosen stars are solid orchid with a glow, clipped to
  `--ld-fill` for fractional averages. The hover preview lights teal (only where
  hover is real); keyboard focus rings the star in teal.
- **Settings** `.ld-settings` (+ `__nav`, `__link`, `__body`, `__section`, `--danger`,
  `__header`, `__title`, `__description`, `__row`, `__label`, `__hint`, `__control`) — the section nav
  sticks beside the sections when the container has room (a scrolling row
  otherwise); the current link takes the teal path. Sections are glass panes; the
  danger zone comes last, edged and lit rose.
- **Presence** `.ld-presence`, `.ld-cursor` (+ `__pointer`, `__name`; `data-ld-color`,
  `data-ld-idle`), `.ld-avatar-stack`, `.ld-avatar` (+ `--overflow`, `__img`) — remote
  cursors are light: a pointer and an uppercase mono tag in the person's colour
  with a glow of the same hue. Eight bright slots (`--ld-presence-1..8`) carry
  obsidian ink. The layer sits on `--ld-z-sticky` and never takes a click; idle
  cursors fade out. Avatars are discs on their colour, ringed in obsidian.
- **Range slider** `.ld-range` (native `input[type=range]`; fill from `--ld-range-fill`), `.ld-slider` (+ `__header`,
  `__input`, `__pair`, `__track`, `__bubble`, `__ticks`, `__tick`, `__marks`, `__mark`; `--range`) — a sunken
  hairline channel that fills orchid with a glow up to the thumb; the thumb is a glowing orchid disc (24px) in a
  44px-tall target, ringed teal on keyboard focus. The value rides above in a glass bubble that lights while dragged
  or focused. Two thumbs share one track and fill the band between them.
- **Date and colour pickers** `.ld-date` (+ `__presets`, `__input`), `.ld-color` (+ `__row`, `__swatch`, `__picker`,
  `__hex`, `__preview`, `__sample`, `__contrast`), `.ld-swatches`, `.ld-swatch` (+ `__input`, `__chip`) — the native
  date field with a faint teal calendar glyph and glass preset chips above it. Swatches are discs; the chosen one is
  ringed in on-surface over an obsidian gap with a check. The contrast tag is outlined green, amber or rose with an
  icon and words.
- **File upload** `.ld-dropzone` (+ `__input`, `__icon`, `__title`, `__prompt`, `__hint`; `data-ld-drag`),
  `.ld-upload-list`, `.ld-upload` (+ `__thumb`, `__name`, `__size`, `__status`, `__progress`, `__actions`;
  `data-ld-upload`) — a dashed glass pane with an orchid upload glyph; a file dragged over turns the edge solid teal
  with a glow and changes the words, an unacceptable one edges it rose. Files are glass rows: teal "Uploaded", rose
  errors with Retry.
- **Drag and drop** `.ld-sortable` (+ `__item`, `__body`; `data-ld-dragging`, `data-ld-drop`), `.ld-drag-handle`,
  `.ld-board` (+ `__column`, `__title`, `__count`) — glass rows with a faint dotted grip. A lifted item turns solid,
  rises on `--ld-elevation-3`, grows 2% and tilts a degree under a pointer; a teal line with a glow marks the slot and
  the target column lights orchid. Reduced motion keeps the line and drops the grow and tilt.
- **Swipe actions** `.ld-swipe` (+ `__content`, `__main`, `__actions--leading`, `__actions--trailing`, `__action`,
  `__action--danger`) — the content pane slides over a sunken well on the spring; neutral actions are raised glass,
  the destructive one solid rose; past the full-swipe point the outermost action fills the well and glows.
- **App shell** `.ld-shell` (+ `__skip`, `__header`, `__toggle`, `__brand`,
  `__actions`, `__nav`, `__scrim`, `__main`, `__footer`; `.ld-topnav`/`__item`;
  `.ld-sidenav` + `__section`, `__heading`, `__item`, `__icon`, `__label`,
  `__badge`, `__footer`) — brand in Sora with an orchid-glow mark; mono uppercase top-nav and nav labels in faint. The current page takes the electric-teal path (indigo pane, 2px teal left bar, teal glow) — the same language as `.ld-link` hover; in the tab bar it becomes a teal top rule. The header and nav are unfilled — hairline
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
  rail: glowing orchid fill on a sunken track, 2rem nodes, uppercase mono
  labels. `__step--complete` is a solid orchid node; `--current` lights the
  active path in teal — 2px teal border, teal icon and glow, teal label;
  `--upcoming` a hairline sunken node in faint. The rail is per-step
  (`::before` track, `::after` fill), so the fill follows the modifiers and
  `aria-current="step"` marks the active node.
- **Muted text** `.ld-muted` — faint secondary/empty-state text;
  `color: var(--ld-faint)`, italic.
- **Pre / log block** `.ld-pre` — command/log `<pre>`; the surface-sunken
  well (already documented above as this theme's "log wells" token),
  hairline border, radius, small mono, horizontal scroll. `.ld-pre--log`
  bounds it (`--ld-log-max-height`, 420px), scrolls both ways, wraps long
  lines, and lays faint teal scanlines over the well.
- **Copy control** `.ld-pre-copy` — an `.ld-icon-btn` pinned top-right in
  a `.ld-pre-wrap`; fades in on hover/focus-within, always shown on touch
  (`hover: none`). `data-ld-copy="copied"` swaps the copy glyph for a
  success-tinted check; `"failed"` tints it danger. Status goes to a
  visually hidden `aria-live` `.ld-pre-copy-status`.

## Code syntax

Tokens `--ld-code-*`, part of the baseline contract. Orchid keywords, teal
types, info-blue functions, amber numbers, success-green strings, soft-rose
variables, dimmed-faint comments, faint meta — palette voices reused, never
new hues for decoration.

## Scoping

Every rule is guarded by `data-ld-style="luminous-precision"` (self or
ancestor), wrapped in zero-specificity `:where()`. Set the attribute on
`<html>` for a page or on a container for an embedded island.
