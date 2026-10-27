# Let people drag: sliders, file upload, drag and drop and swipe actions

For anyone building screens on top of a theme, in React or plain HTML. After reading it you can add sliders people can
set exactly, a file upload that shows every state, lists and boards reordered by pointer or keyboard, and list rows
with swipe actions that are never the only way in. Dates and colours have their own guide, [pickers.md](pickers.md).
The live demo is `site/manipulation.html`.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/styles` and `@lepid-labs/ui-react` from the release that adds `Slider`. No token was added: the lift
  uses the elevation tokens from [foundation.md](foundation.md); swipe undo uses `toast()` and `scheduleUndoable()` from
  [feedback.md](feedback.md); the swipe menu is `Menu` and `ContextMenu` from [overlays.md](overlays.md).
- No dependency: everything runs on native inputs, pointer events and the HTML file input.

## Range sliders

```tsx
<Slider label="Volume" value={volume} onChange={setVolume} input format={(v) => `${v}%`}
  ticks={[0, 25, 50, 75, 100]} marks={[{ value: 0, label: "0%" }, { value: 100, label: "100%" }]} />
<RangeSlider label="Price" value={price} onChange={setPrice} min={0} max={1000} step={10} gap={50}
  thumbLabels={["Minimum price", "Maximum price"]} input format={(v) => `$${v}`} />
```

- **It is the native input.** Arrows step, Page Up/Down jump, Home and End go to the ends, and the browser snaps to
  `step`. The whole row takes a press, not just the 6px track; the thumb is a 24px disc in a 44px-tall target.
- **Fill and value.** The track fills to the thumb and the value rides above it in a bubble that lights while it is
  dragged or focused. `format` sets the bubble and the screen-reader text (`aria-valuetext`).
- **Exact entry.** A finger can't tell 47 from 48, so `input` adds a number box. It commits as you type a valid number
  and snaps whatever is left to a step on blur or Enter (`snapToStep`).
- **Two thumbs.** `RangeSlider` lays two range inputs over one track, each with its own name and keys. They never
  cross and stay `gap` apart (`clampRange`); the band between them fills. Where they overlap, the one that can still
  move sits on top (`rangeTopThumb`).
- **Snap when round values matter.** Use a `step` and ticks for prices and percentages; keep a slider continuous only
  where any value is as good as another (volume, opacity).

Plain HTML needs one line to paint the fill: the fraction 0..1 in `--ld-range-fill`.

```html
<input type="range" class="ld-range" min="0" max="10" value="3" style="--ld-range-fill: 0.3"
  oninput="this.style.setProperty('--ld-range-fill', (this.value - this.min) / (this.max - this.min))">
```

The `.ld-slider` wrapper (`__header`, `__input`, `__track`, `__bubble`, `__ticks`, `__tick`, `__marks`, `__mark`;
`--range` with `--ld-range-lo`/`--ld-range-hi`) is in `site/manipulation.html`; ticks and labels take their position
from `--ld-at` (0..1).

## File upload

```tsx
<FileUpload label="Attach files" hint="Images or PDFs, up to 10 MB" accept="image/*,.pdf" acceptLabel="images or PDFs"
  maxSize={10_000_000} upload={(file, { onProgress, signal }) => api.upload(file, { onProgress, signal })} />
```

The library never networks: `upload` is yours. Report progress with `onProgress(loaded, total)`, resolve when the
file is stored, and reject with an `Error` whose message says what went wrong. `signal` aborts when the file is removed.

- **A real input.** The dropzone is the file input's label, so a click, Enter or Space opens the picker and screen
  readers find a file input. Keyboard focus rings the whole zone.
- **Respond before the drop.** A file dragged over changes the edge, the glow and the words at once. A type that can't
  match turns the zone red (`dragMayAccept`; names aren't known until the drop, so only known types are refused).
- **Check again on drop.** The picker filters by `accept`, a drop doesn't. `fileProblem` checks type, size and empty
  files and says why in words: "setup.exe isn't a file type this accepts. Use images or PDFs."
- **Honest progress.** Each file shows a thumbnail (images) or its type, its size, its own progress bar, the percent and
  the time left once the rate means something (`timeLeft`), never a spinner.
- **Recover in place.** A failed file keeps its place and its data: Retry sends it again without picking it again.
  One failure never stops the others. Remove cancels an upload in flight.
- **Announced.** Added, uploaded, failed and removed files are announced politely.

## Drag and drop

```tsx
<SortableList label="Priorities" items={items} onReorder={setItems}
  getKey={(t) => t.id} getLabel={(t) => t.title} renderItem={(t) => t.title} />
<SortableBoard columns={columns} onMove={setColumns}
  getKey={(t) => t.id} getLabel={(t) => t.title} renderItem={(t) => <TaskCard task={t} />} />
```

The state moves with the card. `onReorder` and `onMove` hand back the same item objects in their new places
(`moveItem`, `moveCard`), so whatever a card carries (its checkbox, its comments) goes with it. Untouched columns keep
their identity.

- **Drag by the handle.** `.ld-drag-handle` takes the drag (`touch-action: none`); the rest of the row still scrolls the
  page on touch. A lifted item grows a little, tilts a degree under a pointer and rises on the floating elevation.
- **Show where it lands.** A line marks the slot between items; on a board the target column lights up too. Release
  snaps it into that slot. Near the top or bottom of the window, or of a scrolling column, the page scrolls itself.
- **Keyboard.** Focus a handle and press Space or Enter to pick the item up. Up and Down move it, Left and Right
  carry it to the next column, Home and End go to the ends. Space or Enter drops it; Escape puts it back. Every step is
  announced: "Moved Task A to position 3 of 5 in Done."
- **Reduced motion** removes the grow and tilt and every animation; the slot line stays.
- **Undo a wrong drop** from the app: raise `toast({ message: "Moved to Done", undo })` after `onMove` when the move is
  costly to notice.

Plain pages use the same controller as the React components, `createSortable(root, { live, onPreview, onDrop,
onCancel })`, on markup with `[data-ld-sort-list]` lists and `[data-ld-sort-key]` items (see
`site/sortable-demo.js`). It never moves a node; it reports the move and you re-render.

The lifted card is the item itself, so a column that scrolls (`overflow: auto`) clips it while it is outside. Leave
columns unclipped, or let the page scroll instead.

## Swipe actions

```tsx
<SwipeRow menuLabel={`Actions for ${m.from}'s message`} fullSwipe={["trailing"]}
  leading={[{ label: m.read ? "Unread" : "Read", onAction: () => toggleRead(m) }]}
  trailing={[
    { label: "Archive", onAction: () => archive(m) },
    { label: "Delete", variant: "danger", onAction: () => remove(m) },
  ]}>
  <strong>{m.from}</strong> {m.subject}
</SwipeRow>
```

- **Never the only path.** Every action is also in the row's ⋯ menu (`Menu`), its context menu (right-click, long
  press, Shift+F10) and so the keyboard. The revealed buttons are a pointer shortcut and hidden from screen readers.
- **Scrolling still works.** The row has `touch-action: pan-y`: a mostly vertical drag scrolls the page; only a
  horizontal one swipes (`swipeAxis`).
- **Threshold and velocity.** Let go past half the actions' width, or flick, and the row stays open; otherwise it
  springs shut. Past the actions it resists like a rubber band (`swipeOffset`). Tap the row, press Escape or open
  another row to close it.
- **Full swipe needs distance.** With `fullSwipe`, pulling past 60% of the row stretches the outermost action across
  it; letting go runs it. A fast brush only opens the row, never deletes (`swipeSettle`).
- **Undo, not confirm.** A destructive full swipe removes the row at once; pair it with an undo toast:

```ts
const remove = (m) => {
  hide(m);
  const undo = scheduleUndoable({ commit: () => api.delete(m.id), undo: () => show(m) });
  toast({ message: "Message deleted", undo });
};
```

- **Colour by consequence.** Neutral actions take surface tones; destructive ones are red, everywhere in the app.
- **Two actions a side at most**, and keep each side's meaning the same across the app (right reveals "read", left
  reveals "archive" and "delete").

Plain pages call `createSwipe(row, { full: ["trailing"], onFullSwipe })` on `.ld-swipe` markup (see
`site/sortable-demo.js`).
