// No-build demo of Slider, RangeSlider, DateField, ColorField and FileUpload. It
// drives plain markup with the same pure helpers the React components use (built
// into ui/ by the Pages workflow; locally, symlink site/ui to components/react/dist
// after a build). Drag and drop and swipe actions are in sortable-demo.js.
import { clampRange, rangeFraction, rangeTopThumb, snapToStep } from "./ui/range.js";
import { addDays, DATE_PRESETS, dateInRange, localISODate, presetValue, typedToISO } from "./ui/date-presets.js";
import { applyMask, MASKS } from "./ui/mask.js";
import { contrastGrade, contrastRatio, formatContrast, normalizeHex } from "./ui/color.js";
import { dragMayAccept, fileProblem, formatBytes, timeLeft } from "./ui/upload-files.js";

const $ = (id) => document.getElementById(id);
const fmt = (unit, v) => (unit === "$" ? `$${v.toLocaleString("en-US")}` : `${v}${unit ?? ""}`);
const invalid = (el, on) => (on ? el.setAttribute("aria-invalid", "true") : el.removeAttribute("aria-invalid"));
const bounds = (input) => ({ min: Number(input.min || 0), max: Number(input.max || 100), step: Number(input.step || 1) });

// ticks and labels from data attributes: data-ticks="10" every 10, data-marks="0:0%|100:100%"
function scale(root, { min, max }) {
  const track = root.querySelector(".ld-slider__track");
  const every = Number(root.dataset.ticks);
  if (every) {
    const ticks = Array.from({ length: Math.floor((max - min) / every) + 1 }, (_, i) => `<span class="ld-slider__tick" style="--ld-at:${(i * every) / (max - min)}"></span>`);
    track.insertAdjacentHTML("beforeend", `<span class="ld-slider__ticks" aria-hidden="true">${ticks.join("")}</span>`);
  }
  if (root.dataset.marks) {
    const marks = root.dataset.marks.split("|").map((m) => m.split(":")).map(([v, label]) => `<span class="ld-slider__mark" style="--ld-at:${rangeFraction(Number(v), min, max)}">${label}</span>`);
    track.insertAdjacentHTML("beforeend", `<span class="ld-slider__marks" aria-hidden="true">${marks.join("")}</span>`);
  }
}
// the number box: commits while valid, snaps what is left on blur or Enter
function numberBox(box, read, commit) {
  box.addEventListener("input", () => box.value !== "" && box.validity.valid && commit(Number(box.value)));
  const settle = () => (commit(snapToStep(box.value === "" ? read() : Number(box.value), bounds(box))), (box.value = read()));
  box.addEventListener("change", settle);
  box.addEventListener("keydown", (e) => e.key === "Enter" && settle());
}

for (const root of document.querySelectorAll("[data-slider]")) {
  const range = root.querySelector(".ld-range");
  const box = root.querySelector(".ld-slider__input");
  const bubble = root.querySelector(".ld-slider__bubble");
  const b = bounds(range);
  const paint = () => {
    const f = rangeFraction(Number(range.value), b.min, b.max);
    root.style.setProperty("--ld-range-fill", f);
    bubble.style.setProperty("--ld-at", f);
    bubble.textContent = fmt(root.dataset.unit, Number(range.value));
    range.setAttribute("aria-valuetext", bubble.textContent);
    if (document.activeElement !== box) box.value = range.value;
  };
  scale(root, b);
  range.addEventListener("input", paint);
  numberBox(box, () => range.value, (v) => ((range.value = v), paint()));
  paint();
}

for (const root of document.querySelectorAll("[data-range]")) {
  const thumbs = [...root.querySelectorAll(".ld-range")];
  const boxes = [...root.querySelectorAll(".ld-slider__input")];
  const bubbles = [...root.querySelectorAll(".ld-slider__bubble")];
  const b = bounds(thumbs[0]);
  const gap = Number(root.dataset.gap || 0);
  const value = () => thumbs.map((t) => Number(t.value));
  const set = (thumb, v) => {
    clampRange(value(), thumb, v, b, gap).forEach((x, i) => (thumbs[i].value = x));
    paint();
  };
  const paint = () => {
    const v = value();
    v.forEach((x, i) => {
      const f = rangeFraction(x, b.min, b.max);
      root.style.setProperty(i ? "--ld-range-hi" : "--ld-range-lo", f);
      bubbles[i].style.setProperty("--ld-at", f);
      bubbles[i].textContent = fmt(root.dataset.unit, x);
      thumbs[i].setAttribute("aria-valuetext", bubbles[i].textContent);
      thumbs[i].toggleAttribute("data-ld-top", rangeTopThumb(v, b.min, b.max) === i);
      if (document.activeElement !== boxes[i]) boxes[i].value = x;
    });
  };
  scale(root, b);
  thumbs.forEach((t, i) => t.addEventListener("input", () => set(i, Number(t.value))));
  boxes.forEach((box, i) => numberBox(box, () => thumbs[i].value, (v) => set(i, v)));
  paint();
}

// Dates: preset chips set the native input; the range check speaks in words
const today = localISODate();
const readable = (iso) => new Date(`${iso}T00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });
for (const root of document.querySelectorAll("[data-date]")) {
  const input = root.querySelector(".ld-date__input");
  const message = root.querySelector(".ld-field__message");
  const presets = root.querySelector(".ld-date__presets");
  if (root.dataset.maxDays) Object.assign(input, { min: today, max: addDays(today, Number(root.dataset.maxDays)) });
  const lo = input.min.slice(0, 10) || undefined;
  const hi = input.max.slice(0, 10) || undefined;
  const chips = root.dataset.presets.split(" ").map((key) => {
    const chip = Object.assign(document.createElement("button"), { type: "button", className: "ld-chip", textContent: DATE_PRESETS[key].label });
    const date = DATE_PRESETS[key].resolve(today);
    chip.disabled = !dateInRange(date, lo, hi);
    chip.addEventListener("click", () => ((input.value = presetValue(date, input.type, input.value)), paint()));
    presets.append(chip);
    return { chip, date };
  });
  const paint = () => {
    const day = input.value.slice(0, 10);
    for (const { chip, date } of chips) chip.setAttribute("aria-pressed", String(day === date));
    const error = day && !dateInRange(day, lo, hi) ? (lo && day < lo ? `Pick ${readable(lo)} or later.` : `Pick ${readable(hi)} or earlier.`) : "";
    message.textContent = error;
    message.classList.toggle("ld-field__message--error", !!error);
    invalid(input, !!error);
  };
  input.addEventListener("input", paint);
  paint();
}
// typed entry: the date mask, then a real-date check once all eight digits are in
const dob = $("dob");
dob.addEventListener("input", () => {
  const next = applyMask(dob.value, MASKS.date, dob.selectionStart ?? dob.value.length);
  dob.value = next.value;
  dob.setSelectionRange(next.caret, next.caret);
  const bad = next.raw.length === 8 && !typedToISO(next.raw);
  $("dob-message").textContent = bad ? `Enter a real date, like 03/15/${today.slice(0, 4)}.` : "";
  $("dob-message").classList.toggle("ld-field__message--error", bad);
  invalid(dob, bad);
});

// Colour: swatches, system picker, hex field and a live contrast check on the surface
const SWATCHES = [["#c6a5ff", "Orchid"], ["#00f5ff", "Teal"], ["#39ff14", "Neon green"], ["#ffb86c", "Amber"], ["#ff4d6d", "Rose"], ["#4500d9", "Violet"], ["#006492", "Deep sky"], ["#767676", "Grey"]];
const color = $("color");
const picker = color.querySelector(".ld-color__picker");
const hex = color.querySelector(".ld-color__hex");
const colorMessage = $("color-message");
color.querySelector(".ld-swatches").innerHTML = SWATCHES.map(([v, name]) => `<label class="ld-swatch" style="--ld-swatch:${v}" title="${name}">
  <input type="radio" class="ld-swatch__input" name="swatch" value="${v}" aria-label="${name}"><span class="ld-swatch__chip" aria-hidden="true"></span></label>`).join("");
let current = SWATCHES[0][0];
const paintColor = () => {
  color.style.setProperty("--ld-swatch", current);
  picker.value = current;
  if (document.activeElement !== hex) hex.value = current;
  for (const r of color.querySelectorAll(".ld-swatch__input")) r.checked = r.value === current;
  const surface = normalizeHex(getComputedStyle(color).getPropertyValue("--ld-surface"));
  const badge = color.querySelector(".ld-color__contrast");
  if (!surface) return (badge.textContent = "");
  const ratio = contrastRatio(current, surface);
  const grade = contrastGrade(ratio);
  badge.dataset.ldContrast = grade === "fail" ? "fail" : grade === "AA large" ? "large" : "pass";
  badge.innerHTML = `${formatContrast(ratio)} ${{ AAA: "AAA", AA: "AA", "AA large": "Large text only", fail: "Fails" }[grade]}<span class="sr-only"> against the surface</span>`;
};
const choose = (v) => ((current = v), paintColor());
color.addEventListener("change", (e) => e.target.matches(".ld-swatch__input") && choose(e.target.value));
picker.addEventListener("input", () => choose(picker.value));
const commitHex = () => {
  const v = normalizeHex(hex.value);
  colorMessage.textContent = v ? "" : "Use a hex code: # and 3 or 6 digits from 0–9 and a–f, like #3366ff.";
  colorMessage.classList.toggle("ld-field__message--error", !v);
  invalid(hex, !v);
  if (v) (choose(v), (hex.value = v));
};
hex.addEventListener("input", () => {
  const v = normalizeHex(hex.value);
  if (v && hex.value.replace("#", "").trim().length === 6) choose(v);
});
hex.addEventListener("blur", commitHex);
hex.addEventListener("keydown", (e) => e.key === "Enter" && commitHex());
new MutationObserver(paintColor).observe(document.documentElement, { attributes: true, attributeFilter: ["data-ld-style"] });
paintColor();

// Upload: a fake transfer at ~1 MB/s; the checkbox fails the next one at 90%
const upload = $("upload");
const zone = upload.querySelector(".ld-dropzone");
const fileInput = upload.querySelector(".ld-dropzone__input");
const list = upload.querySelector(".ld-upload-list");
const said = upload.querySelector('[role="status"]');
const RULES = { accept: fileInput.accept, maxSize: 5_000_000, acceptLabel: "images or PDFs" };
const kind = (f) => (f.name.includes(".") ? f.name.split(".").pop().toUpperCase() : "FILE");
const prompt = zone.querySelector(".ld-dropzone__prompt");
const setDrag = (state) => {
  if (state) zone.dataset.ldDrag = state;
  else delete zone.dataset.ldDrag;
  prompt.textContent = state === "invalid" ? "That file type isn't accepted" : state ? "Drop to upload" : "Drop files here or browse";
};
function addFile(file) {
  const error = fileProblem(file, RULES);
  const row = document.createElement("li");
  row.className = "ld-upload";
  const preview = !error && file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
  row.innerHTML = `<span class="ld-upload__thumb" aria-hidden="true">${preview ? `<img src="${preview}" alt="">` : kind(file)}</span>
    <span class="ld-upload__name"></span><span class="ld-upload__size">${kind(file)} · ${formatBytes(file.size)}</span>
    <span class="ld-upload__status"></span><span class="ld-upload__actions"></span>`;
  row.querySelector(".ld-upload__name").textContent = file.name;
  const status = row.querySelector(".ld-upload__status");
  const actions = row.querySelector(".ld-upload__actions");
  let timer;
  const remove = () => (clearInterval(timer), URL.revokeObjectURL(preview), row.remove(), (said.textContent = `${file.name} removed.`), fileInput.focus());
  const buttons = (retry, removeLabel) => {
    actions.innerHTML = `${retry ? `<button type="button" class="ld-btn ld-btn--sm" aria-label="Retry ${file.name}">Retry</button>` : ""}
      <button type="button" class="ld-icon-btn" aria-label="${removeLabel} ${file.name}" title="${removeLabel}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg></button>`;
    actions.querySelector(".ld-icon-btn").addEventListener("click", remove);
    actions.querySelector(".ld-btn")?.addEventListener("click", start);
  };
  function start() {
    const fail = $("upload-fail").checked;
    $("upload-fail").checked = false;
    const began = Date.now();
    const size = Math.max(file.size, 300_000); // tiny files still show a moment of progress
    let sent = 0;
    row.dataset.ldUpload = "uploading";
    row.insertAdjacentHTML("beforeend", `<div class="ld-progress ld-upload__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Uploading ${file.name}"><div class="ld-progress__bar"></div></div>`);
    const bar = row.querySelector(".ld-upload__progress");
    buttons(false, "Cancel");
    clearInterval(timer);
    timer = setInterval(() => {
      sent = Math.min(size, sent + 100_000);
      const pct = Math.round((sent / size) * 100);
      bar.firstElementChild.style.width = `${pct}%`;
      bar.setAttribute("aria-valuenow", pct);
      status.textContent = [`${pct}%`, timeLeft(sent, size, Date.now() - began)].filter(Boolean).join(" · ");
      if (fail && pct >= 90) return end("The connection dropped.");
      if (sent >= size) end();
    }, 100);
  }
  function end(error) {
    clearInterval(timer);
    row.querySelector(".ld-upload__progress")?.remove();
    row.dataset.ldUpload = error ? "error" : "done";
    status.textContent = error ?? "Uploaded";
    said.textContent = error ? `${file.name} didn't upload: ${error} Retry is available.` : `${file.name} uploaded.`;
    buttons(!!error, "Remove");
  }
  list.append(row);
  if (error) {
    row.dataset.ldUpload = "error";
    status.textContent = error;
    buttons(false, "Remove");
    return error;
  }
  start();
}
const addFiles = (files) => {
  const errors = [...files].map(addFile).filter(Boolean);
  said.textContent = errors.length ? errors.join(" ") : `Uploading ${files.length === 1 ? files[0].name : `${files.length} files`}.`;
};
fileInput.addEventListener("change", () => (addFiles(fileInput.files), (fileInput.value = "")));
const over = (e) => {
  if (!e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
  setDrag(dragMayAccept([...e.dataTransfer.items].map((i) => i.type), RULES.accept) ? "over" : "invalid");
};
zone.addEventListener("dragenter", over);
zone.addEventListener("dragover", over);
zone.addEventListener("dragleave", (e) => !zone.contains(e.relatedTarget) && setDrag());
zone.addEventListener("drop", (e) => (e.preventDefault(), setDrag(), addFiles(e.dataTransfer.files)));
