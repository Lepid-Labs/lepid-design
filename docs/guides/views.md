# Build a page from data and actions: list, detail and form views

For anyone building a React app on `@lepid-labs/ui-react` who wants a working page without hand-assembling the table,
the confirm dialog, the busy buttons and the error states. After reading it you can list rows with links, row actions
and bulk actions in one component, show one item with its header actions, and take a form as a page or a dialog,
giving each view only your data and what your actions do.

The views are built from the app kit in [app.md](app.md) (`DataState`, `useConfirm`, `useSubmit`, `Link`) and the
table pieces in [data.md](data.md). They never fetch: `query` is anything with `{ data, error, isPending }`, such as a
react-query result, and each action's `run` is your call to your API.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/ui-react` from the release that adds `ListView`. No CSS was added.
- A `Toaster` mounted once in the app: a failed action reports there.
- For `rowHref`: app routes handled by `useRoute` ([app.md](app.md#route-with-real-links)).

## Actions: what every view runs

A view action is a button the view runs on its target: one row, the selected rows, or the item shown.

```ts
const remove: ViewAction<Book> = {
  label: "Delete",
  danger: true,
  confirm: (b) => ({ title: `Delete ${b.title}?`, message: "This can't be undone." }),
  run: (b) => api.del(`/api/books/${b.id}`).then(() => books.refetch()),
};
```

- `confirm` asks first. It is the question as a string, full `ConfirmOptions`, or either built from the target. The
  confirm button takes the action's `label` and `danger` unless the options set `confirmLabel` or `danger`. Leave it
  out for anything reversible ([feedback.md](feedback.md#undo-instead-of-confirm)).
- While `run` runs, its button spins and ignores more presses. Each row's button spins on its own.
- If `run` throws or rejects, a danger toast titled "Delete failed" shows the error's message. Refetch, navigate or
  toast success inside `run`.

`useViewActions()` is the same handling for a page of your own: `act.button(action, target, key)` renders the button,
and you render `act.dialog` once.

## List rows: ListView

```tsx
const books = useQuery({ queryKey: ["books"], queryFn: listBooks });

<ListView
  title="Books"
  actions={<Button variant="primary" onClick={() => setAdding(true)}>New book</Button>}
  query={books}
  columns={[
    { header: "Title", cell: (b) => b.title },
    { header: "Pages", cell: (b) => b.pages, numeric: true },
    { header: "Added", cell: (b) => formatRelative(b.createdAt) },
  ]}
  rowHref={(b) => `/books/${b.id}`}
  rowActions={[remove]}
  bulkActions={[{ label: "Archive", run: (rows) => archive(rows.map((b) => b.id)) }]}
  empty="No books yet"
/>
```

- The page header holds `title`, `subtitle` and `actions`. Loading, an error and an empty list are handled as
  `DataState` handles them. `empty` as a string becomes an `EmptyState` title; pass a node for your own.
- Rows are keyed by `rowKey`, which defaults to `String(row.id)`. `rowLabel` names a row in "Select …" and in each
  action button's accessible name ("Delete Dune"). It defaults to the first column's text, then the key.
- `rowHref` makes the first cell a real link that can be opened in a new tab or copied, and a plain click anywhere on
  the row follows it. The link is the row's only tab stop. A modified click on the row outside the link does nothing.
- `rowActions` are small buttons in a last column whose header is read as "Actions". Keep it to two or three. For more,
  render a `Menu` in a column of your own.
- `bulkActions` adds the checkbox column (Shift+click selects a range) and a `BulkActionBar`. An action's `run` gets
  the selected rows, and the selection clears when it succeeds. Rows that leave the data drop out of the count.

Sorting, filtering and pagination are not built in. Sort or filter the array before passing it, or build the table from
the pieces in [data.md](data.md).

## Show one item: DetailView

```tsx
const user = useQuery({ queryKey: ["users", id], queryFn: () => fetchUser(id) });

<DetailView
  query={user}
  eyebrow={<Link to="/users">Users</Link>}
  title={(u) => u.displayName ?? u.email}
  subtitle={(u) => `Created ${formatDate(u.createdAt)}`}
  actions={[{ label: "Delete user", danger: true, confirm: (u) => `Delete ${u.email}?`,
    run: (u) => api.del(`/api/users/${u.id}`).then(() => navigate("/users")) }]}
>
  {(u) => <EmailsCard emails={u.emails} />}
</DetailView>
```

`title`, `subtitle` and `children` are functions of the loaded item. The header and actions appear only once the item
has loaded. An error with no item shows the alert alone.

## Take input: FormView

The fields are plain inputs with a `name` and a `defaultValue`. On submit, `onSubmit` gets them as `FormData`, so the
form needs no state of its own.

```tsx
<FormView title="New book" submitLabel="Add book" onCancel={() => navigate("/books")}
  onSubmit={async (data) => {
    const book = await api.post("/api/books", Object.fromEntries(data));
    navigate(`/books/${book.id}`);
  }}>
  <Field label="Title"><Input name="title" required /></Field>
  <Field label="Pages"><Input name="pages" type="number" /></Field>
</FormView>
```

- The submit button spins while `onSubmit` runs, and a second submit is ignored. Whatever `onSubmit` throws shows as
  an alert above the buttons. Throw your own `Error` for a check the browser cannot make.
- Native validation (`required`, `type="email"`, `min`) runs before `onSubmit`.
- `resetOnSuccess` clears the fields after a success, for adding one item after another.
- A checkbox appears in `FormData` as `"on"` when checked and is missing otherwise. A controlled field such as
  `TagInput` is not in `FormData`, so read its state in `onSubmit`.

Pass `open` to show the same form in a modal dialog. `onCancel` is then required: it runs for Cancel, Escape, or the
dialog closing any other way. Close the dialog yourself in `onSubmit` once the save succeeds.

```tsx
<FormView open={editing !== null} title={`Edit ${editing?.title}`} onCancel={() => setEditing(null)}
  onSubmit={async (data) => {
    await api.put(`/api/books/${editing.id}`, Object.fromEntries(data));
    setEditing(null);
  }}>
  <Field label="Title"><Input name="title" defaultValue={editing?.title} required /></Field>
</FormView>
```

- Cancel comes before the submit button, as in every dialog. On a page the submit button comes first.
- Escape is ignored while saving, so the outcome of a save is never hidden behind a closed dialog.
- Each time it opens, the fields start from their `defaultValue` again and the last error is gone.
