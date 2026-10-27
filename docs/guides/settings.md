# Build a settings page

For anyone building a settings or preferences screen on top of a theme. After reading it you can lay out grouped
settings with a section nav, decide how each kind of change takes effect, and put destructive actions where nobody
trips over them. The live preview is `site/layout-settings.html`; the parts it uses are in [surfaces.md](surfaces.md),
[forms.md](forms.md), [feedback.md](feedback.md) and [overlays.md](overlays.md).

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/styles` from the release that adds `.ld-settings`. The layout is CSS only; there is no React wrapper,
  so use the classes from JSX as well.

## Layout

```html
<div class="ld-settings">
  <nav class="ld-settings__nav" aria-label="Settings sections">
    <a class="ld-settings__link" href="#profile" aria-current="true">Profile</a>
    <a class="ld-settings__link" href="#danger">Danger zone</a>
  </nav>
  <div class="ld-settings__body">
    <section class="ld-settings__section" id="profile" aria-labelledby="profile-h">
      <header class="ld-settings__header">
        <h2 class="ld-settings__title" id="profile-h">Profile</h2>
        <!-- optional: a SaveStatus for the section -->
        <p class="ld-settings__description">How you appear to your team.</p>
      </header>
      <div class="ld-settings__row">
        <div class="ld-settings__label">
          <label class="ld-label" for="mentions">Mentions</label>
          <p class="ld-settings__hint" id="mentions-hint">When someone @mentions you.</p>
        </div>
        <div class="ld-settings__control">
          <input type="checkbox" role="switch" class="ld-switch" id="mentions" aria-describedby="mentions-hint">
        </div>
      </div>
    </section>
    <section class="ld-settings__section ld-settings__section--danger" id="danger">…</section>
  </div>
</div>
```

- `.ld-settings` is a container query. With room for both, the nav is a sticky column beside the sections; with less,
  it is a scrolling row above them and does not stick, so it never covers the setting being changed. This follows the
  space the page gives it, not the window, so it works beside an open side nav.
- Each row puts the label and hint first and the control at the end; on a narrow screen the control drops below the
  label, still at the end. Tie a hint to its control with `aria-describedby`.
- Sections scroll into place below a sticky header (`--ld-shell-top`), so a nav link never hides the section's title.
  Mark the section in view with `aria-current` on its link; the preview does it with an `IntersectionObserver`.

## Group by what people are trying to do

Name sections after tasks (Profile, Notifications, Appearance, Security), not after tables in your schema, and keep
each short. Put rarely used options in a collapsed disclosure inside their section (a lone `.ld-accordion__item`
labelled "Advanced") so the common path stays short. Past twenty or so settings, add a search field
(`SearchInput`) that filters rows; the preview is small enough not to need one.

When a preference differs from its default, mark it ("Modified", an `.ld-badge--sm` by the label) and put a Reset
beside the control that reverts that one setting only. Name the button fully for screen readers ("Reset density to
Comfortable") and move focus to the control when the button goes away.

## How changes take effect

Match the apply model to what a mistake costs:

| Kind of setting | Apply model | Parts |
| --- | --- | --- |
| Preferences: switches, selects, choices | Save on change, debounced | `useAutosave` + one `SaveStatus` per section |
| Identity text: name, email, bio | Save on commit (Enter or blur), Escape undoes | `InlineEdit`, one save per field |
| Secrets: password, keys | Explicit button, never on blur | a form with `PasswordField` and a `Button busy` |
| Irreversible: delete, transfer | Confirm by typing the name | `Dialog` + `Button disabledReason` |

**Why autosave, not a Save/Discard bar.** Preferences are independent of each other: there is nothing to batch, and
each change is cheap to change back. With a page-level bar, a change made at the top waits for a button at the bottom,
leaving the page loses it, and "Discard" throws away changes the reader no longer remembers making. Saving each change
as it happens, with the status shown in the section where it happened, gives feedback where the eye already is. The
`useAutosave` state machine debounces rapid toggles into one request, keeps edits made offline until the network
returns, and warns before the page closes with an unsaved change. Keep one `SaveStatus` per section rather than one per
row: it is the same information, with less noise.

Use a Save/Discard bar only for a group whose fields make sense only together, such as a mail server's host, port and
credentials, and scope it to that section, not the page.

## Danger zone

Destructive actions go last, in `.ld-settings__section--danger`, which each theme sets apart with its danger colour
(an edge, a tint or a dashed frame). A single click never fires one: the button opens a `Dialog` that says exactly
what will be lost and asks for the resource's name. Its delete button stays `aria-disabled` with a visible reason
("Type the workspace name first.") until the name matches, so it is still focusable and says why. For actions that are
serious but smaller (revoking one key), a `HoldButton` is enough; for anything reversible, act at once and offer undo
([feedback.md](feedback.md)) instead of asking.
