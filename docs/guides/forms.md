# Build forms that explain themselves

For anyone building forms on top of a theme, in React or plain HTML. After reading it you can show every state a
field can be in, decide when to validate, keep a button usable while its request runs or while something blocks it,
and drop in password, one-time-code and masked inputs. The live demo is `site/forms.html`.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/styles` and `@lepid-labs/ui-react` from the release that adds `Field` hints and messages. No baseline
  token was added; summer-cloud declares an extra `--ld-success-deep` for readable success text.

## Field states

`Field` renders a label, the control, an optional hint, and a status line for an error or a success message.

| State | Hook | What the themes do |
| --- | --- | --- |
| Default | `.ld-input`, `.ld-textarea`, `.ld-select` | The theme's resting well |
| Focus | `:focus` | The theme's focus line and ring |
| Filled | `[placeholder]:not(:placeholder-shown)` | A lit edge (dark themes), white instead of sunken (summer-cloud) |
| Error | `aria-invalid="true"` on the control | Danger edge and ring; the message gets an error icon |
| Success | `.ld-field--success` on the field | Success edge and ring; the message gets a check |
| Disabled | `:disabled` | A hatched well and a not-allowed cursor, never just faded |
| Read-only | `[readonly]` | No well, a dashed edge: the value reads as text you can copy |

Filled is keyed on the placeholder because CSS cannot see a value. Give the control a placeholder, or
`placeholder=" "` when you want none visible.

```tsx
<Field label="Email" hint="We send the receipt here." error={emailError} success={emailOk && "Looks good."}>
  <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
</Field>
```

What `Field` wires onto its one child:

- `id` (the child's own, else `htmlFor`, else a generated one) and the label's `for`.
- `aria-describedby`: the hint, then the status line while it shows something, then the child's own ids.
- `aria-invalid="true"` and `aria-errormessage` while `error` is set. The message is also in `aria-describedby`,
  because several screen readers still ignore `aria-errormessage`.
- The status line is always in the DOM with `aria-live="polite"`, so an error that appears on blur is read out.
  It takes no space while empty.

A custom control (`PasswordField`, `OtpInput`, `MaskedInput`, or your own) must pass those props to its input.

Plain HTML is the same markup:

```html
<div class="ld-field">
  <label class="ld-label" for="email">Email</label>
  <input class="ld-input" id="email" type="email" placeholder="you@example.com"
    aria-invalid="true" aria-describedby="email-hint email-message" aria-errormessage="email-message">
  <p class="ld-field__hint" id="email-hint">We send the receipt here.</p>
  <p class="ld-field__message ld-field__message--error" id="email-message" aria-live="polite">
    Enter an email like name@example.com.</p>
</div>
```

Write messages that name the problem and the fix ("Add the domain ending, like .com"), not "Invalid input".

## Validation timing

Reward early, punish late. `nextFieldStatus(previous, event, valid)` returns `"idle"`, `"valid"` or `"invalid"`:

- Blur and submit always validate.
- While a field shows an error, every keystroke re-validates, so the error clears the moment the value is fixed.
- Otherwise typing never raises an error (that waits for blur), and a success mark the value no longer earns goes
  away.

```tsx
const [status, setStatus] = useState<FieldStatus>("idle");
const check = (event: ValidationEvent) => setStatus((s) => nextFieldStatus(s, event, isEmail(value)));

<Field label="Email" error={status === "invalid" && "Enter an email like name@example.com."}
  success={status === "valid" && "Looks good."}>
  <Input id="email" value={value} onChange={(e) => { setValue(e.target.value); check("input"); }}
    onBlur={() => check("blur")} />
</Field>
```

Blur on an empty field the user only tabbed through reports it invalid. If that is too eager for your form, send
`"blur"` only once the field has been edited. Client checks are for speed; the server repeats every one of them.

## Busy buttons

A button whose request is running should stay where it is, the same size, still focused, and say so.

```tsx
<Button variant="primary" busy={saving} busyLabel="Saving" onClick={save}>Save changes</Button>
```

`busy` sets `aria-busy="true"`. The theme hides the label (it keeps its width, so nothing shifts) and spins a
spinner over it; under reduced motion the spinner turns slower but never stops. Clicks are swallowed, including a
submit button's submit. `busyLabel` is announced through a polite status region rendered next to the button, so pass
`busy` (true or false) for the button's whole life. Do not use `disabled` for loading: it drops focus and goes silent.

Plain HTML: set `aria-busy="true"` on the `.ld-btn`, ignore clicks while it is set, and put the announcement in a
visually hidden `role="status"` element outside the button.

Wait for the server before you show success for anything that cannot be undone (payments, deletes). Optimistic
updates are for cheap, reversible actions such as a like or a rename.

## Disabled with a reason

A `disabled` button is skipped by Tab, silent to screen readers, and cannot show a tooltip. When the user can fix
whatever blocks the action, say what it is:

```tsx
<Button variant="primary" disabledReason={title ? undefined : "Add a title before publishing."} onClick={publish}>
  Publish
</Button>
```

`disabledReason` makes the button `aria-disabled="true"`, styled the same as `:disabled` but still focusable, ties the
reason to it with `aria-describedby`, and renders the reason as visible text (`.ld-btn-reason`) right after it. Clicks
are swallowed; you can still listen for them and move focus to the field that is missing. Where a line of text
does not fit (a dense toolbar), `reasonAs="tooltip"` shows the reason in a `Tooltip` on hover, keyboard focus and a
tap instead ([overlays.md](overlays.md)).

| Use | When |
| --- | --- |
| Keep the button enabled and validate on press | A form submit. On a failed press, mark the blocking fields and focus the first one. |
| `disabledReason` | The user can unblock it here and needs to know how: a missing title, an unsaved draft. |
| `disabled` | Nothing on this screen changes it, and the reason is obvious from context. |

Plain HTML: `aria-disabled="true"` plus `aria-describedby` pointing at a visible `.ld-btn-reason`, and a click
handler that does nothing while it is set. The reason renders as a block, so put the pair in a column or a wrapping row.

## Password field

```tsx
<Field label="New password"><PasswordField id="pw" mode="new" name="password" /></Field>
<Field label="Password"><PasswordField id="current-pw" name="password" /></Field>
```

- `mode="new"` sets `autocomplete="new-password"` and adds a live strength meter and a requirements checklist
  that ticks as you type. The default, `"current"`, sets `autocomplete="current-password"` and shows only the toggle.
- The reveal toggle is an `IconButton` with a constant name ("Show password") and `aria-pressed`. A pointer press
  does not take focus from the field, and the caret stays where it was.
- The strength word sits in a polite live region, so it is read when the level changes, not on every keystroke.
  The checklist is part of the input's description; each rule carries a hidden "done" / "not yet".
- Paste is never blocked, so password managers work.

`passwordStrength(password)` returns 0 to 4 (`STRENGTH_LABELS` has the words). It estimates guessing work from length
and character variety, then discounts repeats, runs (`aaaa`, `1234`), keyboard rows and a short built-in list of the
passwords every attacker tries first, with leetspeak undone. A long passphrase beats a short password with symbols.
There is no dictionary: pair it with a server-side check against breached passwords. `rules` replaces the checklist
(`{ label, test }[]`; the default is `DEFAULT_PASSWORD_RULES`).

## One-time code

```tsx
<Field label="Verification code" hint="Sent by text to the number ending 42." error={codeError}>
  <OtpInput id="otp" name="code" onComplete={verify} />
</Field>
```

N cells (`length`, default 6) that act as one field. The code is one string; the cells are a view of it.

| Input | Result |
| --- | --- |
| A digit | Fills the cell and moves to the next |
| Paste or SMS autofill | Non-digits are dropped; a full code fills every cell, whichever cell it landed in |
| Backspace | Clears the cell, or on an empty cell steps back and clears the previous one |
| Delete | Clears the cell and stays |
| Left / Right, Home / End | Move between the filled cells and the next empty one |
| Tab | Enters at the next cell to fill and leaves the group; the other cells are out of the tab order |

The first cell has `autocomplete="one-time-code"` and every cell `inputmode="numeric"`, so phones offer the code from
a text message. The group is labelled by the Field's label (or `aria-label` when used alone); each cell is
"Digit n of N". An error from `Field` marks every cell. On a wrong code, clear `value` and move focus to the first
cell; put any resend countdown next to the field. `name` submits the code through a hidden input.

Mobile keyboards often send no key events for Backspace, so on an empty cell there it does not step back.

## Input masking

`applyMask(value, pattern, caret)` formats the field's text after an edit and returns `{ value, raw, caret }`. In a
pattern `9` takes a digit, `a` a letter and `*` either; anything else is literal. `MASKS` has `card`
(`9999 9999 9999 9999`), `phone` (`(999) 999-9999`), `expiry` (`99/99`) and `date` (`99/99/9999`).

- The caret is placed after the same number of data characters it was after, so an inserted separator never moves
  it off the character just typed, and typing in the middle stays in the middle.
- Pasted text is cleaned and regrouped; characters no slot takes are dropped; data past the last slot is cut off.
- No trailing separator is added, so Backspace can always remove one.
- `maskDeleteCaret` moves a collapsed caret past separators before Backspace or Delete runs, so the key removes the
  digit beyond the separator instead of a separator the mask would only put back.

```tsx
<Field label="Card number">
  <MaskedInput id="card" mask={MASKS.card} name="card" autoComplete="cc-number" onValueChange={(raw) => setCard(raw)} />
</Field>
```

`MaskedInput` takes and reports the raw value (`value`, `defaultValue`, `onValueChange(raw, formatted)`), defaults
`inputmode="numeric"` for digit-only masks, and submits the raw value through a hidden input named `name`; the visible
field has no name. Validate on blur, not per keystroke. A literal a slot could take (a `+1` prefix in a digit mask) is
not supported.

## Run the demo locally

The demo imports the pure helpers from `site/ui/`, which the Pages workflow builds. Locally, after `pnpm build`:

```sh
ln -s ../styles site/styles
ln -s ../components/react/dist site/ui
python3 -m http.server --directory site
```

Serve it over HTTP: browsers do not load ES modules from `file://`.
