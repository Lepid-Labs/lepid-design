// No-build chart gallery: draws the same markup as BarChart, LineChart and
// Sparkline from the same pure scale helpers (ui/chart-scale.js), at the
// container's measured width so the text stays its real size.
import {
  bandLayout, barExtent, extremes, formatTick, labelEvery, linePath, linearScale, niceScale, spreadLabels,
} from "./ui/chart-scale.js";

const CHAR_W = 7;
const TOP = 28;
const BOTTOM = 24;
let seq = 0;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const num = (unit = "") => (v) => `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit}`;

function yAxis(scale, y, left, right, label) {
  const bottom = y(scale.domain[0]);
  let g = `<g class="ld-chart__axis" aria-hidden="true">${label ? `<text class="ld-chart__axis-label" x="0" y="10">${esc(label)}</text>` : ""}`;
  for (const t of scale.ticks) {
    g += `<line class="${t === 0 ? "ld-chart__baseline" : "ld-chart__grid"}" x1="${left}" x2="${right}" y1="${y(t)}" y2="${y(t)}"/>`;
    g += `<text class="ld-chart__tick" x="${left - 8}" y="${y(t)}" dy="0.35em" text-anchor="end">${formatTick(t, scale.step)}</text>`;
  }
  if (scale.broken) {
    g += `<line class="ld-chart__axis-line" x1="${left}" x2="${left}" y1="${y(scale.domain[1])}" y2="${bottom}"/>`;
    g += `<path class="ld-chart__break" d="M${left - 6},${bottom - 6}l3,-3l6,6l3,-3M${left - 6},${bottom - 12}l3,-3l6,6l3,-3"/>`;
  }
  return `${g}</g>`;
}

function frame(host, { kind, title, description, height = 240, xLabel, table }, draw) {
  const id = `chart${++seq}`;
  let drawn;
  const paint = () => {
    const width = Math.max(160, Math.round(host.clientWidth));
    if (width === drawn) return; // opening "Show data" changes only the height
    drawn = width;
    const open = host.querySelector("details")?.open ? " open" : "";
    host.innerHTML = `<figure class="ld-chart ld-chart--${kind}">
      <figcaption class="ld-chart__title" id="${id}t">${esc(title)}</figcaption>
      <svg class="ld-chart__svg" role="img" aria-labelledby="${id}t" aria-describedby="${id}d" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <desc id="${id}d">${esc(description)}</desc>${draw(width, height)}</svg>
      ${xLabel ? `<p class="ld-chart__axis-label ld-chart__axis-label--x" aria-hidden="true">${esc(xLabel)}</p>` : ""}
      <details class="ld-chart__data"${open}><summary>Show data</summary><table class="ld-table ld-table--compact">
        <thead><tr>${table.head.map((h, i) => `<th scope="col"${i ? ' class="ld-num"' : ""}>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>${table.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td class="ld-num">${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join("")}</tr>`).join("")}</tbody>
      </table></details></figure>`;
  };
  new ResizeObserver(paint).observe(host);
}

function barChart(host, { data, highlight, unit, yLabel, xLabel, ...rest }) {
  const fmt = num(unit);
  const scale = niceScale(data.map((d) => d.value));
  const left = 12 + Math.max(...scale.ticks.map((t) => formatTick(t, scale.step).length)) * CHAR_W;
  const e = extremes(data.map((d) => d.value));
  const description = `${data.length} bars. Highest: ${data[e.maxIndex].label}, ${fmt(e.max)}. Lowest: ${data[e.minIndex].label}, ${fmt(e.min)}.`;
  const table = { head: [xLabel ?? "Category", yLabel ?? "Value"], rows: data.map((d) => [d.label, fmt(d.value)]) };
  frame(host, { kind: "bar", description, xLabel, table, ...rest }, (width, height) => {
    const y = linearScale(scale.domain, [height - BOTTOM, TOP]);
    const { bands, band, width: w } = bandLayout(data.length, [left, width - 8]);
    const every = labelEvery(band, Math.max(...data.map((d) => d.label.length)) * CHAR_W + 8);
    const fits = band >= Math.max(...data.map((d) => fmt(d.value).length)) * CHAR_W + 4;
    let g = yAxis(scale, y, left, width - 8, yLabel ?? unit?.trim()) + `<g aria-hidden="true">`;
    data.forEach((d, i) => {
      const bar = barExtent(d.value, y);
      const lit = d.label === highlight ? "--highlight" : "";
      g += `<g class="ld-chart__bar-group${lit ? " ld-chart__bar-group--highlight" : ""}"><rect class="ld-chart__bar${lit ? " ld-chart__bar--highlight" : ""}" x="${bands[i].x}" y="${bar.y}" width="${w}" height="${bar.height}"/>`;
      if (fits) g += `<text class="ld-chart__value" x="${bands[i].center}" y="${d.value < 0 ? bar.y + bar.height + 12 : bar.y - 5}" text-anchor="middle">${fmt(d.value)}</text>`;
      if (i % every === 0) g += `<text class="ld-chart__tick ld-chart__tick--x" x="${bands[i].center}" y="${height - 6}" text-anchor="middle">${esc(d.label)}</text>`;
      g += "</g>";
    });
    return `${g}</g>`;
  });
}

const MARKERS = [
  (x, y) => `<circle cx="${x}" cy="${y}" r="3"/>`,
  (x, y) => `<rect x="${x - 3}" y="${y - 3}" width="6" height="6"/>`,
  (x, y) => `<path d="M${x},${y - 4}l4,4l-4,4l-4,-4z"/>`,
  (x, y) => `<path d="M${x},${y - 4}l4,7h-8z"/>`,
];

function lineChart(host, { labels, series, zero = true, unit, yLabel, xLabel, ...rest }) {
  const fmt = num(unit);
  const scale = niceScale(series.flatMap((s) => s.values), { zero });
  const left = 12 + Math.max(...scale.ticks.map((t) => formatTick(t, scale.step).length)) * CHAR_W;
  const right = series.length > 1 ? 16 + Math.max(...series.map((s) => s.name.length)) * CHAR_W : 16;
  const ends = series.map((s) => extremes(s.values));
  const description = series.map((s, k) => {
    const e = ends[k];
    return `${s.name}: ${fmt(e.first)} to ${fmt(e.last)}, high ${fmt(e.max)} (${labels[e.maxIndex]}), low ${fmt(e.min)} (${labels[e.minIndex]}).`;
  }).join(" ") + (scale.broken ? ` The value axis starts at ${fmt(scale.domain[0])}, not zero.` : "");
  const table = { head: [xLabel ?? "Label", ...series.map((s) => s.name)], rows: labels.map((l, i) => [l, ...series.map((s) => (s.values[i] == null ? "–" : fmt(s.values[i])))]) };
  frame(host, { kind: "line", description, xLabel, table, ...rest }, (width, height) => {
    const y = linearScale(scale.domain, [height - BOTTOM, TOP]);
    const x = linearScale([0, Math.max(1, labels.length - 1)], [left + 4, width - right]);
    const every = labelEvery((width - right - left) / Math.max(1, labels.length - 1), Math.max(...labels.map((l) => l.length)) * CHAR_W + 8);
    const labelYs = spreadLabels(ends.map((e) => y(e.last)), 14, [TOP, height - BOTTOM]);
    let g = yAxis(scale, y, left, width - right, yLabel ?? unit?.trim()) + `<g aria-hidden="true">`;
    labels.forEach((l, i) => i % every === 0 && (g += `<text class="ld-chart__tick ld-chart__tick--x" x="${x(i)}" y="${height - 6}" text-anchor="middle">${esc(l)}</text>`));
    series.forEach((s, k) => {
      g += `<g class="ld-chart__series ld-chart__series--${k % 4}"><path class="ld-chart__line" d="${linePath(s.values.map((v, i) => [x(i), v === null ? null : y(v)]))}"/>`;
      if (labels.length <= 24) g += `<g class="ld-chart__points">${s.values.map((v, i) => (v === null ? "" : MARKERS[k % 4](x(i), y(v)))).join("")}</g>`;
      if (series.length > 1) g += `<text class="ld-chart__label" x="${x(ends[k].lastIndex) + 8}" y="${labelYs[k]}" dy="0.35em">${esc(s.name)}</text>`;
      g += "</g>";
    });
    return `${g}</g>`;
  });
}

function sparkline(values, label, unit) {
  const fmt = num(unit);
  const [w, h] = [96, 24];
  const e = extremes(values);
  const x = linearScale([0, values.length - 1], [3, w - 3]);
  const y = linearScale([e.min, e.max], [h - 3, 3]);
  const name = `${label}: ${fmt(e.first)} to ${fmt(e.last)}, low ${fmt(e.min)}, high ${fmt(e.max)}`;
  return `<span class="ld-sparkline"><svg class="ld-sparkline__svg" role="img" aria-label="${esc(name)}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <path class="ld-sparkline__line" d="${linePath(values.map((v, i) => [x(i), y(v)]))}"/><circle class="ld-sparkline__dot" cx="${x(e.lastIndex)}" cy="${y(e.last)}" r="2.5"/></svg>
    <span class="ld-sparkline__value" aria-hidden="true">${fmt(e.last)}</span></span>`;
}

barChart(document.getElementById("chart-deploys"), {
  title: "Deploys peak on Tuesday and stop for the weekend",
  data: [["Mon", 18], ["Tue", 31], ["Wed", 24], ["Thu", 22], ["Fri", 9], ["Sat", 2], ["Sun", 1]].map(([label, value]) => ({ label, value })),
  highlight: "Tue",
  yLabel: "Deploys per day",
  xLabel: "Weekday, last 4 weeks",
});
const weeks = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);
lineChart(document.getElementById("chart-builds"), {
  title: "The build cache halved p95 build time from week 6",
  labels: weeks,
  series: [
    { name: "p95", values: [14.2, 13.8, 14.9, 15.1, 14.4, 9.6, 7.8, 7.2, null, 7.4, 6.9, 7.1] },
    { name: "p50", values: [6.1, 6.0, 6.4, 6.3, 6.2, 4.4, 3.9, 3.7, null, 3.8, 3.6, 3.6] },
  ],
  unit: " min",
  yLabel: "Build time (min)",
});
lineChart(document.getElementById("chart-uptime"), {
  title: "Uptime held above 99.5% all quarter",
  labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  series: [{ name: "Uptime", values: [99.92, 99.71, 99.58, 99.95, 99.88, 99.97] }],
  zero: false,
  unit: "%",
  yLabel: "Monthly uptime (%), axis from 99.5",
});
const SPARKS = {
  "web-frontend": [4.1, 4.3, 4.0, 4.6, 4.4, 4.2, 4.9, 5.1, 4.8, 4.7, 5.3, 5.0, 5.4, 5.6],
  "api-gateway": [2.2, 2.1, 2.4, 2.0, 2.2, 2.3, 2.1, 1.9, 2.0, 1.8, 1.9, 1.7, 1.8, 1.6],
  billing: [8.4, 8.1, 8.6, 9.2, 8.8, 8.7, 8.9, 8.5, 8.6, 8.4, 8.8, 8.7, 8.5, 8.6],
};
document.getElementById("sparks").innerHTML = Object.entries(SPARKS)
  .map(([p, v]) => `<tr><th scope="row">${p}</th><td>${sparkline(v, `${p} build time, last 14 runs`, " min")}</td></tr>`)
  .join("");
