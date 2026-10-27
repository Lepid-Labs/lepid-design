# Show data: sortable tables, bulk actions, pagination and filters

For anyone building screens of records on top of a theme, in React or plain HTML. After reading it you can build a
table that sorts and selects rows, act on a selection with a bulk action bar (undo included), page through results by
number or by cursor, and narrow them with filter chips that report what is left. Charts have their own guide,
[charts.md](charts.md). The live demo is `site/data.html`.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/styles` and `@lepid-labs/ui-react` from the release that adds `SortHeader`. No token was added: the
  sticky header and the bulk bar use the `--ld-z-sticky` layer from [foundation.md](foundation.md), and undo uses
  `toast()` from [feedback.md](feedback.md).

## Data table

`Table` and `TableRow` gain sortable headers, a selection column, a sticky header, density and a loading state. Keep
the data and the selection in state; the helpers are pure.

```tsx
const [sort, setSort] = useState<SortState | null>(null);
const rows = useMemo(() => sortRows(runs, sort, (r, key) => r[key as keyof Run]), [runs, sort]);
const pageRows = rows.slice((page - 1) * size, page * size);
const selection = useRowSelection(pageRows.map((r) => r.id));
const selectAll = useRef<HTMLInputElement>(null);

<div className="ld-table-scroll" tabIndex={0} aria-label="Pipeline runs">
  <Table interactive stickyHeader density="compact" aria-busy={loading}>
    <thead>
      <tr>
        <TableSelectAll state={selection.pageState} onToggle={selection.togglePage} inputRef={selectAll} />
        <SortHeader column="name" sort={sort} onSortChange={setSort}>Run</SortHeader>
        <SortHeader column="secs" sort={sort} onSortChange={setSort} numeric>Duration</SortHeader>
        <th scope="col" aria-label="Actions" />
      </tr>
    </thead>
    <tbody>
      {loading ? <TableSkeletonRows columns={4} selectColumn /> : pageRows.map((r) => (
        <TableRow key={r.id} selected={selection.has(r.id)} onActivate={() => open(r)}>
          <TableSelectCell checked={selection.has(r.id)} label={`Select ${r.name}`}
            onToggle={(shift) => selection.toggle(r.id, shift)} />
          <td>{r.name}</td>
          <td className="ld-num">{formatDuration(r.secs)}</td>
          <td><Menu trigger={<IconButton label={`Actions for ${r.name}`}><DotsIcon /></IconButton>}>…</Menu></td>
        </TableRow>
      ))}
    </tbody>
  </Table>
</div>
```

**Sorting.** `SortHeader` puts a button in the `th` (APG sortable table). Each press cycles ascending, descending, then
off, so the data's own order is always one press away; another column starts at ascending, and only one column sorts at
a time. The sorted column carries `aria-sort`, which screen readers announce, and shows one arrow; unsorted columns show
both arrows dimmed, so they read as sortable without a hover. `sortRows` is stable in both directions (equal values keep
their order), sorts text naturally ("run 9" before "run 10") and puts empty values last either way.

**Selection.** `TableSelectCell` is a checkbox whose label fills the cell, so the target is the whole cell, and it is
one of `ROW_NESTED_CONTROLS`, so a press there never activates an interactive row. Shift+click (or Shift+Space) selects
every row between the last press and this one, taking the new state of the row pressed. `TableSelectAll` is unchecked,
indeterminate or checked for the rows on screen; pressing it when some are selected selects them all. Give each row
`selected` so it is tinted and exposes `aria-selected`; the checkbox's checked state is what screen readers rely on.
`useRowSelection` keeps the ids in a set that survives paging; `pageSelection`, `togglePage` and `toggleRow` are the
logic for other frameworks. To make a press anywhere on a row select it, pass `onActivate={(e) => selection.toggle(id,
e.shiftKey)}` instead of opening the row.

**Layout.**

- `stickyHeader` (`.ld-table--sticky`) keeps the header row in view on `--ld-z-sticky`. It sticks to the nearest
  scroll container: the page (set `--ld-table-sticky-top` to clear a sticky app header), or a `.ld-table-scroll`
  wrapper with `--ld-table-max-height`. The wrapper also scrolls a wide table sideways instead of widening the page;
  give it `tabIndex={0}` and a name so keyboard users can scroll it.
- `density="compact"` tightens rows for scanning many; `"comfortable"` opens them and stripes them for reading. Both
  set `--ld-table-pad-y`.
- `.ld-num` (or `SortHeader numeric`) right-aligns a column on tabular figures so digits line up. Use it for every
  quantity, and keep units in the header ("Duration (s)") or in a consistent format.
- While the first page loads, `TableSkeletonRows` fills the body in the table's shape and `aria-busy` goes on the table
  (gate it with `useLoadingIndicator` so a fast load shows nothing).
- Row actions go in a `Menu` in the last column, or in the bulk bar when they apply to many rows.

Plain HTML is the same markup: `th > button.ld-table__sort` with the `.ld-table__sort-icon` SVG (two paths,
`.ld-table__sort-asc` and `.ld-table__sort-desc`), `aria-sort` on the `th`, and `td.ld-table__select >
label.ld-table__select-hit > input.ld-checkbox`; set `indeterminate` on the header checkbox from script.
`site/data-demo.js` wires all of it.

## Bulk actions

Bulk actions are a system, not a button. The selection is the subject, the bar says what it is, and every action
reports what it did.

```tsx
<BulkActionBar count={selection.count} total={matching.length} returnFocusRef={selectAll}
  onSelectAll={() => selection.set(matching.map((r) => r.id))} onClear={selection.clear}>
  <Button size="sm" onClick={rerun}>Re-run</Button>
  <Button size="sm" variant="danger" onClick={removeSelected}>Delete</Button>
</BulkActionBar>
```

```tsx
function removeSelected() {
  const ids = [...selection.selected];
  hide(ids); // the rows go at once
  selection.clear();
  toast({
    message: `Deleted ${ids.length} runs.`,
    undo: scheduleUndoable({ commit: () => api.delete(ids), undo: () => show(ids) }),
  });
}
```

- **Where:** after the table for `position="bottom"` (default), before it for `"top"`. It is `position: sticky` on
  `--ld-z-sticky`, so it rides the viewport edge but keeps its own space in the flow and never covers the last row,
  and the page gets scroll padding while it shows so a focused row is never hidden under it.
- **What it says:** "3 selected", announced politely from a live region that is always mounted. Once a whole page is
  selected and more rows match, it offers "Select all 312 matching" with the exact count; then it reads "All 312
  selected". "Clear" empties the selection.
- **Focus:** when the bar hides with focus inside it (Clear, or an action that empties the selection), focus moves to
  `returnFocusRef`, usually the select-all checkbox. When "Select all" disappears, focus moves to Clear.
- **Acting:** a destructive bulk action runs at once and offers undo through the toast, with its countdown, instead of a
  confirmation dialog. Name the count in the toast. Use a dialog only for what cannot be undone (see
  [feedback.md](feedback.md)).
- **Selection follows the filters:** when a filter hides selected rows, drop them from the selection, so an action
  never touches rows the user cannot see. For data on a server, "select all matching" can be a flag plus the filter
  instead of a list of ids.

Plain HTML: `.ld-bulk-bar` (`--top`) with `hidden` while empty, holding `.ld-bulk-bar__count`,
`.ld-bulk-bar__actions` and the two `.ld-btn--sm` buttons, plus a visually hidden `role="status"` element outside it.

## Pagination

```tsx
<div className="ld-pagination-bar">
  <PageSummary page={page} pageSize={size} total={matching.length} />
  <Pagination page={page} pageCount={pageSpan(page, size, matching.length).pages}
    href={(p) => `?page=${p}`} onPageChange={(p, e) => { e.preventDefault(); navigate(p); }} />
  <PageSizeSelect value={size} onValueChange={(s) => { setPage(pageAfterResize(page, size, s)); setSize(s); }} />
</div>
```

- `Pagination` is a `nav` named "Pagination" with Previous, Next and the page numbers from `pageRange(current, total,
  siblings)`: the first and last page, the neighbours of the current one, and an ellipsis for each gap (never for a
  single page). The count of items stays fixed while paging, so the controls never move under the pointer. The
  current page has `aria-current="page"`; Previous and Next at the ends are `aria-disabled`, so focus stays on them.
  Below 30rem they keep only their chevrons.
- Put the page in the URL (`href`): reloads, Back and shared links then land on the same page.
- `PageSummary` reads "Showing 21–40 of 312" and is announced politely when the page changes. `pageSpan` clamps a page
  past the end (after a delete, say) to the last one.
- `PageSizeSelect` is a labelled native `<select>`; a native picker suits a form value better than a menu.
  `pageAfterResize` keeps the first row on screen in view when the size changes.

**Offset or cursor?** Numbered pages are offsets: page 3 is "skip 40, take 20". Add one row at the top and every row
moves down one place, so the reader who goes to page 4 sees the last row of page 3 again; delete one and a row is
skipped. Add one row and your pagination breaks. A cursor ("20 after run #1077") is anchored to a row, so inserts and
deletes elsewhere cannot shift what comes next.

| Use | When |
| --- | --- |
| Numbered pages (`Pagination`) | Stable data people search and jump around in: an archive, an admin list. Sort by a unique key so ties never reorder between pages. |
| Load more (`LoadMore`, cursor) | Data that changes while it is read: feeds, logs, activity, notifications |
| Infinite scroll | Rarely: it hides the footer, loses the position, and has no end. Prefer Load more. |

```tsx
<LoadMore shown={events.length} hasMore={!!next} loading={loading} onLoadMore={() => fetchAfter(next)} />
```

`LoadMore` shows "Showing 40 of 312" (or "Showing 40" when the total is unknown) and a `Button` that is `busy` while
loading and keeps its place and focus once the feed ends, with "That's everything" as its reason. Restore the scroll
position when people come back from a detail view.

## Filter chips

```tsx
<ChipGroup label="Status" scroll>
  {statuses.map((s) => (
    <Chip key={s} pressed={filters.status.has(s)} onPressedChange={(on) => toggle("status", s, on)}>{s}</Chip>
  ))}
</ChipGroup>

<ChipGroup label="Applied filters" count={matching.length} onClearAll={clearFilters}>
  {applied.map((f) => (
    <FilterChip key={f.key} removeLabel={`Remove ${f.label}`} onRemove={() => remove(f)}>{f.label}</FilterChip>
  ))}
</ChipGroup>
```

- `Chip` is a toggle button (`aria-pressed`). Pressed, it fills and leads with a check, so it is never told apart by
  colour alone; disabled, it dims.
- `FilterChip` is an applied filter with a remove button named after it ("Remove Status: failed"). When a remove button
  takes focus with it, `ChipGroup` moves focus to the next remove button, else to Clear all.
- `ChipGroup count` is the live result count ("12 results"), announced politely in the same frame as the press. Pass
  it from the first render so its live region exists before it changes. An unchanged count reads as a broken filter,
  so update it at once even if the results load later.
- Chips in one group combine with OR (failed or running); groups combine with AND (failed, and in billing). Say so in
  the group labels if it is not obvious.
- Groups wrap by default. `scroll` keeps one row that scrolls sideways with a fade at the end, so a long list of
  options does not push the results down on a phone. Keep the applied filters visible above the results, so people
  can see why the list shrank.

Plain HTML: `button.ld-chip[aria-pressed]`, `span.ld-chip.ld-chip--removable` holding `.ld-chip__label` and
`button.ld-chip__remove`, inside `.ld-chip-group` (`--scroll`) > `.ld-chip-group__chips`, with
`.ld-chip-group__count` (`role="status"`) and `.ld-chip-group__clear`. `.ld-chip--selected` still works as an alias for
the pressed state.

## Run the demo locally

The demo imports the pure helpers from `site/ui/`, which the Pages workflow builds. Locally, after `pnpm build`:

```sh
ln -s ../styles site/styles
ln -s ../components/react/dist site/ui
python3 -m http.server --directory site
```

Serve it over HTTP: browsers do not load ES modules from `file://`.
