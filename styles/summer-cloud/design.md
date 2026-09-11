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
- Two elevation tiers only — Level 1 glass (0.6 white / 12px blur) for content,
  Level 2 (0.8 white / 20px blur + lift) for interactive and floating things.
- **Bouncy, not linear.** Buttons scale to 1.03 on hover and 0.95 on press with
  `cubic-bezier(0.34,1.56,0.64,1)`; floating cards translate `-4px`.
- Focus is a 4px sky-blue ring (`0 0 0 4px rgba(12,179,255,0.2)`), never an
  outline suppression without a replacement.
- Spacing is strictly multiples of 8px. When in doubt, add 8.
- Respect `prefers-reduced-motion` — every transform is dropped.

## Components

Class prefix `ld-` (shared across themes so `@lepid-labs/ui-react` stays
theme-agnostic). Variants use BEM-ish modifiers (`ld-btn--primary`).

- **Card** `.ld-card` — glass panel; `--floating` adds the Level 2 hover lift.
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
  shape is kept.
- **Hold button** `.ld-btn--hold` (+ `__ring`, `__body`, `__label`, `__hint`,
  `__meter`) — hold-to-confirm: a 3px conic **violet** ring around the icon
  well fills as `--ld-hold` goes 0→1, on the glass pill. With `--danger` the
  pill stays glass with deep-red text (the ring and hint carry the state; a
  violet ring on the solid red CTA would fight it). Press does not shrink
  the pill — the ring is the feedback. `data-ld-hold="fired"` bounces to
  1.06 (dropped under reduced motion; the fill stays). Window:
  `--ld-hold-duration` 350 ms — soft and unhurried.
- **Form** `.ld-input`, `.ld-textarea`, `.ld-select`, `.ld-label`, `.ld-field`,
  `.ld-checkbox`, `.ld-radio`, `.ld-switch`, `.ld-choice` — sunken fields, no
  resting border, sky-blue ring on focus. The switch is the oversized
  "cloud-toggle": squishy, and green when live.
- **Badge** `.ld-badge` + semantic modifiers — solid pills, mono uppercase.
  `--sm` is the 9px dashboard pill; `--pulse` the amber call to action with a
  breathing glow.
  **Chip** `.ld-chip` — outlined filter chip; `--selected` fills violet.
- **Alert** `.ld-alert` — glass card with a 4px semantic left rule.
- **Dialog** `.ld-dialog` — native `<dialog>`, opaque white, blurred backdrop.
- **Tabs** `.ld-tabs`/`.ld-tab`/`.ld-tabpanel` — violet underline when active.
- **Table** `.ld-table` — mono uppercase headers, sky-tint row hover; add
  `.ld-num` to numeric cells for the mono/right-aligned treatment.
- **Progress** `.ld-progress`, **Spinner** `.ld-spinner` — glowing violet.
- **Muted text** `.ld-muted` — faint secondary/empty-state text;
  `color: var(--ld-faint)`, italic — a friendly, soft touch consistent with
  the theme's airy, optimistic voice.
- **Pre / log block** `.ld-pre` — command/log `<pre>`; sunken background,
  `--ld-outline` hairline (not `--ld-border`, which is the glass-only token
  and would be invisible on this opaque surface), radius, small mono,
  horizontal scroll.

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
