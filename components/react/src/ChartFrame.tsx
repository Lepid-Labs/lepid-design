import { useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "./cx.js";
import { formatTick, type NiceScale } from "./chart-scale.js";

/** Props every chart shares. */
export interface ChartBaseProps {
  /** The takeaway, shown as the caption and used as the chart's name:
   *  "Builds got 40% faster after the cache", not "Build time". */
  title: ReactNode;
  /** What the chart shows, for screen readers (`<desc>`). Default: a summary of the data. */
  description?: string;
  /** Unit after values in labels and the data table: "ms", "%", " runs". */
  unit?: string;
  /** Value-axis label, shown above the axis. Name the measure and its unit. */
  yLabel?: string;
  /** Category-axis label, under the chart, and the first column of the data table. */
  xLabel?: string;
  /** Plot height in px. Default 240. */
  height?: number;
  /** Value formatting for labels and the data table. Default: locale digits + `unit`. */
  format?: (value: number) => string;
  /** The toggle that reveals the data table. Default "Show data". */
  dataLabel?: string;
  className?: string;
}

export const CHAR_W = 7; // approximate px per character of the 11–12px chart text, for layout

export function valueFormat(unit = "", format?: (v: number) => string) {
  return format ?? ((v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit}`);
}

/** Measured width of the figure, so text stays at its real size at any width. */
function useWidth(fallback = 560) {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(160, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

interface FrameProps {
  title: ReactNode;
  description: string;
  height: number;
  xLabel?: string;
  dataLabel?: string;
  className?: string;
  /** The fallback table's header cells and rows (strings, already formatted). */
  table: { head: string[]; rows: string[][] };
  children: (width: number) => ReactNode;
}

/** `<figure>`: the caption, an `role="img"` SVG named by the caption and described
 *  by `<desc>`, and a `<details>` data table for anyone who can't (or would rather
 *  not) read the picture. */
export function ChartFrame({ title, description, height, xLabel, dataLabel = "Show data", className, table, children }: FrameProps) {
  const [ref, width] = useWidth();
  const id = useId();
  return (
    <figure ref={ref} className={cx("ld-chart", className)}>
      <figcaption className="ld-chart__title" id={`${id}t`}>
        {title}
      </figcaption>
      <svg className="ld-chart__svg" role="img" aria-labelledby={`${id}t`} aria-describedby={`${id}d`} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <desc id={`${id}d`}>{description}</desc>
        {children(width)}
      </svg>
      {xLabel && <p className="ld-chart__axis-label ld-chart__axis-label--x" aria-hidden="true">{xLabel}</p>}
      <details className="ld-chart__data">
        <summary>{dataLabel}</summary>
        <table className="ld-table ld-table--compact">
          <thead>
            <tr>{table.head.map((h, i) => <th key={i} scope="col" className={i ? "ld-num" : undefined}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r}>{row.map((c, i) => (i ? <td key={i} className="ld-num">{c}</td> : <th key={i} scope="row">{c}</th>))}</tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Left margin that fits the longest tick label. */
export const axisWidth = (scale: NiceScale) => 12 + Math.max(...scale.ticks.map((t) => formatTick(t, scale.step).length)) * CHAR_W;

interface YAxisProps {
  scale: NiceScale;
  y: (v: number) => number;
  left: number;
  right: number;
  label?: string;
}

/** Value axis: faint gridlines on the nice ticks, their labels, the zero line drawn
 *  heavier, the axis label above, and a zigzag break when the axis skips zero. */
export function YAxis({ scale, y, left, right, label }: YAxisProps) {
  const bottom = y(scale.domain[0]);
  return (
    <g className="ld-chart__axis" aria-hidden="true">
      {label && <text className="ld-chart__axis-label" x={0} y={10}>{label}</text>}
      {scale.ticks.map((t) => (
        <g key={t}>
          <line className={t === 0 ? "ld-chart__baseline" : "ld-chart__grid"} x1={left} x2={right} y1={y(t)} y2={y(t)} />
          <text className="ld-chart__tick" x={left - 8} y={y(t)} dy="0.35em" textAnchor="end">{formatTick(t, scale.step)}</text>
        </g>
      ))}
      {scale.broken && (
        <>
          <line className="ld-chart__axis-line" x1={left} x2={left} y1={y(scale.domain[1])} y2={bottom} />
          <path className="ld-chart__break" d={`M${left - 6},${bottom - 6}l3,-3l6,6l3,-3M${left - 6},${bottom - 12}l3,-3l6,6l3,-3`} />
        </>
      )}
    </g>
  );
}
