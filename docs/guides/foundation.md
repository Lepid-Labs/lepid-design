# Use the motion, elevation and layer tokens

For anyone building components in this repo or screens on top of a theme. After reading it you can pick the right
duration, curve, shadow level and z-index layer for a new piece of UI, keep hover effects from trapping touch and
keyboard users, and build a card that is one clickable target. The live demo is `site/foundation.html`.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/styles` at contract 2 or later (`manifest.json` reports `"contract": 2`). Contract 2 added these
  tokens to the baseline every theme must declare; a theme kept outside this repo needs them too.

## Motion

Every theme declares the same names with its own values. Use them in pairs: one duration, one curve.

| Token | Use it for |
| --- | --- |
| `--ld-duration-fast` | Exits, press feedback, small hover changes |
| `--ld-duration-base` | Entrances and in-place state changes; the same value as `--ld-transition` |
| `--ld-duration-slow` | Moments that should be noticed: a toast arriving, a confirmation; pair it with the spring |
| `--ld-ease-standard` | Something changing where it is: colour, size, a toggle |
| `--ld-ease-enter` | Something arriving: decelerates into place |
| `--ld-ease-exit` | Something leaving: accelerates away |
| `--ld-ease-spring` | Overshoot and settle; sampled to run over `--ld-duration-slow` |

Exits run faster than entrances: pair `fast` with `exit` and `base` with `enter`.

```css
.panel {
  transition: opacity var(--ld-duration-base) var(--ld-ease-enter),
    translate var(--ld-duration-base) var(--ld-ease-enter);
}
.panel[data-leaving] {
  transition-duration: var(--ld-duration-fast);
  transition-timing-function: var(--ld-ease-exit);
}
@media (prefers-reduced-motion: reduce) {
  .panel { transition: none; }
}
```

`--ld-transition` is a bare duration, not a duration plus curve, because some rules use it as a delay
(`visibility 0s linear var(--ld-transition)`). Keep it that way when you override it.

## Elevation

Four levels. Write `box-shadow: var(--ld-elevation-N)`; a component that changes state moves one level, it does not
invent a shadow.

| Level | Token | Use it for |
| --- | --- | --- |
| 1 raised | `--ld-elevation-1` | Resting panels that sit above the page; a pressed card |
| 2 lifted | `--ld-elevation-2` | A hovered interactive card, a header once content scrolls under it |
| 3 floating | `--ld-elevation-3` | Menus, popovers, listboxes, toasts, tooltips |
| 4 modal | `--ld-elevation-4` | Dialogs, sheets, drawers |

The dark themes express depth as light: each level is a wider glow, and level 3 adds a lit hairline and a dark drop
so a menu parts from the content beneath it. summer-cloud uses violet-tinted shadows, a contact shadow under a soft
spread. Its older names stay: `--ld-shadow` is level 1, and `--ld-shadow-soft`, `--ld-shadow-raised` and
`--ld-shadow-raised-hover` keep their values.

## Layers

One z-index scale, identical in every theme so overlays from different components interleave the same way whatever
theme is active.

| Token | Value | Use it for |
| --- | --- | --- |
| `--ld-z-tooltip` | 50 | Tooltips, the shell's skip link |
| `--ld-z-toast` | 45 | Notifications, above the modal that raised them |
| `--ld-z-modal` | 40 | Drawers, sheets, dialogs that are not in the top layer |
| `--ld-z-overlay` | 30 | Scrims |
| `--ld-z-dropdown` | 25 | Menus, popovers, listboxes that are not in the top layer |
| `--ld-z-header` | 20 | The app header |
| `--ld-z-sticky` | 10 | Sticky side nav, sticky table headers |
| `--ld-z-base` | 0 | In-flow content |

- z-index does nothing on a static element: give it `position` first.
- A modal `<dialog>` and a `popover` render in the browser's top layer and need no z-index at all. Prefer them.
- Stacking inside one component (a nested control above an overlay, an indicator behind its track) uses `-1` or `1`
  under `isolation: isolate`, so it cannot leak into the page.
- A dropdown inside a modal lives in the modal's stacking context, so its `--ld-z-dropdown` only ranks it among the
  modal's own children. That is the intended behaviour.

The contract test rejects any other literal z-index in theme CSS.

## Hover

Hover does not exist on touch screens; a tap leaves `:hover` stuck until the next tap. Three rules:

1. Never put a primary action behind hover. Anything revealed on hover is always visible under
   `@media (hover: none)`, the way the code-block copy button is.
2. Hover rules that move or animate (lift, scale, slide, pulse) go inside `@media (hover: hover)`. Colour changes
   may stay ungated.
3. Every hover state has a keyboard twin: `:focus-visible` on the element, or `:focus-within` on a container.

```css
.thing:hover, .thing:focus-visible { color: var(--ld-primary); }
.thing:focus-visible { transform: translateY(-2px); }
@media (hover: hover) {
  .thing:hover { transform: translateY(-2px); }
}
```

The contract test fails a theme whose hover rule sets `transform` or `animation` outside `@media (hover: hover)`.

## Interactive card

`.ld-card--interactive` makes a card one clickable target. Mark its primary link (or button) with `.ld-card__link`:
that link's `::after` covers the whole card, so a click anywhere follows it. Nested links, buttons and fields sit
above that overlay and keep their own clicks.

```html
<div class="ld-card ld-card--interactive">
  <h3><a class="ld-card__link" href="/pipelines/deploy">Deploy pipeline</a></h3>
  <p>Builds on every push to main. See the <a href="/runbooks/deploy">runbook</a>.</p>
  <button type="button" class="ld-icon-btn" aria-label="Star pipeline" aria-pressed="false">…</button>
</div>
```

```tsx
<Card interactive>
  <h3><Link className="ld-card__link" to="/pipelines/deploy">Deploy pipeline</Link></h3>
  <p>Builds on every push to main.</p>
</Card>
```

What the card does in every theme:

- **Pointer:** the cursor is a pointer over the whole card; hover lifts it and raises it to `--ld-elevation-2`
  (only where hover is real); a press settles it towards level 1.
- **Keyboard:** Tab reaches the link, and its focus ring is drawn around the whole card. Enter follows the link (or
  Enter and Space press the button). Nested controls keep their own place in the tab order.
- **Screen readers:** the link's name is its text, so keep it to the card's title; the rest of the card is read as
  ordinary content.
- **Reduced motion:** the lift is dropped; the shadow change stays.

Keep the link's ancestors up to the card unpositioned, or the overlay shrinks to the nearest positioned one. Text
under the overlay cannot be drag-selected; if a value must be copyable, give it its own control. In summer-cloud,
`.ld-card--floating` is still the decorative lift for tiles that are not one target.
