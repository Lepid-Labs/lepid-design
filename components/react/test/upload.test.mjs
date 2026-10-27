// Accept and size checks, sizes and time left behind FileUpload.
import assert from "node:assert/strict";
import { test } from "node:test";
import { dragMayAccept, fileProblem, formatBytes, matchesAccept, timeLeft } from "../src/upload-files.ts";

const MB = 1_000_000;
const png = { name: "Photo.PNG", type: "image/png", size: 2 * MB };
const pdf = { name: "report.pdf", type: "application/pdf", size: 400_000 };
const exe = { name: "setup.exe", type: "application/x-msdownload", size: 9 * MB };

test("matchesAccept: extensions, MIME types and wildcards, case-blind", () => {
  assert.ok(matchesAccept(png, "image/*"));
  assert.ok(matchesAccept(png, ".png"));
  assert.ok(matchesAccept(pdf, "image/*, application/pdf"));
  assert.ok(matchesAccept(pdf, ".jpg,.PDF"));
  assert.ok(!matchesAccept(exe, "image/*,.pdf"));
  assert.ok(matchesAccept(exe, ""));
  assert.ok(matchesAccept(exe));
  assert.ok(!matchesAccept({ name: "notes", type: "" }, "image/*")); // an unknown type matches no MIME token
  assert.ok(!matchesAccept({ name: "image.txt", type: "text/plain" }, "image/*"));
});

test("dragMayAccept: only says invalid when every dragged type is known to fail", () => {
  assert.ok(dragMayAccept(["image/png"], "image/*"));
  assert.ok(!dragMayAccept(["application/zip"], "image/*"));
  assert.ok(dragMayAccept(["application/zip", "image/jpeg"], "image/*"));
  assert.ok(dragMayAccept(["application/zip"], "image/*,.pdf")); // names unknown until the drop
  assert.ok(dragMayAccept([""], "image/*"));
  assert.ok(dragMayAccept([], "image/*"));
  assert.ok(dragMayAccept(["application/zip"]));
});

test("formatBytes", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(940), "940 B");
  assert.equal(formatBytes(1500), "1.5 KB");
  assert.equal(formatBytes(12_400), "12 KB");
  assert.equal(formatBytes(3_420_000), "3.4 MB");
  assert.equal(formatBytes(10 * MB), "10 MB");
  assert.equal(formatBytes(2.5e12), "2.5 TB");
});

test("fileProblem: type, then size, then empty, in plain words", () => {
  const rules = { accept: "image/*,.pdf", maxSize: 5 * MB, acceptLabel: "images or PDFs" };
  assert.equal(fileProblem(png, rules), undefined);
  assert.equal(fileProblem(exe, rules), "setup.exe isn't a file type this accepts. Use images or PDFs.");
  assert.equal(fileProblem(exe, { accept: ".pdf" }), "setup.exe isn't a file type this accepts. Use .pdf.");
  assert.equal(fileProblem({ ...png, size: 14 * MB }, rules), "Photo.PNG is 14 MB; the limit is 5 MB.");
  assert.equal(fileProblem({ ...pdf, size: 0 }, rules), "report.pdf is empty.");
});

test("timeLeft: only once the rate means something", () => {
  assert.equal(timeLeft(10, 100, 500), undefined);
  assert.equal(timeLeft(0, 100, 3000), undefined);
  assert.equal(timeLeft(100, 100, 3000), undefined);
  assert.equal(timeLeft(25, 100, 2000), "6 s left");
  assert.equal(timeLeft(10, 100, 10_000), "2 min left");
});
