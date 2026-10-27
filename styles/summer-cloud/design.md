# summer-cloud

Light, airy, high-velocity retail aesthetic — "Airy Energetic." Frosted white
glass floating on a sky gradient, with a vivid violet doing all the work of
emphasis. Where neon-butterfly is a command console, summer-cloud is a summer
storefront: weightless, optimistic, effortless. Nothing sits flat on the page;
everything hovers.

Derived from the Stitch project *Summer Cloud UI System*
(`15973631330153907862`): Style Guide, Components Showcase, Retail Dashboard.

## Color

| Role | Value | Usage |
| --- | --- | --- |
| Background | `#f6fafe` → `#c9e6ff` | Sky gradient at 135°, `fixed`. Apply via `.ld-bg` |
| Surface | `#ffffff` | Dialogs and fully opaque panels |
| Surface sunken | `#f0f4f8` | Inset form fields |
| Surface glass | `rgba(255,255,255,0.6)` + 12px blur | Cards, alerts (Level 1) |
| Surface glass high | `rgba(255,255,255,0.8)` + 20px blur | Floating/hover cards, modals (Level 2) |
| On-surface | `#171c1f` | Body text |
| Faint | `#484457` | Secondary text, labels, idle nav |
| Primary | `#4500d9` (violet) | Headings, CTAs, active states, prices, progress |
| Primary bright | `#5d2bff` | Shadow/glow tint and primary hover fill |
| Accent | `#0cb3ff` (sky blue) | Focus rings, secondary path, info — the interactive signal |
| Accent deep | `#006492` | Accent as *text* (the bright sky blue fails contrast) |
| Info | `#0cb3ff` | Informational callouts and badges |
| Success | `#30e330` | Switch "on" state — deliberately vibrant, the one high-energy pop |
| Warning | `#f2c025` | Caution states, "New" badges |
| Danger | `#ff4d4d` (retail red) | Errors, "Sale" badges, alert rules — carries dark text, never white |
| Danger deep | `#cc1f1f` | Danger where white text sits on it (destructive buttons) |
| Success deep | `#0f6a24` | Success as *text* (field messages, met checklist rules) — the switch green fails contrast |
| Border | `rgba(255,255,255,0.4)` | Glass edges — the highlight that makes glass read as glass |
| Outline | `#c9c3da` | Hairlines on opaque surfaces (chips, table rules, checkboxes) |
| Sky tint | `rgba(255,255,255,0.7)` | Hover wash on ghost/nav elements |

Rules: the violet is the only loud color and carries emphasis alone — resting UI
is faint grey on white glass. Sky blue means "you can interact with this"
(focus, secondary actions, info). Never use pure black; never use a grey shadow.
The gradient is not decoration — on a flat white page the glass has nothing to
be glass against, and the theme collapses.

## Typography

Three voices, per the project's design system:

- **Display & headings:** Plus Jakarta Sans (600/700/800), letter-spacing
  `-0.02em` at display sizes — friendly rounded terminals, tucked in tight.
- **Body:** Inter 400, 16px/24px. Sentence case, always.
- **Data & labels:** JetBrains Mono 500, 12px, tracking `0.05em`. Field labels,
  badges, table headers, prices, metadata. This is the "utility-grade"
  counterweight to the soft headings. Uppercase for badges and table headers
  (furniture); sentence case for field labels, which people read as words.

Interactive text (buttons, links, tabs) is Plus Jakarta Sans 600 at 14px,
sentence case. Uppercase never appears outside the mono voice.

The three webfonts are not bundled; include the Google Fonts links or self-host.
Every stack falls back to a system family.

## Shape & effects

- Radius `1rem` (16px) for cards, panels, and fields; **pills**
  (`--ld-radius-pill`) for every button, badge, and chip; `0.25rem` minimum
  anywhere else. Never 0.
- Depth is **blur + tinted shadow**, never grey drop shadows. Shadows are tinted
  with `#5d2bff`: `0 20px 40px rgba(93,43,255,0.08)` at rest,
  `0 4px 14px rgba(93,43,255,0.39)` for raised CTAs.
- Two glass tiers only — Level 1 glass (0.6 white / 12px blur) for content,
  Level 2 (0.8 white / 20px blur + lift) for interactive and floating things.
- Shadows follow `--ld-elevation-1..4` (rest, lifted, floating, modal): a violet
  contact shadow under a soft spread that grows with each level. Level 1 is the
  resting shadow above (`--ld-shadow` is its older name).
- **Bouncy, not linear.** Buttons scale to 1.03 on hover and 0.95 on press with
  `cubic-bezier(0.34,1.56,0.64,1)`; floating cards translate `-4px`. Durations
  `--ld-duration-fast/base/slow` are 0.2/0.3/0.65s, and `--ld-ease-spring`
  overshoots and rings out.
- Hover motion runs only where hover is real (`@media (hover: hover)`); every
  hover state has a `:focus-visible` or `:focus-within` twin for the keyboard.
- Layers take the shared `--ld-z-*` scale, never a literal z-index (see
  `docs/guides/foundation.md`).
- Focus is a 4px sky-blue ring (`0 0 0 4px rgba(12,179,255,0.2)`), never an
  outline suppression without a replacement.
- Spacing is strictly multiples of 8px. When in doubt, add 8.
- Respect `prefers-reduced-motion` — every transform is dropped.

## Components

Class prefix `ld-` (shared across themes so `@lepid-labs/ui-react` stays
theme-agnostic). Variants use BEM-ish modifiers (`ld-btn--primary`).

- **Card** `.ld-card` — glass panel; `--floating` adds the Level 2 hover lift.
  `--interactive` makes it one clickable target (its primary link carries
  `.ld-card__link`): hover floats it 4px on the spring into Level 2 glass and
  `--ld-elevation-2`, keyboard focus draws the sky-blue ring, a press pushes it
  back down.
- **Status card** `.ld-status-card` — dense dashboard card on high glass, raised shadow on hover (from pulse's repo
  card): 3px left edge takes a semantic `--<tone>`, `data-ld-attention="<tone>"`
  adds an outline + glow ring, `data-ld-changed` replays a 30s tint flash.
  Parts: `__watermark`, `__head`, `__prefix`, `__title`, `__meta`, `__note`,
  `__rows`, `__row` (`-lead`/`-main`/`-trail`), `__footer`, `__empty`.
- **NavLink** `.ld-link` — pill, sky-tint wash, `→` slides 4px on hover;
  `--active` / `[aria-current=page]` becomes the violet underline rule.
- **Button** `.ld-btn` — glass by default; `--primary` (solid violet CTA, one
  per view), `--accent` (sky-edged glass), `--ghost`, `--danger`. `--sm` is a
  compact size scaled to `.ld-badge`, for inline/table-row actions; the pill
  shape is kept. `aria-busy="true"` holds the pill still and hides the label
  (it keeps its width) under a spinner in the label's colour.
  `aria-disabled="true"` looks like `:disabled` but stays focusable (0.8 and
  the sky ring on focus), with its reason in `.ld-btn-reason`, faint 13px Inter
  below.
- **Hold button** `.ld-btn--hold` (+ `__ring`, `__body`, `__label`, `__hint`,
  `__meter`) — hold-to-confirm: a 3px conic **violet** ring around the icon
  well fills as `--ld-hold` goes 0→1, on the glass pill. With `--danger` the
  pill stays glass with deep-red text (the ring and hint carry the state; a
  violet ring on the solid red CTA would fight it). Press does not shrink
  the pill — the ring is the feedback. `data-ld-hold="fired"` bounces to
  1.06 (dropped under reduced motion; the fill stays). Window:
  `--ld-hold-duration` 350 ms — soft and unhurried.
- **Button group** `.ld-btn-group` (+ `--block`) — one long track with
  `.ld-btn` segments lined up inside; the track owns the chrome and the
  segments drop theirs. A long glass pill; segments are pills inside it.
  The pressed segment (`aria-pressed="true"` / `.ld-btn--active`) floats up as
  a white chip with bold violet text and a violet-tinted shadow. No hover
  scale inside the pill (neighbours would overlap); the 0.97 press stays.
  With one pressed segment the chrome is a single sliding chip: the edge
  nearer the new segment leads, the far edge trails on the bounciest spring of the three themes
  (`--ld-slide-lead` / `--ld-slide-trail`, direction from `data-ld-dir`).
  Variants tint the label only; `--block` fills the row with equal-width
  segments. Use `role="group"` + `aria-label`.
- **Icon button** `.ld-icon-btn` (+ `--active`, `--danger`) — chromeless
  round 2rem pill for icon-only actions (`<button>` or `<a>`; always
  `aria-label`). Faint glyph; hover fills sky-white, turns violet and
  bounces up; press squishes. Active (`--active`, `aria-pressed="true"`,
  `aria-current="page"`) keeps the sky-white fill and violet glyph.
  `--danger` turns the glyph deep red on hover. Child `svg` 1.25em.
- **Form** `.ld-input`, `.ld-textarea`, `.ld-select`, `.ld-label`, `.ld-field`,
  `.ld-checkbox`, `.ld-radio`, `.ld-switch`, `.ld-choice` — sunken fields, no
  resting border, sky-blue ring on focus. The switch is the oversized
  "cloud-toggle": squishy, and green when live.
- **Field states** (`components/field.css`) — filled (needs a placeholder)
  floats up from the sunken well to white with an outline hairline; error
  (`aria-invalid="true"`) a red edge and soft red ring; success
  (`.ld-field--success`) a green edge and ring; disabled a violet-hatched flat
  well in faint text; read-only drops the well for a dashed outline.
  `.ld-field__hint` is faint 13px Inter; `.ld-field__message--error` /
  `--success` is 13px semibold in `--ld-danger-deep` / `--ld-success-deep`
  (the bright hues fail contrast as text) behind a masked circle-bang / check.
- **Password** `.ld-password` (+ `__control`, `__input`, `__toggle`,
  `__strength`, `__meter`, `__score`, `__rules`, `__rule`, `__rule--met`) —
  the reveal `.ld-icon-btn` sits inside the input's right edge; the pill meter
  runs red, sunshine, then green with `data-ld-strength` 0–4 beside a mono
  uppercase score; checklist rings become deep-green checks.
- **One-time code** `.ld-otp` / `.ld-otp__cell` — soft sunken tiles, one bold
  violet digit each in the display face; empty tiles show an outline dot, and
  filled ones float up to white like any filled field.
- **Badge** `.ld-badge` + semantic modifiers — solid pills, mono uppercase.
  `--sm` is the 9px dashboard pill; `--pulse` the amber call to action with a
  breathing glow.
- **Alert** `.ld-alert` — glass card with a 4px semantic left rule.
- **Dialog** `.ld-dialog` — native `<dialog>`, opaque white, blurred backdrop.
- **Tabs** `.ld-tabs`/`.ld-tab`/`.ld-tabpanel` — violet underline when active; it stretches to the new tab and bounces back to width (same slide tokens).
- **Table** `.ld-table` — mono uppercase headers, sky-tint row hover; add
  `.ld-num` to numeric cells for the mono/right-aligned treatment.
  `.ld-table--interactive` adds the pointer, a sky focus outline, and a
  selected row (`aria-selected`) with a violet wash and left bar; selected
  rows look the same in any table. `.ld-num` now also sets tabular figures.
  `.ld-table__sort` headers are pill buttons with dim twin arrows; the sorted
  column (`aria-sort`) turns violet with one arrow, focus is the sky ring.
  `.ld-table__select` cells hold a full-cell checkbox target; the
  indeterminate select-all is a white bar on violet. `--sticky` keeps the
  header on high white glass on `--ld-z-sticky`; `--compact` halves the air,
  `--comfortable` opens and stripes rows in white glass (`--ld-table-pad-y`).
  `.ld-table-scroll` scrolls a wide or tall table in its own box.
- **Bulk action bar** `.ld-bulk-bar` (+ `--top`, `__count`, `__actions`) — a
  floating pill of high white glass on the violet level-3 shadow, sticky along
  the bottom edge on `--ld-z-sticky` (in the flow, so it never covers the last
  row; the page gets scroll padding while it shows). It bounces up on the
  spring (a fade under reduced motion); the count is violet Plus Jakarta 700.
- **Pagination** `.ld-pagination` (+ `__list`, `__link`, `__prev`, `__next`,
  `__page`, `__ellipsis`, `__text`, `__summary`, `__size`),
  `.ld-pagination-bar`, `.ld-load-more` — round pill cells in the display
  face; the current page is a solid violet disc on its tinted shadow, hover a
  sky wash, focus the sky ring; the summary takes the mono voice.
  Previous/Next drop their words below 30rem.
- **Chip** `.ld-chip` (+ `--removable`, `__label`, `__remove`;
  `.ld-chip-group`, `--scroll`, `__chips`, `__count`, `__clear`) — now in
  every theme (`components/chip.css`). Outlined pills until pressed
  (`aria-pressed`, `--selected`), then solid violet led by a white check.
  Applied filters are white glass pills with a violet edge and a round 24px
  remove button that warms red. `--scroll` is one sideways row that fades at
  the end.
- **Chart** `.ld-chart` (`__title`, `__svg`, `__grid`, `__baseline`,
  `__break`, `__tick`, `__axis-label`, `__bar`, `__bar--highlight`,
  `__value`, `__series--0..3`, `__line`, `__points`, `__label`, `__data`),
  `.ld-sparkline` — airy and confident: lavender bars with rounded ends (3:1
  on white), the called-out bar in full violet on a tinted shadow, thick round
  lines with white-ringed markers, mono ticks and a Plus Jakarta caption.
  Series run violet, deep sky, deep green, deep red (`--ld-chart-1..4`, every
  one 3:1 on white) and differ by dash and marker too.
- **Progress** `.ld-progress`, **Spinner** `.ld-spinner` — glowing violet.
- **Skeleton** `.ld-skeleton` (`--text`, `--circle`, `--block`) — soft
  violet-tinted glass with a wide white glare drifting across; text lines are
  pills. A still tint under reduced motion. Always `aria-hidden`; the loading
  region takes `aria-busy`.
- **Empty state** `.ld-empty` (+ `__icon`, `__title`, `__body`, `__actions`) —
  the icon floats in a round white glass bubble, Plus Jakarta 700 title, faint
  Inter body. `--first-use` makes the bubble a larger solid violet disc on the
  raised shadow; `--no-results` an outlined, dashed bubble; `--cleared` a pale
  green bubble with a deep green glyph.
- **Toast** `.ld-toaster` / `.ld-toast` (+ `--success`, `--warning`,
  `--danger`, `__body`, `__title`, `__message`, `__action`, `__close`,
  `__countdown`) — Level 2 white glass on `--ld-elevation-3`; the variant rides
  on a filled icon disc and the title in its deep, readable hue (accent deep,
  success deep, amber, danger deep); errors add the alert's 4px red rule. Pops
  in on the spring (a fade under reduced motion). The countdown is a floating
  violet pill bar that stops under `[data-ld-paused]`. Stack bottom-right on
  `--ld-z-toast`, top edge below 48rem, safe-area aware.
  A manual popover: it shows above an open modal and follows it, so its
  buttons work there.
- **Save status** `.ld-save-status` (+ `__text`, `__retry`; `data-ld-save`) — a
  white pill of mono 12px text: violet spinner while saving, deep green check
  once saved, a pale amber pill offline, a pale red pill with Retry on error.
- **Tooltip** `.ld-tooltip` (`data-ld-side`) — the one dark thing on the
  page: a soft ink bubble with white Inter 13px on a violet-tinted shadow, so it
  reads over glass and sky alike, in the top layer on `--ld-z-tooltip`.
  Anchored above its trigger, flipping below; pops in on the spring from 94%.
- **Menu** `.ld-menu` (+ `__item`, `__item--danger`, `__icon`, `__label`,
  `__shortcut`, `__group-label`, `__separator`; `.ld-context-target` on a
  context-menu region) — a Level 2 white glass card (20px blur) on
  `--ld-elevation-3`, Plus Jakarta 600 items, mono uppercase group labels. The
  focused item is a violet wash with violet text (plus the sky ring for the
  keyboard). Checked items fill a violet disc or rounded square with a white
  mark; danger items use danger deep. Springs open from 96%.
- **Sheet / drawer** `.ld-dialog--sheet`, `.ld-dialog--drawer`
  (`--drawer-start`), `.ld-dialog__handle` — Level 2 white glass on the modal
  shadow, inner corners at 1.5rem. Floats in on the spring over the slow
  duration (`@starting-style`) and leaves on the exit curve; a fade under
  reduced motion. The handle is an outline-grey pill that turns violet while
  held. Safe-area aware.
- **Command palette** `.ld-command` (+ `__search`, `__icon`, `__input`,
  `__list`, `__group`, `__group-label`, `__option`, `__option-icon`, `__label`,
  `__shortcut`, `__loading`) — a 1.5rem glass card set high on the screen; the
  input is a white field in Plus Jakarta 1.125rem that blooms the sky ring. The
  active option is a violet wash; matched letters (`.ld-match`) sit on a pale
  violet marker.
- **Search** `.ld-search` (+ `__input`, `__icon`, `__hint`, `__clear`) — a pill
  `.ld-input` with the glyph inset (violet spinner while loading), violet with
  focus; key hint while empty, a round clear button once filled.
- **Key hint** `.ld-kbd` — a little white key on the outline hairline with a
  heavier foot, mono 11px.
- **Accordion** `.ld-accordion` (+ `__item`, `__summary`, `__panel`) — native
  `<details>`/`<summary>`: separate white glass cards, Plus Jakarta headers, the
  whole row the button; an open card floats up to Level 2 glass. The chevron sits
  in a round sunken bubble that turns solid violet and flips on the panel's own
  duration and curve (the enter curve) while the height opens
  (`interpolate-size` with `::details-content`; it snaps where unsupported and
  under reduced motion).
- **Inline edit** `.ld-inline-edit` (+ `--multiline`, `__display`, `__text`, `__icon`, `__input`; `data-ld-edit`,
  `data-ld-saved`) — the text and the
  input share one box, so the swap moves nothing; hover washes the text white,
  editing lights the edge sky blue inside the 4px ring. A pencil shows on hover
  and keyboard focus, always on touch; saving is a violet spinner, then a
  deep-green check; errors take the red edge and the field error line.
- **Star rating** `.ld-rating` (+ `__legend`, `__options`, `__option`, `__input`, `__glyph`,
  `__value`, `__clear`; `--display`, `__stars`, `__count`) — rounded outline
  stars on the outline grey; chosen stars are solid violet and pop to 1.1 on the
  spring, clipped to `--ld-fill` for fractional averages; the hover preview is
  sky blue (only where hover is real). The average is in the display face, the
  count in mono.
- **Settings** `.ld-settings` (+ `__nav`, `__link`, `__body`, `__section`, `--danger`,
  `__header`, `__title`, `__description`, `__row`, `__label`, `__hint`, `__control`) — the section nav
  sticks beside the sections when the container has room (a scrolling row of
  pills otherwise); the current link is the solid violet pill. Sections are
  white glass cards; the danger zone comes last as a pale red card with the
  alert's 4px red rule.
- **Presence** `.ld-presence`, `.ld-cursor` (+ `__pointer`, `__name`; `data-ld-color`,
  `data-ld-idle`), `.ld-avatar-stack`, `.ld-avatar` (+ `--overflow`, `__img`) — remote
  cursors are friendly: a deep-coloured pointer with a white edge on a tinted
  shadow and a pill tag in the display face. Eight deep slots
  (`--ld-presence-1..8`, 3:1 on the sky and on white) carry white ink; the vivid
  palette hues would not. The layer sits on `--ld-z-sticky` and never takes a
  click; idle cursors fade out. Avatars are discs with a white ring.
- **Range slider** `.ld-range` (native `input[type=range]`; fill from `--ld-range-fill`), `.ld-slider` (+ `__header`,
  `__input`, `__pair`, `__track`, `__bubble`, `__ticks`, `__tick`, `__marks`, `__mark`; `--range`) — a soft sunken
  pill that fills with a violet gradient; the thumb is a white knob with a violet ring and a tinted shadow (24px, in a
  44px-tall target) that swells with a bounce while dragged, and blooms a sky ring on keyboard focus. The value floats
  above in a violet pill; ticks are lavender dots.
- **Date and colour pickers** `.ld-date` (+ `__presets`, `__input`), `.ld-color` (+ `__row`, `__swatch`, `__picker`,
  `__hex`, `__preview`, `__sample`, `__contrast`), `.ld-swatches`, `.ld-swatch` (+ `__input`, `__chip`) — the sunken
  date field with a violet calendar glyph under pill presets. Swatches are round; the chosen one shrinks onto a white
  ring with a violet halo and a check. The preview is a white card; the contrast pill is deep green, amber or deep red.
- **File upload** `.ld-dropzone` (+ `__input`, `__icon`, `__title`, `__prompt`, `__hint`; `data-ld-drag`),
  `.ld-upload-list`, `.ld-upload` (+ `__thumb`, `__name`, `__size`, `__status`, `__progress`, `__actions`;
  `data-ld-upload`) — a frosted card with a dashed lavender edge and a violet cloud glyph; a file dragged over turns
  the edge solid sky with a halo and tint, an unacceptable one deep red. Files are white cards with sky type tiles.
- **Drag and drop** `.ld-sortable` (+ `__item`, `__body`; `data-ld-dragging`, `data-ld-drop`), `.ld-drag-handle`,
  `.ld-board` (+ `__column`, `__title`, `__count`) — white cards with a lavender grip. A lifted card floats on
  `--ld-elevation-4`, swells 3% with a bounce and tilts a degree and a half under a pointer; a violet pill line marks
  the slot, and the target column fills sky with a sky edge.
- **Swipe actions** `.ld-swipe` (+ `__content`, `__main`, `__actions--leading`, `__actions--trailing`, `__action`,
  `__action--danger`) — a white card over a soft well that settles on the bouncy spring and lifts when open; neutral
  actions are sky with deep-sky text, the destructive one deep red with white text.
- **App shell** `.ld-shell` (+ `__skip`, `__header`, `__toggle`, `__brand`,
  `__actions`, `__nav`, `__scrim`, `__main`, `__footer`; `.ld-topnav`/`__item`;
  `.ld-sidenav` + `__section`, `__heading`, `__item`, `__icon`, `__label`,
  `__badge`, `__footer`) — brand in Plus Jakarta 800 violet. Items are pills that fill with sky tint on hover and press in on click; the current page is the solid violet pill with the raised violet shadow (sky-tinted in the tab bar); top-nav current page takes the violet underline. The header and nav are unfilled — hairline
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
  rail from the Retail Dashboard "Active Delivery" box: glowing violet fill on
  a blend track, 2rem nodes. `__step--complete` is a solid violet node with a
  white icon and an on-surface label; `--current` a white node with a 2px
  violet border, violet icon, raised shadow, and violet label; `--upcoming` a
  sunken node with faint icon and label. The rail is per-step
  (`::before` track, `::after` fill), so the fill follows the modifiers and
  `aria-current="step"` marks the active node.
- **Muted text** `.ld-muted` — faint secondary/empty-state text;
  `color: var(--ld-faint)`, italic — a friendly, soft touch consistent with
  the theme's airy, optimistic voice.
- **Pre / log block** `.ld-pre` — command/log `<pre>`; sunken background,
  `--ld-outline` hairline (not `--ld-border`, which is the glass-only token
  and would be invisible on this opaque surface), radius, small mono,
  horizontal scroll. `.ld-pre--log` bounds it (`--ld-log-max-height`,
  420px), scrolls both ways, and wraps long lines — flat, no scanlines.
- **Copy control** `.ld-pre-copy` — an `.ld-icon-btn` pinned top-right in
  a `.ld-pre-wrap`; fades in on hover/focus-within, always shown on touch
  (`hover: none`). `data-ld-copy="copied"` swaps the copy glyph for a
  success-tinted check; `"failed"` tints it danger. Status goes to a
  visually hidden `aria-live` `.ld-pre-copy-status`.

## Deviations from the Stitch source

- The generated screens flattened all three type voices to Plus Jakarta Sans.
  This theme follows the project's written design system instead (Inter body,
  JetBrains Mono labels), which is the richer and intended spec.
- The project's stored theme carried an earlier palette (near-black primary
  `#01020e`, lavender secondary `#7248ae`). The rendered screens — all three,
  in agreement — use violet `#4500d9` and sky blue `#0cb3ff`. This theme
  matches the screens, since that is what Summer Cloud actually looks like.
- Tabs, table, dialog, and spinner do not appear in the source screens; they are
  extrapolated from the rules above to complete the `ld-*` inventory.
- The source screens set white text on retail red (`#ff4d4d`), which is 3.27:1 —
  below AA at badge and button sizes. This theme keeps the vivid red and puts
  dark text on it (4.97:1), and uses `--ld-danger-deep` for the solid
  destructive button (5.55:1 on white). Every other foreground/background pair
  in the palette clears AA.

## Code syntax

Tokens `--ld-code-*`, part of the baseline contract. Palette hues deepened for
contrast on white: violet keywords, deep-green strings, deep-amber numbers,
accent-deep functions, deep-teal types, danger-deep variables, muted-faint
comments, faint meta.

## Scoping

Every rule is guarded by `data-ld-style="summer-cloud"` (self or ancestor),
wrapped in zero-specificity `:where()`. Set the attribute on `<html>` for a
page or on a container for an embedded island.
