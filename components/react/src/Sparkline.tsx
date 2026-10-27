import type { HTMLAttributes } from "react";
import { valueFormat } from "./ChartFrame.js";
import { extremes, linePath, linearScale } from "./chart-scale.js";
import { cx } from "./cx.js";

export interface SparklineProps extends HTMLAttributes<HTMLSpanElement> {
  values: readonly (number | null)[];
  /** What it measures, over what: "Build time, last 14 days". The range and the
   *  latest value are added to the accessible name. */
  label: string;
  unit?: string;
  format?: (value: number) => string;
  /** Print the latest value after the line. Default true. */
  showValue?: boolean;
  width?: number;
  height?: number;
}

/** A word-sized trend for a table cell or a stat. It has no axis, so it scales to
 *  its own range to show shape, and it states the numbers instead: the latest
 *  value beside it, and first, last, low and high in its name. */
export function Sparkline({ values, label, unit, format, showValue = true, width = 96, height = 24, className, ...rest }: SparklineProps) {
  const fmt = valueFormat(unit, format);
  const e = extremes(values);
  const x = linearScale([0, Math.max(1, values.length - 1)], [3, width - 3]);
  const y = linearScale(e ? [e.min, e.max] : [0, 1], [height - 3, 3]);
  const name = e ? `${label}: ${fmt(e.first)} to ${fmt(e.last)}, low ${fmt(e.min)}, high ${fmt(e.max)}` : `${label}: no data`;
  return (
    <span className={cx("ld-sparkline", className)} {...rest}>
      <svg className="ld-sparkline__svg" role="img" aria-label={name} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path className="ld-sparkline__line" d={linePath(values.map((v, i) => [x(i), v === null ? null : y(v)]))} />
        {e && <circle className="ld-sparkline__dot" cx={x(e.lastIndex)} cy={y(e.last)} r={2.5} />}
      </svg>
      {showValue && e && (
        <span className="ld-sparkline__value" aria-hidden="true">
          {fmt(e.last)}
        </span>
      )}
    </span>
  );
}
