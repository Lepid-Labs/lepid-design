# Wire up an app: confirmations, data states, errors, forms, routing and streams

For anyone building a React app on `@lepid-labs/ui-react`. After reading it you can ask before an irreversible action
with a promise instead of `window.confirm`, render a query's loading, error and empty states in one line, keep one
broken view from blanking the app, submit a form without a try/finally block, take a list of tags in one field, route
with real links, follow a log stream, and format dates, times, durations and errors.

None of this fetches for you. The library never knows about an app's API: `DataState` reads the shape of a
react-query result without importing react-query, and `useLineStream` takes a URL plus whatever `fetch` options the
app's auth needs.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/ui-react` from the release that adds `ConfirmDialog`. No CSS was added: every piece is built from
  `Dialog`, `Alert`, `Spinner`, `Button`, `ChipGroup` and `FilterChip`.

## Confirm before an irreversible action

Most actions should not ask: do them and offer undo ([feedback.md](feedback.md#undo-instead-of-confirm)). For the ones
that cannot be taken back, `useConfirm` is `window.confirm` as a promise, on the theme's dialog.

```tsx
const [confirm, dialog] = useConfirm();

async function purge(job: Job) {
  const ok = await confirm({
    title: `Delete ${job.name}?`,
    message: `Its ${job.runs} runs are deleted too. This can't be undone.`,
    confirmLabel: "Delete job",
    danger: true,
  });
  if (ok) await api.del(`/api/jobs/${job.id}`);
}

return <>{/* the page */}{dialog}</>;
```

- Name the thing in the title and the consequence in the message. Label the button with the verb ("Delete job"), never
  "OK" or "Yes".
- Cancel comes first, so the dialog opens with focus on it and Enter is the safe answer. Escape cancels.
- The dialog is a `role="alertdialog"` named by its title and described by its message.
- A second `confirm` while one is open answers the first with `false`; unmounting answers `false` too, so no caller
  waits forever.

When the dialog should stay up while the action runs (a slow delete whose failure belongs in the dialog), use
`ConfirmDialog` directly and pass `busy`: the confirm button spins, Cancel is disabled and Escape is ignored until you
set `open` to false.

## One query's states: DataState

```tsx
const keys = useQuery({ queryKey: ["keys"], queryFn: listKeys });

<DataState query={keys} empty={<EmptyState title="No API keys yet" />}>
  {(keys) => <KeyTable keys={keys} />}
</DataState>
```

`query` is anything with `{ data, error, isPending }`.

| State | Shows |
| --- | --- |
| Pending, under the loading delay | Nothing, so a fast answer never flashes a spinner |
| Pending, longer | `loading`, or a `Spinner`; held for its minimum time (`useLoadingIndicator`) |
| Error, no data | A danger `Alert` with `errorMessage(error)` |
| Error on a refetch, data still there | The alert above the data it could not refresh |
| Data is an empty array and `empty` is set | `empty` |
| Data | `children(data)` |

## Contain a crash: ErrorBoundary

A render error unmounts the whole tree above it unless something catches it. Put an `ErrorBoundary` around each page,
keyed by the route so moving to another page clears it:

```tsx
<ErrorBoundary key={route.path} onError={(e) => log.error("render failed", e)}>
  <Page />
</ErrorBoundary>
```

The default fallback is a danger `Alert` with the message and a Try again button that renders the subtree again. Pass
`fallback` as a node, or as `(error, reset) => node` for your own. Boundaries catch render and lifecycle errors only:
event handlers and promises report through `useSubmit`, `DataState` or a toast.

## Submit a form: useSubmit

```tsx
const save = useSubmit(async () => {
  await api.put(`/api/repos/${repo.id}`, { config: JSON.parse(config) });
  toast({ message: "Saved", variant: "success" });
});

<form onSubmit={save.onSubmit}>
  {/* fields */}
  {save.error && <Alert variant="danger">{save.error}</Alert>}
  <Button variant="primary" busy={save.busy} busyLabel="Saving">Save</Button>
</form>
```

`onSubmit` prevents the page load, ignores a second submit while the first runs (a same-tick double click included),
clears the last error, and turns whatever `action` throws into `error` with `errorMessage`. Throw your own `Error` for
a client-side check ("Config is not valid JSON") and it shows in the same place. Pair `busy` with the `Button`
behaviour in [forms.md](forms.md#busy-buttons).

## A list in one field: TagInput

```tsx
<Field label="Topics" hint="Separate with commas">
  <TagInput value={topics} onChange={setTopics} groupLabel="Topics" />
</Field>
```

A comma, Enter, or leaving the field turns the typed text into tags; pasting "a, b, c" adds all but the last, which
stays in the box until the next comma, Enter or blur. Duplicates are dropped case-blind, keeping the first spelling.
Each tag is a `FilterChip` with a "Remove …" button; Backspace in the empty box removes the last tag. Enter with text
in the box adds a tag rather than submitting the form; Enter in an empty box submits as usual. `Field` wires its label,
hint and error to the text box. `parseTags` and `addTags` are the same rules for server-side or non-React code.

## Route with real links

```tsx
const { path, query } = useRoute();
const book = matchPath("/books/:id", path);

<Link to={`/books/${b.id}`}>{b.title}</Link>
```

`Link` renders a real `<a href>`, so it can be opened in a new tab, copied and bookmarked. A plain left click navigates
without a page load; Cmd/Ctrl, Shift, Alt and middle clicks, `target="_blank"` and `download` links are left to the
browser. `navigate(to, { replace })` does the same from code. `useRoute` re-renders on navigation and back/forward and
gives the path normalized (no trailing slash) and the query as `URLSearchParams`. `matchPath` returns the params, each
decoded, or `null`; a malformed escape in the URL matches nothing instead of throwing.

The server must answer every app path with `index.html`. When it can't, call `setHashRouting(true)` once before the
first render: links become `#/books/7` and the route is read from the hash.

## Follow a stream: useLineStream

```tsx
const logs = useLineStream(`/api/containers/${id}/logs?follow=1`, { init: { headers: authHeaders() } });

{logs.status === "failed" && <Alert variant="danger">{logs.error}</Alert>}
<LogBlock follow>{logs.lines.length ? logs.lines.join("\n") : "(waiting for logs…)"}</LogBlock>
```

It reads the response as a fetch stream, not `EventSource`, so it can send an Authorization header. Plain text is split
into lines; a `text/event-stream` response is read as Server-Sent Events, one line per `data:` line. `status` is
`connecting`, `open`, `retrying` (after a network error or a 5xx, waiting 1 s, then 2, 4, … up to 30 s), `failed`
(any other non-OK answer: no retry) or `closed` (the server ended it). Lines are kept across reconnects, capped at
`maxLines` (1000). A `null` URL stays closed; changing the URL starts over. `init` is read at each connect, so a fresh
object per render does not reconnect.

An endpoint that replays a tail on every connect (`tail=200`) shows those lines twice after a reconnect. WebSockets are
not covered.

## Format for people

| Function | Gives |
| --- | --- |
| `formatDate(value, options?, locale?)` | "Nov 2, 2026" in the reader's locale; pass `{ dateStyle, timeStyle }` for time |
| `formatRelative(value, now?, locale?)` | "3 minutes ago", "yesterday", "in 2 hours"; "now" under a minute |
| `formatDuration(ms)` | "450 ms", "3 min 20 s", "2 h 5 min": the two largest units |
| `formatBytes(bytes)` | "1.5 MB" (decimal units, as file managers show) |
| `localISODate(date?)` | "2026-11-02" for the local day, for `<input type="date">` and API dates |
| `errorMessage(error, fallback?)` | The message of anything thrown, or "Something went wrong." |

A bare "YYYY-MM-DD" string is read as that local day everywhere (`toDate`). Never `iso.slice(0, 10)` a timestamp to get
a date: that is the UTC day, a day off for an evening in the Americas. Use `localISODate(new Date(iso))`.
