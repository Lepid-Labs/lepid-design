import { axisWidth, CHAR_W, ChartFrame, valueFormat, YAxis, type ChartBaseProps } from "./ChartFrame.js";
import { bandLayout, barExtent, extremes, labelEvery, linearScale, niceScale } from "./chart-scale.js";
import { cx } from "./cx.js";

export interface BarDatum {
  label: string;
  value: number;
}

export interface BarChartProps extends ChartBaseProps {
  data: readonly BarDatum[];
  /** Label of the one bar to call out. It takes the accent and a bold value label,
   *  so the emphasis is not colour alone. */
  highlight?: string;
}

const TOP = 28;
const BOTTOM = 24;
const RIGHT = 8;

/** Bars compare amounts, so the value axis always starts at zero (a bar's length
 *  is its value; there is no opt-out). Nice ticks, the value on each bar when it
 *  fits, thinned category labels, and a data table behind "Show data". */
export function BarChart({ data, highlight, title, description, unit, yLabel, xLabel, height = 240, format, dataLabel, className }: BarChartProps) {
  const fmt = valueFormat(unit, format);
  const scale = niceScale(data.map((d) => d.value));
  const left = axisWidth(scale);
  const y = linearScale(scale.domain, [height - BOTTOM, TOP]);
  const ext = extremes(data.map((d) => d.value));
  const summary = ext
    ? `${data.length} bars. Highest: ${data[ext.maxIndex].label}, ${fmt(ext.max)}. Lowest: ${data[ext.minIndex].label}, ${fmt(ext.min)}.`
    : "No data.";
  const longestLabel = Math.max(0, ...data.map((d) => d.label.length)) * CHAR_W + 8;
  const longestValue = Math.max(0, ...data.map((d) => fmt(d.value).length)) * CHAR_W + 4;

  return (
    <ChartFrame
      title={title}
      description={description ?? summary}
      height={height}
      xLabel={xLabel}
      dataLabel={dataLabel}
      className={cx("ld-chart--bar", className)}
      table={{ head: [xLabel ?? "Category", yLabel ?? "Value"], rows: data.map((d) => [d.label, fmt(d.value)]) }}
    >
      {(width) => {
        const { bands, band, width: barWidth } = bandLayout(data.length, [left, width - RIGHT]);
        const every = labelEvery(band, longestLabel);
        return (
          <>
            <YAxis scale={scale} y={y} left={left} right={width - RIGHT} label={yLabel ?? unit?.trim()} />
            <g aria-hidden="true">
              {data.map((d, i) => {
                const bar = barExtent(d.value, y);
                const lit = d.label === highlight;
                return (
                  <g key={i} className={cx("ld-chart__bar-group", lit && "ld-chart__bar-group--highlight")}>
                    <rect className={cx("ld-chart__bar", lit && "ld-chart__bar--highlight")} x={bands[i].x} y={bar.y} width={barWidth} height={bar.height} />
                    {band >= longestValue && (
                      <text className="ld-chart__value" x={bands[i].center} y={d.value < 0 ? bar.y + bar.height + 12 : bar.y - 5} textAnchor="middle">
                        {fmt(d.value)}
                      </text>
                    )}
                    {i % every === 0 && (
                      <text className="ld-chart__tick ld-chart__tick--x" x={bands[i].center} y={height - 6} textAnchor="middle">
                        {d.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </>
        );
      }}
    </ChartFrame>
  );
}
