# Show loading, emptiness and the result of an action

For anyone building screens on top of a theme, in React or plain HTML. After reading it you can pick the right loading
indicator for a wait and keep it from flashing, design an empty state, raise toasts that everyone can read and act on,
offer undo instead of a confirmation, show autosave status, and choose which surface a notification belongs on. The live
demo is `site/feedback.html`.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/styles` and `@lepid-labs/ui-react` from the release that adds `Skeleton`. No token was added: toasts use
  the `--ld-z-toast` layer and `--ld-elevation-3` from [foundation.md](foundation.md).

## Loading: pick the indicator by the wait

| The wait | Show |
| --- | --- |
| Under about 400 ms | Nothing. An indicator that blinks on and off reads as a glitch. |
| Short and of unknown length, in one control | `Button busy` (see [forms.md](forms.md)) or a `Spinner` |
| Content whose shape you know (a list, a card, an article) | `Skeleton` in that shape |
| Long, with a known amount done (upload, export, install) | `Progress` with real numbers next to it: "12 of 40 files" |
| A cheap, reversible action (like, rename, reorder) | Nothing: update at once, and say so only if the server refuses |

- Never put a bare spinner over a whole page. Past a few seconds, show progress or partial content.
- Do not mix spinners and skeletons in one view. Pick one per region.
- Size skeletons like the content they stand for, so nothing jumps when it arrives.

`useLoadingIndicator(loading)` keeps an indicator from flashing: it stays false for the first 400 ms of loading, and
once true it stays true for at least 500 ms. Loading that resumes while the indicator is still up continues it.

```tsx
const showSkeleton = useLoadingIndicator(isLoading);

<ul aria-busy={isLoading}>
  {showSkeleton ? <PeopleSkeleton /> : people.map((p) => <Person key={p.id} {...p} />)}
</ul>
```

Keep the previous content (or an empty region of the same height) on screen until there is something better to show.
Without React, `trackLoading(win, loading, now)` and `loadingIndicator(win, now)` are the same logic: the second returns
`{ visible, next }`, where `next` is when to check again. `LOADING_TIMING` holds the defaults; pass your own as the last
argument.

## Skeleton

```tsx
<Skeleton variant="circle" />                 {/* avatar, 2.5rem; width sets the diameter */}
<Skeleton variant="text" lines={3} />         {/* three lines, the last one 60% wide */}
<Skeleton variant="block" height="10rem" />   {/* image, chart or card body */}
```

```html
<div aria-busy="true">
  <span class="ld-skeleton ld-skeleton--circle" aria-hidden="true"></span>
  <span class="ld-skeleton ld-skeleton--text" aria-hidden="true" style="width: 60%"></span>
</div>
```

- Every skeleton is `aria-hidden`. The region being loaded carries `aria-busy="true"` until the content is in, so
  screen readers wait instead of reading half a list.
- If the content arriving is the point of the screen (search results, say), announce it through your own polite status
  ("12 results"), the same way you would without a skeleton.
- Each theme animates a light across the shape: a soft orchid sweep (luminous-precision), a sharp lilac scanline
  (neon-butterfly), a white glare on violet-tinted glass (summer-cloud). Under `prefers-reduced-motion` it is a still
  tint.

## Empty states

`EmptyState` is what a list, table or panel shows when it holds nothing. Give it a glyph, a title that says what is
missing, a line of body copy, and the next step.

| `variant` | When | Write |
| --- | --- | --- |
| `first-use` | Nothing has been made yet | What the space is for, and one primary action that makes the first item |
| `no-results` | A search or filter matched nothing | What was searched, then the way out: "Clear filters", a wider range |
| `cleared` | Everything is done: inbox zero, no alerts | Say it plainly; usually no action |
| none | Anything else | |

```tsx
<EmptyState
  variant="first-use"
  icon={<FolderPlusIcon />}
  title="No projects yet"
  actions={<><Button variant="primary" onClick={create}>New project</Button><Button>Import from a repo</Button></>}
>
  Projects keep your pipelines, secrets and runbooks together.
</EmptyState>
```

Plain HTML is `.ld-empty` (plus `--first-use`, `--no-results` or `--cleared`) with `.ld-empty__icon` (`aria-hidden`),
`.ld-empty__title`, `.ld-empty__body` and `.ld-empty__actions`. The title is an `h3`; set `titleAs` to fit your page's
outline. A failed load is not an empty state: show an `Alert` with what went wrong and a retry.

`StatusCardEmpty` stays separate. It is a one-line, 12px row inside a dense dashboard card, aligned with the card's
rows; a block with a glyph, a heading and buttons is the wrong scale there. Use `EmptyState` for a page, a panel or a
table body, and `StatusCardEmpty` inside a `StatusCard`.

## Toasts

Mount one `Toaster` near the root of the app, then call `toast()` from anywhere, including outside React.

```tsx
<Toaster />

toast({ variant: "success", title: "Deployed", message: "web-frontend v2.4.1 is live." });
const id = toast({ message: "Uploading…", duration: null });
toast.dismiss(id);
toast({ id, variant: "success", message: "Uploaded." }); // reusing an id replaces that toast in place
```

| Toast | Stays | Read by screen readers |
| --- | --- | --- |
| `info`, `success` | 5 s | Politely (`role="status"`) |
| `warning` | 7 s | Politely |
| With an `action` | 10 s | Politely, with the action and the hotkey: "… (View, F8)" |
| `danger` | Until dismissed | Assertively (`role="alert"`) |

`duration` overrides the default (`null` keeps a toast until dismissed), but an error or an action toast is never given
less than 6 s.

What the `Toaster` does:

- **Placement:** bottom-right on the `--ld-z-toast` layer, clear of notches and home indicators
  (`env(safe-area-inset-*)`). Below 48rem it spans the top edge, so it does not cover a bottom tab bar or the keyboard.
- **Stacking:** at most three show, oldest first. The rest wait, with their clock stopped, and show as space frees up.
- **Time:** every clock stops while the pointer is over the stack, while focus is in it, and while the tab is hidden
  (WCAG 2.2.1). An action toast drains a countdown bar that stops with it.
- **Keyboard:** F8 (`hotkey`) moves focus to the newest toast's first button. Escape dismisses the toast you are in and
  moves you to the next one, or back where F8 took you from. Each toast is a group named by its text, so its buttons are
  read in context.
- **Announcements:** the text goes into live regions that are always mounted, so a toast is read when it appears, and
  the Dismiss button and countdown are not read with it. The stack itself is a "Notifications (F8)" landmark.

Write toasts as one short sentence about what happened. Do not put anything in a toast that the user must see: it can
be missed, so the same information must be reachable elsewhere.

A toast renders below a modal `<dialog>`, which sits in the browser's top layer. Show the result inside the dialog, or
raise the toast after it closes.

Without React, the pure queue in `toast-queue` (`toastQueue`, `addToast`, `dismissToast`, `pauseToasts`,
`visibleToasts`, `nextToastExpiry`, `expiredToasts`, `toastDuration`) runs the same rules; `site/feedback-demo.js` is a
vanilla view over it. The markup:

```html
<section class="ld-toaster" aria-label="Notifications (F8)">
  <div class="ld-toast ld-toast--success" role="group" aria-labelledby="t1">
    <div class="ld-toast__body" id="t1"><div class="ld-toast__title">Deployed</div>
      <div class="ld-toast__message">web-frontend v2.4.1 is live.</div></div>
    <button type="button" class="ld-icon-btn ld-toast__close" aria-label="Dismiss">…</button>
  </div>
</section>
```

An action is an `.ld-btn.ld-btn--sm.ld-toast__action` before the close button; its countdown is an `aria-hidden`
`.ld-toast__countdown` with `--ld-toast-duration` set, and `data-ld-paused` on the stack stops it.

## Undo instead of confirm

For an action the user can take back, do it at once and offer undo. A confirmation on every delete trains people to
click through it without reading.

| The action | Use |
| --- | --- |
| Reversible: archive, move, remove from a list, delete into a trash | Do it, then a toast with Undo |
| Costly to redo but recoverable: a large delete | Do it, keep it recoverable (a trash, 30 days), offer Undo |
| Irreversible, or it reaches other people: purge, revoke, send | Confirm first: `HoldButton`, or a `Dialog` that names what will happen |

`scheduleUndoable` holds the commit (the request, the purge) back for the undo window. Pass it to `toast()` as `undo`:
the toast gets an Undo button and a countdown, the window stops whenever the toast's clock does, Undo cancels the commit
and runs your `undo`, and the toast closing any other way (timeout, Dismiss, Escape) commits.

```tsx
function archive(thread: Thread) {
  hideThread(thread.id); // the UI changes at once
  toast({
    message: `Archived "${thread.subject}".`,
    undo: scheduleUndoable({
      commit: () => api.archive(thread.id),
      undo: () => showThread(thread.id),
    }),
  });
}
```

- The window is `delay`, default `UNDO_MS` (8 s). Do not go below 5 s.
- Leaving the page commits every pending undo, so what the user saw happen sticks. Make `commit` survive the unload:
  `fetch(url, { method: "POST", keepalive: true })` or `navigator.sendBeacon`.
- Used alone, the handle has `undo()`, `flush()` (commit now), `pause()`, `resume()` and `status`.
- `toast({ message, action: { label: "Undo", onAction } })` also works when you hold the commit yourself.

## Autosave status

`useAutosave(save)` debounces edits into saves; `SaveStatus` shows where they stand.

```tsx
const autosave = useAutosave(() => api.saveDraft(draftRef.current));

<SaveStatus status={autosave.status} savedAt={autosave.state.savedAt} onRetry={autosave.retry} />
<Textarea value={draft} onChange={(e) => { setDraft(e.target.value); autosave.edit(); }} />
```

| Status | Shows | Announced |
| --- | --- | --- |
| `idle` | Nothing | No |
| `pending` | "Unsaved changes" | No |
| `saving` | A spinner and "Saving…" | No |
| `saved` | "Saved", then "Saved 3 minutes ago" | Only when it recovers from offline or an error |
| `offline` | "Offline: changes will save when you reconnect" | Once, on going offline |
| `error` | "Changes not saved" and a Retry button | Once, on failing |

- A save starts 800 ms after the last edit (`debounce`), or 5 s after the first unsaved one if typing never pauses
  (`maxWait`). One save runs at a time; edits made meanwhile go in the next.
- "Saved" only follows a save the server accepted.
- Offline, edits wait and nothing is sent; they go as soon as the browser is back online. A save that fails because
  the network dropped mid-request is queued, not shown as an error. `save` sends the whole latest content, so the queue
  is one save, not a list of edits. Keep a local copy (IndexedDB) if losing an offline session would hurt.
- A failure online shows the error and waits for Retry or the next edit; it does not retry in a loop.
- While anything is unsaved, leaving the page asks first (`beforeunload`).

`labels` and `retryLabel` replace the words. Without React, `autosaveState`, `autosave(state, event)`, `saveStatus`,
`shouldAnnounceSave` and `savedAgo` are the whole machine; the demo wires them with two timers. The markup is a
`.ld-save-status` with `data-ld-save="<status>"`, a `.ld-save-status__text`, an optional `.ld-save-status__retry`
button, and a visually hidden `role="status"` element for the announcements.

## Choosing a notification surface

Match the surface to how much the message matters and how long it stays true. If everything is loud, nothing is.

| Surface | Use it for | Stays |
| --- | --- | --- |
| Inline (`Field` message, `SaveStatus`, text next to the thing) | Feedback about one control or region | While it is true |
| Toast | The result of something the user just did, or a low-priority event | Seconds, or until dismissed for errors |
| `Badge` (`pulse` for the one call to action) | A count or state that waits for attention: unread, needs review | Until resolved |
| Banner (`Alert` at the top of the page or region) | A condition that affects the whole screen: degraded service, read-only mode, an expiring plan | Until it is no longer true |
| `Dialog` | A decision the user must make before going on | Until answered |

Never stack dialogs, and do not use one for news the user cannot act on. An error from an action the user just took goes
in a toast if they can carry on, inline if it is about a field, and in a dialog only if they cannot continue without
deciding something.

## Run the demo locally

The demo imports the pure helpers from `site/ui/`, which the Pages workflow builds. Locally, after `pnpm build`:

```sh
ln -s ../styles site/styles
ln -s ../components/react/dist site/ui
python3 -m http.server --directory site
```

Serve it over HTTP: browsers do not load ES modules from `file://`.
