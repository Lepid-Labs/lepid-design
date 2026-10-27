import { axisWidth, CHAR_W, ChartFrame, valueFormat, YAxis, type ChartBaseProps } from "./ChartFrame.js";
import { extremes, labelEvery, linePath, linearScale, niceScale, spreadLabels } from "./chart-scale.js";
import { cx } from "./cx.js";

export interface LineSeries {
  /** Shown as the line's direct label at its last point (no legend to decode). */
  name: string;
  /** One value per label; null is a gap, and the line breaks there. */
  values: readonly (number | null)[];
}

export interface LineChartProps extends ChartBaseProps {
  /** The x categories in order (dates, releases). */
  labels: readonly string[];
  /** Up to four series; each also differs by dash pattern and marker shape, not just colour. */
  series: readonly LineSeries[];
  /** Start the value axis at zero (default). `false` fits the axis to the data and draws a
   *  visible break on it; use it only when the variation is the point. */
  zero?: boolean;
}

const TOP = 28;
const BOTTOM = 24;
const MAX_MARKERS = 24;

function marker(kind: number, x: number, y: number) {
  if (kind === 1) return <rect x={x - 3} y={y - 3} width={6} height={6} />;
  if (kind === 2) return <path d={`M${x},${y - 4}l4,4l-4,4l-4,-4z`} />;
  if (kind === 3) return <path d={`M${x},${y - 4}l4,7h-8z`} />;
  return <circle cx={x} cy={y} r={3} />;
}

/** Change over time. Each line is named at its end, styled by colour, dash and
 *  marker, and breaks at missing values instead of inventing them. */
export function LineChart({ labels, series, zero = true, title, description, unit, yLabel, xLabel, height = 240, format, dataLabel, className }: LineChartProps) {
  const fmt = valueFormat(unit, format);
  const scale = niceScale(series.flatMap((s) => s.values), { zero });
  const left = axisWidth(scale);
  const right = series.length > 1 ? 16 + Math.max(...series.map((s) => s.name.length)) * CHAR_W : 16;
  const y = linearScale(scale.domain, [height - BOTTOM, TOP]);
  const summary = series
    .map((s) => {
      const e = extremes(s.values);
      return e ? `${s.name}: ${fmt(e.first)} to ${fmt(e.last)}, high ${fmt(e.max)} (${labels[e.maxIndex]}), low ${fmt(e.min)} (${labels[e.minIndex]}).` : `${s.name}: no data.`;
    })
    .join(" ");
  const axisNote = scale.broken ? ` The value axis starts at ${fmt(scale.domain[0])}, not zero.` : "";
  const ends = series.map((s) => extremes(s.values));
  const longestLabel = Math.max(0, ...labels.map((l) => l.length)) * CHAR_W + 8;

  return (
    <ChartFrame
      title={title}
      description={(description ?? summary) + axisNote}
      height={height}
      xLabel={xLabel}
      dataLabel={dataLabel}
      className={cx("ld-chart--line", className)}
      table={{
        head: [xLabel ?? "Label", ...series.map((s) => s.name)],
        rows: labels.map((l, i) => [l, ...series.map((s) => (s.values[i] == null ? "–" : fmt(s.values[i]!)))]),
      }}
    >
      {(width) => {
        const x = linearScale([0, Math.max(1, labels.length - 1)], [left + 4, width - right]);
        const every = labelEvery((width - right - left) / Math.max(1, labels.length - 1), longestLabel);
        const labelYs = spreadLabels(ends.map((e) => (e ? y(e.last) : TOP)), 14, [TOP, height - BOTTOM]);
        return (
          <>
            <YAxis scale={scale} y={y} left={left} right={width - right} label={yLabel ?? unit?.trim()} />
            <g aria-hidden="true">
              {labels.map((l, i) =>
                i % every === 0 ? (
                  <text key={i} className="ld-chart__tick ld-chart__tick--x" x={x(i)} y={height - 6} textAnchor="middle">{l}</text>
                ) : null,
              )}
              {series.map((s, k) => (
                <g key={k} className={`ld-chart__series ld-chart__series--${k % 4}`}>
                  <path className="ld-chart__line" d={linePath(s.values.map((v, i) => [x(i), v === null ? null : y(v)]))} />
                  {labels.length <= MAX_MARKERS && (
                    <g className="ld-chart__points">{s.values.map((v, i) => (v === null ? null : <g key={i}>{marker(k % 4, x(i), y(v))}</g>))}</g>
                  )}
                  {series.length > 1 && ends[k] && (
                    <text className="ld-chart__label" x={x(ends[k]!.lastIndex) + 8} y={labelYs[k]} dy="0.35em">{s.name}</text>
                  )}
                </g>
              ))}
            </g>
          </>
        );
      }}
    </ChartFrame>
  );
}
