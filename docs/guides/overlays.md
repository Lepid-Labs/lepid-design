# Layer overlays: tooltips, menus, sheets, the command palette and search

For anyone building screens on top of a theme, in React or plain HTML. After reading it you can pick the right overlay
for a job, and add tooltips, menu buttons, context menus, bottom sheets and drawers, a ⌘K command palette, and a
search field that people can operate with a keyboard, a pointer or a finger. The live demo is `site/overlays.html`.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/styles` and `@lepid-labs/ui-react` from the release that adds `Tooltip`. No token was added: overlays
  use the `--ld-z-*` layers, `--ld-elevation-3` and the motion tokens from [foundation.md](foundation.md).
- Browsers with the Popover API (all current ones). CSS anchor positioning places tooltips and menus where the browser
  has it; elsewhere the components measure and place them, so nothing breaks without it.

## Choosing an overlay

Use the lightest surface that does the job. Each step down this table interrupts the user more.

| Surface | Use it for | Blocks the page | Closes on |
| --- | --- | --- | --- |
| `Tooltip` | A label for an icon, or a short note on a control | No | Leaving, Escape, a press |
| `toast()` | The result of an action, or a low-priority event ([feedback.md](feedback.md)) | No | Its timer, Dismiss, Escape |
| `Menu` / `ContextMenu` | A short list of actions or options for one thing | No (light dismiss) | A choice, Escape, Tab, a click outside |
| `Sheet side="start"\|"end"` (drawer) | Secondary content or settings next to the page: filters, details, navigation | Yes | Escape, the backdrop, a close button |
| `Sheet` (bottom) | A focused task or choice on a phone, reachable by thumb: share, pick, confirm | Yes | Escape, the backdrop, dragging the handle down |
| `Dialog` | A decision the user must make before going on | Yes | Escape, an answer |

- One modal at a time. Do not open a dialog from a sheet; finish or close the first.
- A tooltip never holds anything essential: touch has no hover, so the same information must be visible elsewhere.
- Toasts stay above an open modal (the `Toaster` follows it into the top layer), so a sheet can report what it did.

## Tooltip

```tsx
<Tooltip content="Builds main and ships it to production">
  <Button onClick={deploy}>Deploy</Button>
</Tooltip>

<IconButton label="Copy link" tooltip onClick={copy}><CopyIcon /></IconButton>

<Button variant="primary" disabledReason={title ? undefined : "Add a title first."} reasonAs="tooltip">Publish</Button>
```

- It shows after the pointer or keyboard focus rests 400 ms on the trigger, and at once when another tooltip closed
  less than 300 ms ago, so moving along a toolbar does not make the user wait each time.
- It stays while the pointer is over the tooltip itself, and Escape hides it without moving focus or closing the dialog
  around it (WCAG 1.4.13). A press on the trigger hides it.
- `kind="description"` (default) adds it to the trigger's `aria-describedby`. `kind="label"` makes it the trigger's
  name (`aria-labelledby`); `IconButton tooltip` uses that and drops the native `title`, so the label is not shown or
  read twice.
- `reasonAs="tooltip"` moves `disabledReason` into a tooltip for dense toolbars. A tap on the blocked button shows it,
  so touch users still learn why. Prefer the visible text when there is room ([forms.md](forms.md)).
- `side="bottom"` puts it below; it flips at the viewport edge either way. `useTooltip(options)` returns
  `{ triggerProps, tooltip, show, hide }` for a trigger you render yourself.

Plain HTML is a `<span class="ld-tooltip" role="tooltip" popover="hint">` (fall back to `manual` where `hint` is not
supported) after its trigger, tied with `aria-describedby`, `anchor-name` on the trigger and `position-anchor` on the
tooltip. `site/overlays-demo.js` wires one in 30 lines.

## Menu

A menu button (APG pattern): the trigger opens a `role="menu"` popover anchored below it.

```tsx
<Menu trigger={<IconButton label="More"><DotsIcon /></IconButton>}>
  <MenuGroup label="View">
    <MenuCheckboxItem checked={grid} onCheckedChange={setGrid} shortcut="G">Show grid</MenuCheckboxItem>
  </MenuGroup>
  <MenuSeparator />
  <MenuGroup label="Sort by">
    <MenuRadioItem checked={sort === "name"} onSelect={() => setSort("name")}>Name</MenuRadioItem>
    <MenuRadioItem checked={sort === "date"} onSelect={() => setSort("date")}>Date modified</MenuRadioItem>
  </MenuGroup>
  <MenuSeparator />
  <MenuItem icon={<CopyIcon />} shortcut="⌘D" onSelect={duplicate}>Duplicate</MenuItem>
  <MenuItem disabled>Share (no access)</MenuItem>
  <MenuItem variant="danger" onSelect={remove}>Delete</MenuItem>
</Menu>
```

| Key | On the trigger | In the menu |
| --- | --- | --- |
| Enter, Space, click | Open on the first item | Run the item, close, focus back on the trigger |
| ArrowDown / ArrowUp | Open on the first / last item | Next / previous item, wrapping |
| Home / End | | First / last item |
| A letter | | Next item starting with it; typing quickly matches a prefix |
| Space on a checkbox or radio item | | Flip it and keep the menu open |
| Escape | | Close, focus back on the trigger |
| Tab | | Close; focus moves on from the trigger |

- The trigger gets `popovertarget`, `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`; its own props and
  handlers are kept. A click outside closes the menu (light dismiss) without moving focus.
- Disabled items stay focusable and are announced, but do nothing, so people can find out what exists.
- Put destructive items last, after a separator, with `variant="danger"`. Shortcut hints are only hints: wire the keys
  yourself, and keep every item's action reachable some other way.
- It opens below the trigger and flips above, or to the left, at the viewport edge (`side="top"` to prefer above).

Plain HTML: a `<button popovertarget>` and a `<div class="ld-menu" role="menu" popover="auto">` of
`.ld-menu__item` rows (`role="menuitem"`, `menuitemcheckbox` or `menuitemradio`, `tabindex="-1"`, `aria-checked`,
`aria-disabled`), each holding an optional `.ld-menu__icon`, a `.ld-menu__label` and an optional
`<kbd class="ld-kbd ld-menu__shortcut">`. Groups are `role="group"` with a `.ld-menu__group-label`; separators are
`.ld-menu__separator`. `menuMove`, `menuTypeahead` and `typeaheadBuffer` are the keyboard logic.

## Context menu

```tsx
<ContextMenu className="file-list" menu={<><MenuItem onSelect={rename}>Rename</MenuItem>…</>}>
  {files.map((f) => <FileRow key={f.id} file={f} tabIndex={0} />)}
</ContextMenu>
```

It opens the same menu at the pointer on right-click, after a 500 ms touch-and-hold (a move of more than 10 px cancels
it), and under the focused element on Shift+F10 or the ContextMenu key. It flips and stays inside the viewport, and
Escape returns focus to where it was. A context menu is invisible until someone thinks to look for it, so every action
in it must also be in a visible menu or toolbar. The region gets `.ld-context-target`, which stops the platform's own
long-press callout.

## Sheets and drawers

```tsx
<Sheet open={sharing} onClose={() => setSharing(false)} title="Share pipeline"
  actions={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={copy}>Copy link</Button></>}>
  Anyone with the link can view runs and logs.
</Sheet>

<Sheet side="end" open={details} onClose={closeDetails} title="Run details">…</Sheet>
```

- `Sheet` is a modal `<dialog>` like `Dialog`: focus moves in, the page behind is inert, Escape closes it, and focus
  returns on close. A click on the backdrop closes it too.
- `side="bottom"` (default) is `.ld-dialog--sheet`: it rises from the bottom edge, up to 40rem wide, with a grab
  handle. Dragging the handle down past 30% of its height, or flinging it, dismisses it; anything less springs back
  (`shouldDismissSheet`). The handle is pointer-only, so always include a visible Cancel or Close action.
- `side="end"` / `"start"` is `.ld-dialog--drawer` (`--drawer-start`), full height, up to 24rem wide, on the inline end
  or start edge (it follows `dir="rtl"`).
- They slide in with `@starting-style` on the theme's motion tokens and leave faster than they arrive; under reduced
  motion they fade. Padding clears notches and the home indicator (`env(safe-area-inset-*)`).

Plain HTML: `<dialog class="ld-dialog ld-dialog--sheet">` with `<div class="ld-dialog__handle" aria-hidden="true">` as
its first child, opened with `showModal()`.

## Command palette

```tsx
const [open, setOpen] = useState(false);
const [recent, setRecent] = useState<string[]>([]);

<CommandPalette open={open} onOpenChange={setOpen} recent={recent}
  onSelect={(c) => setRecent((r) => pushRecent(r, c.id))}
  commands={[
    { id: "new", label: "New project", group: "Create", shortcut: "⌘N", onSelect: newProject },
    { id: "theme", label: "Toggle dark mode", group: "Preferences", keywords: ["theme"], onSelect: toggleTheme },
  ]} />
```

- ⌘K / Ctrl+K opens and closes it from anywhere (`hotkey={false}` to wire your own). It is a modal `Dialog` holding a
  combobox and its listbox (APG combobox): focus stays in the input and `aria-activedescendant` marks the active option.
  ArrowUp/Down move, Enter runs, Escape closes, and the pointer can pick too.
- With no query it lists `recent` first, then every command under its `group`. Typing filters fuzzily: a substring
  ranks first (a prefix or word start highest), then letters in order ("gtst" finds "Go to settings"). Matched letters
  are marked with `.ld-match`; `keywords` match without being shown.
- `loading` shows skeleton rows while there are no results yet, and a spinner in the input while results refresh. No
  commands at all shows `empty`; a query that matches nothing shows an `EmptyState` naming the query. The result count
  is announced politely.
- For results from a server, take `onQueryChange`, debounce it (below), set `loading`, and pass what comes back as
  `commands`.

`filterCommands`, `fuzzyMatch`, `highlight` and `pushRecent` are the logic; `site/search-demo.js` renders the palette
markup (`.ld-command`, `__search`, `__input`, `__list`, `__group-label`, `__option`, `__label`, `__shortcut`) with them.

## Search

A search experience has five parts. Design all five, not just the box.

| Part | What it needs | Here |
| --- | --- | --- |
| Input | Visible, labelled, `type="search"`, a clear button, a shortcut to reach it, a loading state | `SearchInput` |
| Suggestions and recent | Recent queries or likely targets before the user types much | `recent` in `CommandPalette`; your own list under a `SearchInput` |
| Results | Ranked, with the matched words marked, and the count announced | `fuzzyMatch` + `highlight`, `.ld-match`, a polite status |
| No results | Say what was searched and offer a way out: clear, widen, fix the spelling | `EmptyState variant="no-results"` |
| Filters | Narrow by type, date or owner without retyping, with the result count live | `Chip`, `FilterChip`, `ChipGroup count` ([data.md](data.md)) |

```tsx
const queries = useMemo(() => debounceQuery(runSearch), []);
useEffect(() => () => queries.cancel(), [queries]);

<SearchInput aria-label="Search runbooks" placeholder="Search runbooks" shortcut="/" loading={searching}
  onChange={(e) => queries.input(e.target.value)} onKeyDown={(e) => e.key === "Enter" && queries.flush()} />
```

- `SearchInput` is `.ld-search`: the glyph (a `Spinner` while `loading`), the input, a key hint while it is empty and
  unfocused, and a clear button once it has text, which empties the field through its normal `onChange`. Keep a
  placeholder: the hint and the clear button follow `:placeholder-shown`.
- `shortcut="/"` focuses the field from anywhere outside a text field and sets `aria-keyshortcuts`. `hint` changes what
  the hint shows.
- `debounceQuery(onQuery, 250)` sends the trimmed query 250 ms after typing stops, at once when the field is cleared,
  and never the same query twice in a row. `flush()` sends now (Enter); `cancel()` drops what is pending.

**SearchInput or CommandPalette?** A `SearchInput` searches one collection in place, on the page that shows the
results: runbooks, runs, people. The `CommandPalette` is the app-wide jump-and-do box: commands, navigation, recent
items, and from there a hand-off into a page's search. Give an app one palette on ⌘K and as many search fields as it
has collections, each on `/` when it is the page's main job. A search field can also open the palette: show
`hint="⌘K"` and open it on focus.

## Run the demo locally

The demo imports the pure helpers from `site/ui/`, which the Pages workflow builds. Locally, after `pnpm build`:

```sh
ln -s ../styles site/styles
ln -s ../components/react/dist site/ui
python3 -m http.server --directory site
```
