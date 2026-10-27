# Draw charts that tell the truth

For anyone putting numbers on a screen built on a theme. After reading it you can pick a chart for a question, draw bar
charts, line charts and sparklines that use the theme's colours and type, and know which choices make a chart mislead
and how the defaults here keep you from making them. The live gallery is the Charts section of `site/data.html`.

## Prerequisites

- A theme loaded and `data-ld-style` set, as the README describes.
- `@lepid-labs/ui-react` from the release that adds `BarChart`. The charts are plain SVG drawn by the components: no
  chart library, nothing to install. Colours come from the theme: each `.ld-chart` sets `--ld-chart-1` to
  `--ld-chart-4` from its palette, and you can override them on a parent.

## Pick the chart by the question

| The question | Use |
| --- | --- |
| How do these amounts compare? | `BarChart` |
| How did this change over time? | `LineChart` |
| Which way is this heading, in a cell or next to a number? | `Sparkline` |
| What share of the whole is each part? | A bar chart sorted by size, or a table. Pie charts stop working past about five slices. |
| What is the exact value? | A table. A chart is for the shape. |

Title every chart with its takeaway, not the measure: "Deploys peak on Tuesday", not "Deploys per day". The title is
the chart's caption and its accessible name.

## Bar chart

```tsx
<BarChart
  title="Deploys peak on Tuesday and stop for the weekend"
  data={[{ label: "Mon", value: 18 }, { label: "Tue", value: 31 }, /* … */ { label: "Sun", value: 1 }]}
  highlight="Tue"
  yLabel="Deploys per day"
  xLabel="Weekday, last 4 weeks"
/>
```

- The value axis always starts at zero, and there is no option to change that: a bar's length is its value. Negative
  values hang below the zero line, which is drawn heavier than the gridlines.
- Ticks are "nice": 1, 2 or 5 times a power of ten, about five of them, ending on a round number above the largest
  value (`niceScale`).
- Each bar carries its value when it fits, so people do not have to read across to the axis. Category labels thin out
  when they would collide.
- `highlight` calls out one bar with the accent colour and a bold value label, so the emphasis is not colour alone.
  Use it for the one bar the title talks about.

## Line chart

```tsx
<LineChart
  title="The build cache halved p95 build time from week 6"
  labels={["W1", "W2", /* … */ "W12"]}
  series={[
    { name: "p95", values: [14.2, 13.8, 14.9, 15.1, 14.4, 9.6, 7.8, 7.2, null, 7.4, 6.9, 7.1] },
    { name: "p50", values: [6.1, 6.0, 6.4, 6.3, 6.2, 4.4, 3.9, 3.7, null, 3.8, 3.6, 3.6] },
  ]}
  unit=" min"
  yLabel="Build time (min)"
/>
```

- Lines are named where they end (direct labels), not in a legend, and the labels are nudged apart when they would
  overlap (`spreadLabels`).
- Each series has its own colour, dash pattern and marker shape (circle, square, diamond, triangle), so the lines can
  be told apart in greyscale and by people who do not see the colours. Up to four series; past that, split the chart.
- A `null` is a gap: the line breaks there instead of drawing a straight line through values nobody measured.
- The value axis starts at zero by default. `zero={false}` fits it to the data, for when the variation itself is the
  point (uptime between 99.5% and 100%). The chart then draws a visible break on the axis, the bottom tick shows where
  it starts, and the description says "The value axis starts at 99.5%, not zero." Say it in `yLabel` too.

## Sparkline

```tsx
<Sparkline values={buildTimes} label="web-frontend build time, last 14 runs" unit=" min" />
```

A word-sized trend for a table cell or next to a big number. It has no axis, so it scales to its own range to show the
shape, and states the numbers instead: the latest value is printed beside it, and its accessible name includes the
first, last, lowest and highest values. Never put two sparklines side by side to compare their heights: each has its
own scale.

## Charts that lie, and what the defaults do about it

| The lie | How it misleads | What the defaults do |
| --- | --- | --- |
| Truncated axis | A bar axis from 95 makes 96 look twice as big as 98 | Bars always start at zero. A line axis may skip zero only when you opt out, and then the break is drawn and described. |
| Area distortion | Scaling an icon or a 3D bar by its value grows its area by the square | Only flat bars and lines; no 3D, no pictograms, no bubble sizes. |
| Cherry-picked range | Starting the line just after a dip invents a recovery | The chart shows the range you pass. Show a whole period (a quarter, a year), name it in the title or `xLabel`, and keep the same range when you compare. |
| Dual axes | Two scales on one chart make any two lines cross wherever you like | One value axis per chart. Two measures get two charts with the same x labels. |
| Unlabelled scale | Ticks without units or a label invite any reading | `yLabel` names the measure and unit; values carry `unit`. |
| Colour-only meaning | A legend of near hues that some readers cannot tell apart | Direct labels, dashes and markers; one accent for the one thing that matters. |
| Smoothed or bridged data | Curves and joined gaps imply values that were never measured | Straight segments between real points; gaps stay gaps. |

Also keep the aspect so the main trend sits near 45°: a very wide chart flattens a change, a tall one exaggerates it.
The charts default to 240px high at the container's width; pass `height` to adjust.

## Accessibility

- Each chart is a `<figure>`: the title is its `<figcaption>`, and the SVG is `role="img"`, named by the caption and
  described by a `<desc>` that summarises the data (highest and lowest, first and last, and the axis note). Pass
  `description` to write your own; say what the reader should take away.
- "Show data" is a `<details>` holding the numbers as a table, for screen-reader users, for anyone who wants exact
  values, and for copying. It is closed by default and costs nothing when unused.
- The charts measure their container and redraw at its width, so text stays at its real size on a phone instead of
  shrinking with the drawing.
- Series colours and bar edges hold at least 3:1 against the theme's background, and no meaning rests on colour
  alone.

Plain HTML or another framework: `bandLayout`, `barExtent`, `niceScale`, `formatTick`, `linearScale`, `linePath`,
`spreadLabels`, `labelEvery` and `extremes` are the pure geometry, and the classes are `.ld-chart` (`__title`, `__svg`,
`__grid`, `__baseline`, `__axis-line`, `__break`, `__tick`, `__axis-label`, `__bar`, `__bar--highlight`, `__value`,
`__series--0`…`--3`, `__line`, `__points`, `__label`, `__data`) and `.ld-sparkline` (`__line`, `__dot`, `__value`).
`site/chart-demo.js` draws the gallery with them in about 150 lines.
