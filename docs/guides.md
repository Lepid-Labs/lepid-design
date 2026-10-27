# Guides

How to use lepid-design beyond what the README covers, one topic per file. Each guide is written for people building
components in this repo or screens on top of a theme, and describes the system as it ships.

| Guide | Summary |
| --- | --- |
| [Use the motion, elevation and layer tokens](guides/foundation.md) | Pick durations, curves, shadow levels and z-index layers, keep hover from trapping touch and keyboard users, and build a card that is one clickable target. |
| [Build forms that explain themselves](guides/forms.md) | Show every field state with hints and messages, validate on blur then live, keep buttons usable while busy or blocked (with a visible reason), and add password, one-time-code and masked inputs. |
| [Show loading, emptiness and the result of an action](guides/feedback.md) | Pick nothing, a spinner, a skeleton or a progress bar by how long the wait is, never flash one, design empty states, raise toasts (with undo instead of a confirm), show autosave status, and choose between inline, toast, badge, banner and dialog. |
| [Layer overlays: tooltips, menus, sheets, the command palette and search](guides/overlays.md) | Pick between tooltip, toast, menu, drawer, bottom sheet and dialog, add tooltips that hand off along a toolbar, keyboard-complete menu buttons and context menus, draggable bottom sheets, a ⌘K command palette with fuzzy search, and a search field with the five parts of a search experience. |
| [Show data: sortable tables, bulk actions, pagination and filters](guides/data.md) | Sort and select table rows (Shift+click ranges, select all matching), stick the header, set density, act on a selection from a bulk bar with undo, page by number or cursor (and know why offsets break), and narrow results with filter chips and a live count. |
| [Draw charts that tell the truth](guides/charts.md) | Pick a bar chart, line chart or sparkline by the question, keep axes honest (zero baselines, nice ticks, a drawn break when you opt out), label lines directly, avoid the charts that lie, and give every chart a description and a data table. |
