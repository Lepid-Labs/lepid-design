# Pick dates and colours

For anyone building forms on top of a theme, in React or plain HTML. After reading it you can add a date field led by
one-click presets, a typed date for dates people know by heart, and a colour field with presets, a hex code and a live
contrast check. Sliders, uploads, drag and drop and swipe actions are in [manipulation.md](manipulation.md). The live
demo is `site/manipulation.html`.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/styles` and `@lepid-labs/ui-react` from the release that adds `DateField`. The presets are `.ld-chip`
  buttons from [data.md](data.md); the typed date is `MaskedInput` and the error line is the field message from
  [forms.md](forms.md).

## Dates

```tsx
<DateField label="Due date" value={due} onChange={setDue} min={today} max={addDays(today, 90)}
  hint="Today or within the next 90 days." />
<DateField label="Remind me" type="datetime-local" value={at} onChange={setAt} />
<DateField label="Date of birth" typed value={dob} onChange={setDob} presets={[]} />
```

Values are the native input's strings: `"2026-03-15"`, or `"2026-03-15T09:00"` for `datetime-local`; `""` is none.

- **Presets first.** Most dates people pick are one of a few, so chips for Today, Tomorrow and Next week sit above the
  field; the chosen one shows as pressed. Pass your own: `presets={[DATE_PRESETS.today, { label: "In 30 days", resolve:
  (t) => addDays(t, 30) }]}`. "Next week" is next Monday. A chip outside `min`/`max` is disabled. On a
  `datetime-local` a chip changes the day and keeps the time (09:00 if there is none).
- **Today is the reader's day.** Presets count from the local calendar date (`localISODate`), not the UTC date, which
  is already tomorrow on an American evening. Day arithmetic (`addDays`, `nextWeekday`) works on the date alone, so a
  daylight-saving change never skips or repeats a day.
- **Bounds in words.** `min` and `max` grey out days in the browser's calendar; a typed date outside them shows "Pick
  Mar 1, 2026 or later." in the field's error line.
- **Typed entry.** `typed` swaps the picker for a masked text field (`MM/DD/YYYY`, or `order="dmy"` for `DD/MM/YYYY`):
  the slashes fill in as you type, and eight digits that aren't a real date ("02/30/2026") show an error. Use it for
  birthdays and anything copied from paper, where paging a calendar back 40 years is the slow way.

### Why the native picker, not a custom calendar

The native input already brings the calendar, full keyboard support, the reader's locale (date order, first day of the
week, month names), screen-reader support, and the phone's own wheel or sheet, sized for a thumb. A custom calendar
would have to rebuild all of that and still lose on mobile. Presets cover the common picks; typed entry covers the
dates people know. Style is the trade: the popup calendar is the browser's, only the field is themed.

### If you build a full calendar grid

Build one only for what the native picker can't do, such as a date range with both ends in one view or prices on
days. It needs, at least:

- the APG date picker dialog: a `role="grid"` of buttons with one tab stop; arrows move by day, Page Up/Down by month,
  Shift+Page Up/Down by year, Home and End to the week's ends; Enter picks, Escape closes and returns focus;
- `aria-current="date"` on today, `aria-selected` on the pick, `aria-disabled` on days outside `min`/`max`, and a live
  month heading;
- locale from `Intl`: first day of the week, month and day names, and the field's date order;
- typed entry in the field beside it, never only the grid;
- for ranges: two months side by side (three on wide screens), a hover preview after the first click, and presets
  ("Last 7 days", "Last 30 days") ahead of the grid;
- on phones, a full-screen sheet with today at the top and a confirm button within thumb reach, not a shrunken popover.

## Colours

```tsx
<ColorField label="Label colour" value={color} onChange={setColor}
  swatches={[
    { value: "#c6a5ff", name: "Orchid" },
    { value: "#00f5ff", name: "Teal" },
    { value: "#ff4d6d", name: "Rose" },
  ]} />
```

Values are `"#rrggbb"`, the form the native colour input uses.

- **Presets as a radio group.** Swatches are native radios: one tab stop, arrow keys between them, each named
  ("Orchid"), and the chosen one carries a ring and a check, not just a colour.
- **Any colour.** The swatch button with a spectrum corner is the native colour input: the system picker, with its
  eyedropper where the system has one.
- **Hex code.** The field takes `#ABC`, `abc` or ` 3366FF ` and writes it back as `#3366ff` (`normalizeHex`). Six
  digits apply as you type; anything else waits for Enter or blur and then says what it expects.
- **Contrast, live.** The preview prints sample text in the colour on the theme's surface (`--ld-surface`, or
  `against`) with its WCAG ratio and level: "4.8:1 AA", "3.2:1 Large text only", "1.8:1 Fails" (`contrastRatio`,
  `contrastGrade`). The ratio is truncated, so a failing 4.49 never reads as 4.5.

The theme styles `.ld-color` (`__row`, `__swatch`, `__picker`, `__hex`, `__preview`, `__sample`, `__contrast` with
`data-ld-contrast="pass|large|fail"`) and `.ld-swatches` / `.ld-swatch` (`__input`, `__chip`, colour in
`--ld-swatch`); the plain markup is in `site/manipulation.html`.
