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
   font, radius, spacing, duration and easing (`--ld-duration-*`,
   `--ld-ease-*`), shadow (`--ld-elevation-1..4`), and z-index (`--ld-z-*`
   layers) value. If a needed token doesn't exist, propose adding it to
   `lepid-design` rather than hardcoding. When to use each level:
   `docs/guides/foundation.md`.
2. **Existing components first.** Before building UI, check the component
   inventory below. App-local components are only for genuinely app-specific
   composites — and should still be built from `ld-*` classes.
3. **Read the style's `design.md`** before designing new screens — it states
   the aesthetic rules that the CSS alone does not encode.
4. **Hover is never the only path.** Hover motion goes inside
   `@media (hover: hover)`; every hover state gets a `:focus-visible` (or
   `:focus-within`) twin; anything revealed on hover is always visible on touch.
5. **Forms explain themselves.** Errors go through `Field`'s `error` (icon +
   text, never colour alone), validated on blur and then live; a running
   request is `busy`, not `disabled`; a blocked action the user can fix gets a
   `disabledReason`. When to use which: `docs/guides/forms.md`.
6. **Feedback fits the wait and the weight.** No indicator under ~400 ms and
   none that flashes (`useLoadingIndicator`); a `Skeleton` for content of known
   shape, `Progress` for long measured work. Empty lists get an `EmptyState`
   with a next step. Results of actions go in a `toast()`; reversible actions
   get Undo (`scheduleUndoable`), not a confirm; only irreversible ones confirm
   (`HoldButton`, `Dialog`). When to use which surface:
   `docs/guides/feedback.md`.
7. **The lightest overlay that does the job.** Tooltip for a label or a note
   (never anything essential), toast for a result, `Menu` for a few actions on
   one thing (`ContextMenu` only as a shortcut to actions shown elsewhere),
   drawer `Sheet` for side content, bottom `Sheet` for a phone task, `Dialog`
   for a decision; one modal at a time. ⌘K is the app's `CommandPalette`;
   `SearchInput` searches one collection in place. When to use which:
   `docs/guides/overlays.md`.
8. **A change takes effect at the weight of a mistake.** Preferences save as
   they change (`useAutosave` + a `SaveStatus` per section), short text is an
   `InlineEdit` (Enter or blur saves, Escape restores), secrets need an explicit
   button, and the irreversible goes last in a danger zone behind a typed
   confirmation. Settings layout: `docs/guides/settings.md`; accordion, inline
   edit, rating and presence: `docs/guides/surfaces.md`.
9. **Direct manipulation always has a second way in.** Sliders pair with a
   number box (`input`) when exact values matter; dates lead with presets and
   use the native picker; uploads say every state per file; drag and drop has a
   keyboard path (Space, arrows, Space, Escape) and announces moves; a swipe
   action is also in the row's menu, and a destructive one undoes instead of
   confirming. Guides: `docs/guides/manipulation.md`, `docs/guides/pickers.md`.
10. **Gaps go upstream.** A missing component belongs in `lepid-design` as a PR,
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
gradient (an `.ld-shell` paints it for you).

## Component inventory

React exports (each renders the matching `ld-*` CSS class, usable directly in
non-React apps):

| React | CSS class | Notes |
| --- | --- | --- |
| `Button` | `.ld-btn` | variants: `primary`, `accent`, `danger`; `busy` (→ `aria-busy`: spinner over a same-width label, clicks ignored, focus kept, `busyLabel` announced) instead of `disabled` while a request runs; `disabledReason` (→ focusable `aria-disabled` + visible `.ld-btn-reason` via `aria-describedby`) when the user can unblock it; `reasonAs="tooltip"` shows that reason in a tooltip (hover, focus, tap) for dense toolbars |
| `ButtonGroup` | `.ld-btn-group` | one long track of `Button`s (`role="group"`, pass `aria-label`); `block` for full-width equal segments; toggle/segmented use: set `aria-pressed` on each `Button` — caller owns the state; one pressed segment gets a sliding pill (plain HTML: set `data-ld-dir="forward"\|"back"` on the track when selection moves) |
| `IconButton` | `.ld-icon-btn` | icon-only control; `label` required (→ `aria-label` + `title`); `active` (on a link also `aria-current="page"`), `variant="danger"`; `as="a"` or a router Link for nav; toggle: pass `aria-pressed`; `tooltip` shows `label` in a styled `Tooltip` that names the control instead of `title` |
| `HoldButton` | `.ld-btn--hold` | hold-to-confirm; `onConfirm` fires once when the ring completes; `duration`, `hint`, `icon`, `showMeter`, `confirmOnKeyboardTap` |
| `Card` | `.ld-card` | glass panel; `interactive` (`--interactive`) makes it one clickable target: mark its primary link or button `className="ld-card__link"` (its hit area covers the card, nested controls keep their clicks); hover lift, focus ring, press |
| `StatusCard` | `.ld-status-card` | dashboard card: `tone` edge, `attention` ring, `changedAt` flash, `prefix`/`title`/`href`, `meta`, `note`, `watermark`; body from `StatusCardRows`/`StatusCardRow`/`StatusCardFooter`/`StatusCardEmpty` |
| `NavLink` | `.ld-link` | chevron + glow hover |
| `Input`/`Textarea`/`Select` | `.ld-input` etc. | pair with `Field`/`Label` |
| `Field` | `.ld-field`, `__hint`, `__message--error`/`--success`, `.ld-field--success` | label + one control + `hint`, `error` (→ `aria-invalid`, icon), `success`; wires ids and `aria-describedby`/`aria-errormessage`, polite status line. Validate with `nextFieldStatus` (blur first, then live once in error). States: filled (needs a placeholder), `:disabled`, `[readonly]` |
| `PasswordField` | `.ld-password` | reveal toggle (`aria-pressed`, keeps focus and caret); `mode="new"` adds strength meter (`passwordStrength`) + ticking checklist (`rules`) and `autocomplete="new-password"`; default `current-password` |
| `OtpInput` | `.ld-otp`, `.ld-otp__cell` | one-time code: `length` cells as one field, paste/SMS autofill fills all, `onComplete`, `name` submits; inside `Field` shares its label and error |
| `MaskedInput` | `.ld-input` | formats as you type (`mask`, `MASKS.card`/`phone`/`expiry`/`date`), caret never jumps; `value`/`onValueChange` are the raw value, `name` submits it. Pure `applyMask` for other inputs |
| `Checkbox`/`Radio`/`Switch` | `.ld-checkbox` etc. | `label` prop wraps in `.ld-choice` |
| `Badge` | `.ld-badge` | semantic variants; `size="sm"` (`--sm`) for dashboard pills, `pulse` (`--pulse`) for the one glowing call to action |
| `Alert` | `.ld-alert` | `variant` + optional `title` |
| `Dialog` | `.ld-dialog` | native `<dialog>`, `open`/`onClose`/`actions` |
| `Sheet` | `.ld-dialog--sheet`, `.ld-dialog--drawer` (`--drawer-start`), `.ld-dialog__handle` | `Dialog` props + `side`: `bottom` (grab handle, drag down to dismiss) or `start`/`end` drawer; backdrop click and Escape close; slides on `@starting-style`, safe-area aware |
| `Tooltip` / `useTooltip` | `.ld-tooltip` | wraps one focusable child; `content`, `kind` (`description` → `aria-describedby`, `label` → `aria-labelledby`), `side`; 400 ms delay, instant hand-off, hover/focus, stays while hovered, Escape hides; Popover `hint` (else `manual`) + anchor positioning |
| `Menu` + `MenuItem`/`MenuCheckboxItem`/`MenuRadioItem`/`MenuGroup`/`MenuSeparator` | `.ld-menu`, `.ld-menu__item` (`--danger`), `__icon`, `__label`, `__shortcut`, `__group-label`, `__separator` | APG menu button: `trigger` element gets `popovertarget` + ARIA; arrows, Home/End, typeahead, Escape/Tab close and return focus; `disabled`, `variant="danger"`, `shortcut` hint; flips at edges |
| `ContextMenu` | `.ld-context-target` + `.ld-menu` | region prop `menu` (the same items); right-click, 500 ms long-press, Shift+F10 / ContextMenu key; opens at the pointer, clamped to the viewport |
| `CommandPalette` | `.ld-command` (+ `__search`, `__input`, `__list`, `__group-label`, `__option`, `__shortcut`, `__loading`), `.ld-match` | ⌘K/Ctrl+K; `commands: {id, label, group?, keywords?, shortcut?, icon?, onSelect?}[]`, `recent` ids (keep with `pushRecent`), `loading`, `onQueryChange`; APG combobox with `aria-activedescendant`, fuzzy filter + highlight, Skeleton/EmptyState states |
| `SearchInput` | `.ld-search` (+ `__input`, `__icon`, `__hint`, `__clear`), `.ld-kbd` | `type="search"` with glyph, clear button, `shortcut` key (e.g. `/`) + hint, `loading` spinner; keep a placeholder. Debounce with `debounceQuery(onQuery)` (250 ms, instant clear, no repeats) |
| `Tabs` | `.ld-tabs` | `items: {id, label, content}[]`; the underline slides between tabs (plain HTML: set `data-ld-dir="forward"\|"back"` on `.ld-tabs` when selection moves) |
| `Progress`/`Spinner` | `.ld-progress`/`.ld-spinner` | |
| `Skeleton` | `.ld-skeleton` (`--text`/`--circle`/`--block`) | placeholder in the content's shape; `lines`, `width`, `height`; `aria-hidden`, put `aria-busy` on the loading region. Gate any indicator with `useLoadingIndicator(loading)` (400 ms delay, 500 ms minimum) |
| `EmptyState` | `.ld-empty` | `variant`: `first-use`/`no-results`/`cleared`; `icon`, `title` (`titleAs`), body as children, `actions`. Inside a `StatusCard` use `StatusCardEmpty` instead |
| `Toaster` + `toast()` | `.ld-toaster`, `.ld-toast--<variant>` | mount `<Toaster />` once; `toast({ message, title, variant, duration, action, undo, id })` from anywhere, `toast.dismiss(id)`. Max 3 shown, clocks pause on hover/focus/hidden tab, errors stay and are assertive, F8 jumps in, Escape dismisses; stays above (and usable in) an open modal |
| `scheduleUndoable` | (with `toast({ undo })`) | deferred commit: `scheduleUndoable({ commit, undo, delay })`; as a toast's `undo` it gets an Undo button and countdown, commits when the toast closes otherwise or the page unloads |
| `SaveStatus` + `useAutosave` | `.ld-save-status[data-ld-save]` | `useAutosave(save)` → `{ status, state, edit, retry }` (800 ms debounce, 5 s max wait, offline queue, unload guard); `<SaveStatus status savedAt onRetry>` announces only offline, errors and the recovery |
| `Stepper` | `.ld-stepper` | milestone rail; `steps: {id, label, icon?}[]`, `current` index derives complete/current/upcoming and the rail fill; `aria-current="step"` on the active node |
| `AppShell` | `.ld-shell` | app frame; `header`/`nav`/`footer` all optional (missing tracks collapse); paints the theme background under unfilled header/nav; the header spans full width above the nav (toggle + brand at its left); nav collapses to an icon rail (wide), drawer or `mobileNav="tabbar"` below 48rem; plain HTML sets `data-ld-nav-collapsed`/`data-ld-nav-open` on the root |
| `AppHeader`/`ShellToggle`/`TopNav`/`TopNavItem` | `.ld-shell__header` etc. | sticky top bar: toggle, `brand`, `nav`, right-aligned `actions` |
| `SideNav`/`SideNavSection`/`SideNavItem` | `.ld-sidenav` | left-hand nav; items take `icon`, `badge`, `active` (→ `aria-current="page"`), `as` for router links |
| `Page`/`PageHeader` | `.ld-page` | centered column (`width`: narrow/default/wide/full) with title, eyebrow, subtitle, actions |
| `Grid`/`Split`/`AsideLayout`/`Center` | `.ld-grid`/`.ld-split`/`.ld-aside-layout`/`.ld-center` | dashboard grid, list + detail, content + sticky aside, centered column |
| `LogBlock` | `.ld-pre`, `.ld-pre--log` | terminal/log output: bounded height (`maxHeight`, default 420px), scrolls, wraps long lines; `follow` keeps the newest line in view while the reader is at the bottom; `role="log"` unless `live={false}`. Plain command snippets: bare `.ld-pre` |
| `CodeBlock` | `.ld-pre-wrap`, `.ld-pre-copy` | `.ld-pre` with a copy-to-clipboard `.ld-icon-btn` top-right (hover/focus reveal, always on touch); check for 1.5s + polite announcement; `copyLabel`, `wrapClassName`. Plain HTML: wrap markup + the README's vanilla snippet (sets `data-ld-copy="copied"\|"failed"`) |
| `Table`/`TableRow` | `.ld-table`, `.ld-table--interactive`, `--sticky`, `--compact`/`--comfortable`, `.ld-num`, `.ld-table-scroll` | compose native `thead`/`tbody`/`th`/`td`; `<Table interactive>` + `<TableRow onActivate selected>` for clickable rows (click or Enter/Space; nested controls don't trigger it; `selected` → `aria-selected`, styled in any table). `stickyHeader` (on `--ld-z-sticky`; inside a `.ld-table-scroll` with `--ld-table-max-height`, or the page with `--ld-table-sticky-top`), `density`, `.ld-num` for right-aligned tabular numbers. Plain HTML: add `--interactive`, give rows `tabindex="0"` and a key handler |
| `SortHeader` | `.ld-table__sort`, `.ld-table__sort-icon` | sortable `th`: `column`, `sort`, `onSortChange`, `numeric`; button in the `th`, `aria-sort` on the sorted one; cycles ascending → descending → off; one column at a time. Sort with `sortRows(rows, sort, value)` (stable, natural text order, empties last) |
| `TableSelectAll`/`TableSelectCell` + `useRowSelection(pageIds)` | `.ld-table__select`, `.ld-table__select-hit`, `.ld-checkbox:indeterminate` | checkbox column: whole-cell target, never activates the row; select-all is unchecked/indeterminate/checked for the page (`pageState`, `togglePage`); `toggle(id, shift)` selects Shift+click ranges; ids survive paging; pair with `TableRow selected`. `TableSkeletonRows` fills the body while loading (`aria-busy` on the table) |
| `BulkActionBar` | `.ld-bulk-bar` (`--top`, `__count`, `__actions`) | `count`, `total` + `onSelectAll` ("Select all 312 matching"), `onClear`, `returnFocusRef`, action `Button size="sm"` children; sticky on `--ld-z-sticky` in the flow (never covers the last row), count announced politely; destructive actions run at once with `toast({ undo: scheduleUndoable(...) })` |
| `Pagination`/`PageSummary`/`PageSizeSelect`/`LoadMore` | `.ld-pagination` (`__list`, `__link`, `__ellipsis`, `__summary`, `__size`), `.ld-pagination-bar`, `.ld-load-more` | numbered pages from `pageRange(current, total, siblings)` (first, last, neighbours, ellipsis; fixed item count), `aria-current="page"`, `href` for URL pages; "Showing 21–40 of 312" (`pageSpan`) announced; native page-size select (`pageAfterResize`); `LoadMore` for cursor feeds (busy, then "That's everything") |
| `Chip`/`FilterChip`/`ChipGroup` | `.ld-chip` (`--removable`, `__remove`), `.ld-chip-group` (`--scroll`, `__chips`, `__count`, `__clear`) | toggle chip (`pressed` → `aria-pressed`, check icon); applied filter with a named remove button (focus moves to the next); group `label`, live `count` ("12 results"), `onClearAll`, `scroll` for one sideways row. OR within a group, AND across groups |
| `BarChart`/`LineChart`/`Sparkline` | `.ld-chart` (+ parts), `.ld-sparkline` | dependency-free SVG in theme colours (`--ld-chart-1..4`): `title` (the takeaway), `yLabel`, `xLabel`, `unit`, `description`; bars always from zero, nice ticks, `highlight`; lines direct-labelled, dashed/marked per series, `null` gaps, `zero={false}` draws an axis break; `role="img"` + `<desc>` + a "Show data" table. Geometry: `niceScale`, `linearScale`, `bandLayout`, `barExtent`, `linePath`, `spreadLabels` |
| `Accordion`/`AccordionItem` | `.ld-accordion` (`__item`, `__summary`, `__panel`) | native `<details>`/`<summary>`: `title`, `open` (initial), `onToggle`; `<Accordion exclusive>` gives the items one `name` (one open at a time, for steps; leave it off for FAQs). Height animates via `interpolate-size` + `::details-content` (snaps where unsupported or under reduced motion); the theme draws the chevron. Plain HTML: the classes on `details`/`summary`/`div` |
| `InlineEdit` | `.ld-inline-edit` (`--multiline`, `__display`, `__text`, `__icon`, `__input`; `data-ld-edit`, `data-ld-saved`) | text that becomes an input in the same box: `value`, `onSave` (reject to roll back; its message shows in the field error line), `label`, `validate`, `multiline`, `placeholder`, `type`. Click/Enter/F2 opens, Enter or blur saves (Ctrl/⌘+Enter in a textarea), Escape restores, focus returns to the text; pencil on hover/focus and always on touch. State machine: `inlineEdit`, `inlineEditKey` |
| `StarRating` | `.ld-rating` (`__options`, `__option`, `__input`, `__glyph`, `__value`, `__clear`), `.ld-rating--display` (`__stars`, `__count`) | with `onChange`: a radio group (`label` legend, one tab stop, arrows, hover preview where hover is real, `clearable`); without: read-only `value` average + `count` → "4.3 (128)", fractional fill (`starFills`, `--ld-fill`), never rounded up to a perfect score (`roundRating`), `role="img"` |
| `PresenceCursors` / `AvatarStack` / `Avatar` | `.ld-presence`, `.ld-cursor` (`__pointer`, `__name`, `data-ld-color`, `data-ld-idle`), `.ld-avatar-stack`, `.ld-avatar` (`--overflow`, `__img`) | presentational only: `users` `{ id, name, x, y, lastSeen, avatar }` (px from the positioned parent), `selfId` never drawn, `idleMs` fade; cursors glide (`followPoint`, jump under reduced motion), colour from `presenceColor(id)` (8 theme slots with contrast), layer on `--ld-z-sticky`, `pointer-events: none`, `aria-hidden`. `AvatarStack` `max` folds the rest into a named "+N" and is the accessible who-is-here |
| `Slider` / `RangeSlider` | `.ld-range` (native `input[type=range]`, fill from `--ld-range-fill` 0..1), `.ld-slider` (`__header`, `__input`, `__pair`, `__track`, `__bubble`, `__ticks`, `__tick`, `__marks`, `__mark`; `--range` with `--ld-range-lo`/`--ld-range-hi`, `[data-ld-top]`) | native range: `label`, `value`, `onChange`, `min`/`max`/`step`, `format` (bubble + `aria-valuetext`), `ticks` (`true` or values), `marks` `{ value, label }`, `input` (number box, snaps on blur: `snapToStep`), `hint`. `RangeSlider`: `[lo, hi]`, `gap`, `thumbLabels`; never crosses (`clampRange`, `rangeTopThumb`). 24px thumb in a 44px-tall target |
| `DateField` | `.ld-date` (`__presets`, `__input`), `.ld-input[type=date\|datetime-local]` | native date/datetime-local: `value` ISO string, `onChange`, `min`/`max` (error in words), `presets` (`DATE_PRESETS.today/tomorrow/nextWeek` or `{ label, resolve(today) }`; `.ld-chip` with `aria-pressed`), `typed` (masked `MM/DD/YYYY`, `order="dmy"`), `today`. Local-date maths: `localISODate`, `addDays`, `nextWeekday`, `typedToISO` |
| `ColorField` | `.ld-color` (`__row`, `__swatch`, `__picker`, `__hex`, `__preview`, `__sample`, `__contrast` + `data-ld-contrast="pass\|large\|fail"`), `.ld-swatches`, `.ld-swatch` (`__input`, `__chip`; `--ld-swatch`) | `value` `#rrggbb`, `onChange`, `swatches` `{ value, name }` (radio group, check on the chosen), native colour input as a swatch button, hex field (`normalizeHex`), preview with WCAG ratio against `--ld-surface` or `against` (`contrastRatio`, `contrastGrade`, `formatContrast`) |
| `FileUpload` | `.ld-upload-field`, `.ld-dropzone` (`__input`, `__icon`, `__title`, `__prompt`, `__hint`; `data-ld-drag="over\|invalid"`), `.ld-upload-list`, `.ld-upload` (`__thumb`, `__name`, `__size`, `__status`, `__progress`, `__actions`; `data-ld-upload="uploading\|done\|error"`) | dropzone is the file input's label; `upload(file, { onProgress, signal })` is the app's (no networking), `accept` + `acceptLabel`, `maxSize`, `multiple`; per-file thumbnail, size, progress, time left, Retry (keeps the file), Remove/Cancel; polite announcements. Checks: `fileProblem`, `matchesAccept`, `dragMayAccept`, `formatBytes`, `timeLeft` |
| `SortableList` / `SortableBoard` | `.ld-sortable` (`__item`, `__body`; `data-ld-dragging`, `data-ld-drop`), `.ld-drag-handle`, `.ld-sortable-root`, `.ld-board` (`__column`, `__title`, `__count`; `data-ld-drop-target`) | `items` + `onReorder` / `columns` `{ id, title, items }` + `onMove` (same item objects move: `moveItem`, `moveCard`), `getKey`, `getLabel`, `renderItem`. Handle drags (pointer, auto-scroll near edges); Space lifts, arrows move (Left/Right change column), Space drops, Escape cancels; "Moved Task A to position 3 of 5 in Done" announced. Plain pages: `createSortable(root, { live, onPreview, onDrop, onCancel })` |
| `SwipeRow` | `.ld-swipe` (`__content`, `__main`, `__actions--leading/--trailing`, `__action`, `__action--danger`; `--ld-swipe-x`, `data-ld-swipe`, `data-ld-swipe-full`) | `leading`/`trailing` `{ label, onAction, variant, icon }` (two a side at most), `fullSwipe` sides, `menuLabel`; the same actions in a `Menu` button and `ContextMenu`; `touch-action: pan-y`, threshold + velocity (`swipeSettle`), rubber band (`swipeOffset`); pair a destructive full swipe with `toast({ undo })`. Plain pages: `createSwipe(row, { full, onFullSwipe })` |
| (CSS only) | `.ld-settings` (`__nav`, `__link`, `__body`, `__section`, `--danger`, `__header`, `__title`, `__description`, `__row`, `__label`, `__hint`, `__control`) | settings layout: sticky section nav beside grouped sections when the container has room, a scrolling row otherwise; preferences autosave with a `SaveStatus` per section, identity fields use `InlineEdit`, secrets an explicit button, the danger zone goes last with a type-the-name `Dialog`. See `docs/guides/settings.md` and `site/layout-settings.html` |

Theme-specific additions (styled only under that theme — check before using):
`summer-cloud` adds `.ld-card--floating` and `.ld-btn--ghost`. (`.ld-chip` and
`.ld-num` are in every theme.)

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
