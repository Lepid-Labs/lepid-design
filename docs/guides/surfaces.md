# Build surfaces: accordions, inline editing, star ratings and live cursors

For anyone building screens on top of a theme, in React or plain HTML. After reading it you can stack disclosures that
open smoothly, let people edit text where it sits, collect and show star ratings honestly, and show who else is on a
shared canvas. Putting these together into a settings page has its own guide, [settings.md](settings.md). The live
demo is `site/surfaces.html`.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/styles` and `@lepid-labs/ui-react` from the release that adds `Accordion`. No token was added: motion
  uses the duration and curve tokens and presence the `--ld-z-sticky` layer from [foundation.md](foundation.md), and
  inline-edit errors use the field error line from [forms.md](forms.md).

## Accordion

```tsx
<Accordion>                                   {/* FAQ: several answers can stay open */}
  <AccordionItem title="Can I change my plan later?" open>Yes. Upgrades apply at once.</AccordionItem>
  <AccordionItem title="Is there an API?">Every action has an endpoint.</AccordionItem>
</Accordion>
<Accordion exclusive>                         {/* steps: opening one closes the others */}
  <AccordionItem title="1. Connect a repository">…</AccordionItem>
  <AccordionItem title="2. Choose a build command">…</AccordionItem>
</Accordion>
```

Each item is a native `<details>`; `exclusive` gives the group one `name`, so the browser closes the others itself,
before any script runs. `open` is the initial state; listen with `onToggle`.

Four rules from the pattern, and how the theme keeps them:

1. **Don't animate `height: auto` and hope.** The panel's height animates with `interpolate-size: allow-keywords` and
   `::details-content`, inside `@supports`. Browsers without them open the panel at once, which is the right fallback.
   Under reduced motion it always opens at once.
2. **The chevron moves with the panel.** Both use the same duration and curve token, so the chevron never trails
   (the contract test checks it).
3. **Match open behaviour to the content.** One at a time for sequential steps (`exclusive`); several at once for
   FAQs and reference, where readers compare. When an item above closes, the browser's scroll anchoring keeps the row
   you pressed where it was.
4. **The header is a real button.** `<summary>` is focusable, toggles on Enter and Space, announces expanded or
   collapsed, and draws the theme's focus ring. The whole row is the target, chevron included.

The panel's padding sits inside the content, so the text is laid out at its final width before it is revealed and
does not reflow as it opens. Plain HTML:

```html
<div class="ld-accordion">
  <details class="ld-accordion__item" name="setup">
    <summary class="ld-accordion__summary">1. Connect a repository</summary>
    <div class="ld-accordion__panel"><p>…</p></div>
  </details>
</div>
```

A lone `.ld-accordion__item` works too, for one "Advanced" disclosure. The theme draws the chevron; add no icon.

## Inline editing

```tsx
<InlineEdit label="Project name" value={name} onSave={(v) => api.rename(id, v)}
  validate={(v) => (v.trim() ? undefined : "A project needs a name.")} />
<InlineEdit label="Description" value={notes} onSave={saveNotes} multiline placeholder="Add a description" />
```

- **Open:** click the text, or focus it and press Enter or F2. The input takes the text's place in the same box (same
  font, padding and 1px edge), so nothing moves; only the edge lights.
- **Commit and cancel:** Enter saves (Ctrl+Enter or ⌘+Enter in a textarea, where Enter is a new line). Escape puts the
  old text back. Both return focus to the text. Clicking away also saves: that is the one blur rule, everywhere.
- **Optimistic save:** the new text shows at once with a busy mark where the pencil was, then a check. `onSave`
  rejecting rolls the text back, reopens the input with the draft kept, and shows the error's message in the field's
  error line (with `aria-invalid`). A save that fails after the reader has moved on does not pull focus back.
- **Affordance:** a pencil and a faint edge appear on hover and on keyboard focus, and the pencil is always shown on
  touch screens (`hover: none`), so editable text never looks like plain text there.
- **Screen readers:** the text is a button named "Edit project name: Deploy pipeline". "Saving" and "Saved" are
  announced politely; so is an error.

Use it where a mistake is cheap and easy to fix: names, titles, descriptions. Where a change is expensive (an email
that needs confirming, anything billed), put an explicit Edit button in front of a form instead.

Plain HTML: `inlineEdit`, `inlineEditState` and `inlineEditKey` are the pure state machine and keys; the markup is
`.ld-inline-edit` (`--multiline`, `data-ld-edit="display|editing|saving|error"`, `data-ld-saved`) holding
`button.ld-inline-edit__display` > `.ld-inline-edit__text` (`--empty`) + `.ld-inline-edit__icon`, or the
`.ld-inline-edit__input`, then a `.ld-field__message--error`. `site/inline-edit-demo.js` wires it in about 100 lines.

## Star rating

```tsx
<StarRating label="Rate this guide" value={mine} onChange={setMine} />   {/* input */}
<StarRating value={4.3} count={128} />                                    {/* read-only: ★★★★☆ 4.3 (128) */}
```

**Input.** A `fieldset` of five native radios: Tab reaches the group once, the arrow keys move and choose, and each
star is a large target. Where hover is real, pointing previews the rating in another colour without choosing it, and
the saved value comes back when the pointer leaves; on touch there is no preview to get stuck. Clear (shown once rated)
sets 0 and moves focus back to the stars.

**Read-only.** The stars fill to the exact average, to one decimal: 4.3 fills four stars and 30% of the fifth.
`roundRating` never rounds up to a perfect score that was not earned (4.97 reads 4.9), and the stars use the same
rounded number as the text beside them. With `count={0}` it says "No ratings" instead of showing zero stars as a score.
The whole thing is one image to screen readers, named "4.3 out of 5 stars, 128 ratings".

Colour is never the only cue: an empty star is an outline, a filled one solid, and the number is printed. Plain HTML:
`.ld-rating` (a `fieldset`) > `.ld-rating__legend`, `.ld-rating__options` > `label.ld-rating__option` >
`input.ld-rating__input` + `.ld-rating__glyph`, then `.ld-rating__value` and `.ld-rating__clear`; the theme fills the
stars up to the checked radio with CSS alone. Read-only is `.ld-rating--display` (`role="img"`) with
`.ld-rating__stars` of glyphs carrying `--ld-fill: 0..1` from `starFills`, `.ld-rating__value` and `.ld-rating__count`.

## Live cursors and presence

```tsx
<div style={{ position: "relative" }}>
  <Canvas />
  <PresenceCursors users={peers} selfId={me.id} />  {/* { id, name, x, y, lastSeen } in px from the layer */}
</div>
<AvatarStack users={peers} max={4} />
```

The components draw; your app does the networking and passes positions as they arrive.

- **Glide:** reports come about ten times a second; each cursor eases towards the latest one every frame
  (`followPoint`, a 50 ms half-life), so it moves instead of teleporting. Under reduced motion it jumps.
- **Colour:** `presenceColor(id)` hashes the id to one of eight slots, so a person keeps their colour across sessions
  and on every client. Each theme maps the slots to its own palette (`--ld-presence-1..8`); every colour holds 3:1
  against the page and carries its name tag at 4.5:1. Eight slots means two people can share a colour; the name tag
  tells them apart.
- **Idle and away:** a cursor that has not moved for `idleMs` (10 s) fades out. Leave `x` and `y` out while someone's
  pointer is off the canvas and their cursor is removed. Your own pointer is the real one: pass `selfId`.
- **Layer:** the layer fills its positioned parent on `--ld-z-sticky`, above the canvas and below the header, menus and
  dialogs, with `pointer-events: none`, so it never takes a click.
- **Screen readers:** cursors are `aria-hidden`. The avatar stack is the accessible "who is here": a list named "Here
  now" with each person's name, and the overflow reads "and 5 more:" followed by their names.

`avatarOverflow` turns the last slot into "+N" only when it hides two or more people. Not included: locking an element
someone is editing, and follow mode. Plain HTML: `.ld-presence` > `.ld-cursor` (`data-ld-color="1..8"`,
`data-ld-idle`, `translate` from your script) > `svg.ld-cursor__pointer` + `.ld-cursor__name`; `ul.ld-avatar-stack` >
`li` > `.ld-avatar` (`data-ld-color`, `--overflow`, `__img`). `site/presence-demo.js` runs a fake server.

## Run the demo locally

The demo imports the pure helpers from `site/ui/`, which the Pages workflow builds. Locally, after `pnpm build`:

```sh
ln -s ../styles site/styles
ln -s ../components/react/dist site/ui
python3 -m http.server --directory site
```

Serve it over HTTP: browsers do not load ES modules from `file://`.
