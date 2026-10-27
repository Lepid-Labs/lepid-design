// Direct-manipulation slice: sliders, pickers, file upload, drag-and-drop and swipe.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT, themeDirs, cssRules, contrast } from "./helpers.mjs";

test("every theme carries the direct-manipulation contract", () => {
  // Slider / RangeSlider, DateField, ColorField, FileUpload, SortableList /
  // SortableBoard and SwipeRow write the hooks below. Every theme must style each
  // one, give the range thumb a 44px-tall target and a fill from --ld-range-fill,
  // keep the dropzone's file input focusable, drag only from the handle, lift on an
  // elevation token (without growing or tilting under reduced motion), and leave
  // vertical scrolling to the browser on a swipe row.
  const PARTS = {
    slider: [
      ".ld-range", ".ld-range::-webkit-slider-runnable-track", ".ld-range::-moz-range-track", ".ld-range::-webkit-slider-thumb",
      ".ld-range::-moz-range-thumb", ".ld-range:focus-visible::-webkit-slider-thumb", ".ld-range:focus-visible::-moz-range-thumb",
      ".ld-range:disabled", ".ld-slider", ".ld-slider__header", ".ld-slider__input", ".ld-slider__pair", ".ld-slider__track",
      ".ld-slider__bubble", ".ld-slider__ticks", ".ld-slider__tick", ".ld-slider__marks", ".ld-slider__mark",
      ".ld-slider--range .ld-range", ".ld-slider--range .ld-range[data-ld-top]", ".ld-slider--range .ld-slider__track::before",
    ],
    picker: [
      ".ld-date__presets", '.ld-input[type="date"]', '.ld-input[type="datetime-local"]', ".ld-color", ".ld-swatches", ".ld-swatch",
      ".ld-swatch__input", ".ld-swatch__chip", ".ld-swatch:has(:checked) .ld-swatch__chip::after", ".ld-swatch:has(:focus-visible)",
      ".ld-color__row", ".ld-color__swatch", ".ld-color__picker", ".ld-color__picker:focus-visible", ".ld-color__hex",
      ".ld-color__preview", ".ld-color__sample", ".ld-color__contrast",
      ...["pass", "large", "fail"].map((g) => `.ld-color__contrast[data-ld-contrast="${g}"]`),
    ],
    dropzone: [
      ".ld-upload-field", ".ld-dropzone", ".ld-dropzone__input", ".ld-dropzone:has(.ld-dropzone__input:focus-visible)",
      '.ld-dropzone[data-ld-drag="over"]', '.ld-dropzone[data-ld-drag="invalid"]', ".ld-dropzone__icon", ".ld-dropzone__title",
      ".ld-dropzone__hint", ".ld-upload-list", ".ld-upload-list:empty", ".ld-upload", ".ld-upload__thumb", ".ld-upload__name",
      ".ld-upload__size", ".ld-upload__status", ".ld-upload__progress", ".ld-upload__actions",
      '.ld-upload[data-ld-upload="done"] .ld-upload__status', '.ld-upload[data-ld-upload="error"] .ld-upload__status',
    ],
    sortable: [
      ".ld-sortable", ".ld-sortable__item", ".ld-sortable__body", ".ld-drag-handle", ".ld-drag-handle:focus-visible",
      ".ld-sortable__item[data-ld-dragging]", '.ld-sortable__item[data-ld-dragging="pointer"]',
      '.ld-sortable__item[data-ld-drop="before"]::before', '.ld-sortable[data-ld-drop="end"]::after', ".ld-board",
      ".ld-board__column", ".ld-board__column:has([data-ld-drop-target])", ".ld-board__title", ".ld-board__count",
    ],
    swipe: [
      ".ld-swipe", ".ld-swipe__content", '.ld-swipe[data-ld-swipe="dragging"] .ld-swipe__content', ".ld-swipe__main",
      ".ld-swipe__actions", ".ld-swipe__actions--leading", ".ld-swipe__actions--trailing", ".ld-swipe__action",
      ".ld-swipe__action--danger", ".ld-swipe[data-ld-swipe-full] .ld-swipe__actions--trailing > :not(:last-child)",
    ],
  };
  const body = (rules, end, at) =>
    rules
      .filter((r) => r.selectors.some((s) => s.endsWith(end)) && (at ? r.at.some((p) => p.includes(at)) : r.at.length === 0))
      .map((r) => r.body)
      .join(";");
  for (const theme of themeDirs) {
    const rules = {};
    for (const [name, parts] of Object.entries(PARTS)) {
      const file = join(ROOT, theme, "components", `${name}.css`);
      assert.ok(existsSync(file), `${theme}: components/${name}.css missing`);
      rules[name] = cssRules(readFileSync(file, "utf-8"));
      const selectors = rules[name].flatMap((r) => r.selectors);
      for (const part of parts) {
        assert.ok(selectors.some((s) => s.endsWith(part)), `${theme}: ${name}.css never styles ${part}`);
      }
    }
    const { slider, dropzone, sortable, swipe } = rules;
    const rem = (css, token) => Number(css.match(new RegExp(`${token}:\\s*([\\d.]+)rem`))?.[1] ?? 0);
    const range = body(slider, ".ld-range");
    assert.ok(rem(range, "--ld-thumb-hit") >= 2.75, `${theme}: the range thumb's target is under 44px tall`);
    assert.ok(rem(range, "--ld-thumb") >= 1.5, `${theme}: the range thumb's target is under 24px wide`);
    assert.match(body(slider, ".ld-range::-webkit-slider-thumb"), /--ld-thumb-hit/, `${theme}: the thumb does not take the full target`);
    assert.match(body(slider, ".ld-range::-webkit-slider-runnable-track"), /var\(--ld-range-fill/, `${theme}: the track never fills`);
    assert.match(body(slider, ".ld-slider--range .ld-range"), /pointer-events:\s*none/, `${theme}: a range input's track takes presses`);
    assert.match(body(slider, ".ld-slider--range .ld-range::-webkit-slider-thumb"), /pointer-events:\s*auto/, `${theme}: range thumbs take no presses`);

    assert.doesNotMatch(body(dropzone, ".ld-dropzone__input"), /display:\s*none|visibility:\s*hidden/, `${theme}: the file input cannot take focus`);
    assert.match(body(dropzone, '.ld-dropzone[data-ld-drag="invalid"]'), /--ld-danger/, `${theme}: an invalid drag is not marked`);

    assert.match(body(sortable, ".ld-drag-handle"), /touch-action:\s*none/, `${theme}: dragging the handle scrolls the page`);
    assert.match(body(sortable, ".ld-sortable__item[data-ld-dragging]"), /box-shadow:[^;]*var\(--ld-elevation-\d\)/, `${theme}: the lift is not on an elevation token`);
    assert.match(body(sortable, ".ld-sortable__item[data-ld-dragging]", "prefers-reduced-motion"), /scale:\s*none[\s\S]*rotate:\s*none/, `${theme}: the lift grows or tilts under reduced motion`);
    assert.ok(body(sortable, '[data-ld-drop="before"]::before'), `${theme}: the drop line hides behind a media query`);

    assert.match(body(swipe, ".ld-swipe"), /touch-action:\s*pan-y/, `${theme}: a swipe row blocks vertical scrolling`);
    assert.match(body(swipe, ".ld-swipe__content"), /translate:\s*var\(--ld-swipe-x\)/, `${theme}: the row does not follow --ld-swipe-x`);
    assert.match(body(swipe, '[data-ld-swipe="dragging"] .ld-swipe__content'), /transition:\s*none/, `${theme}: the row lags the finger`);
    assert.match(body(swipe, ".ld-swipe__content", "prefers-reduced-motion"), /transition:\s*none/, `${theme}: the row springs under reduced motion`);
  }
});
