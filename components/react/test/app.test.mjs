// Pure logic behind the app kit: formatting, error messages, tags, path matching and line streams.
import assert from "node:assert/strict";
import { test } from "node:test";
import { errorMessage, formatDate, formatDuration, formatRelative, toDate } from "../src/format.ts";
import { addTags, parseTags } from "../src/tag-input.ts";
import { isPlainClick, matchPath, normalizePath, splitHref } from "../src/routing.ts";
import { lineParser, retryDelay } from "../src/line-stream.ts";

test("toDate / formatDate: a bare YYYY-MM-DD is that local day, never the UTC day before", () => {
  const d = toDate("2026-11-02");
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 10, 2, 0]);
  assert.equal(formatDate("2026-11-02", undefined, "en-US"), "Nov 2, 2026");
  assert.equal(formatDate("2026-11-02", { month: "long", day: "numeric" }, "en-US"), "November 2");
  assert.equal(toDate(0).getTime(), 0);
  assert.equal(toDate("2026-11-02T12:00:00Z").toISOString(), "2026-11-02T12:00:00.000Z");
});

test("formatRelative: the largest whole unit, either direction, 'now' under a minute", () => {
  const now = Date.UTC(2026, 10, 2, 12);
  const at = (s) => now + s * 1000;
  assert.equal(formatRelative(at(-30), now, "en"), "now");
  assert.equal(formatRelative(at(30), now, "en"), "now");
  assert.equal(formatRelative(at(-180), now, "en"), "3 minutes ago");
  assert.equal(formatRelative(at(-5399), now, "en"), "1 hour ago");
  assert.equal(formatRelative(at(7200), now, "en"), "in 2 hours");
  assert.equal(formatRelative(at(-86_400), now, "en"), "yesterday");
  assert.equal(formatRelative(at(-10 * 86_400), now, "en"), "last week");
  assert.equal(formatRelative(at(-400 * 86_400), now, "en"), "last year");
  assert.equal(formatRelative(new Date(at(-120)), new Date(now), "en"), "2 minutes ago");
});

test("formatDuration: two largest units, zero second unit dropped, seconds rounded", () => {
  assert.equal(formatDuration(0), "0 ms");
  assert.equal(formatDuration(450.4), "450 ms");
  assert.equal(formatDuration(999.6), "1 s");
  assert.equal(formatDuration(12_000), "12 s");
  assert.equal(formatDuration(59_600), "1 min");
  assert.equal(formatDuration(200_000), "3 min 20 s");
  assert.equal(formatDuration(7_205_000), "2 h");
  assert.equal(formatDuration(7_500_000), "2 h 5 min");
  assert.equal(formatDuration(3 * 86_400_000 + 4 * 3_600_000 + 59_000), "3 d 4 h");
  assert.equal(formatDuration(-5), "0 ms");
});

test("errorMessage: string, then message, then the fallback", () => {
  assert.equal(errorMessage(new Error("Disk full")), "Disk full");
  assert.equal(errorMessage("Timed out"), "Timed out");
  assert.equal(errorMessage({ message: "Conflict", status: 409 }), "Conflict");
  assert.equal(errorMessage(new Error("")), "Something went wrong.");
  assert.equal(errorMessage("  "), "Something went wrong.");
  assert.equal(errorMessage({ message: 42 }), "Something went wrong.");
  assert.equal(errorMessage(null), "Something went wrong.");
  assert.equal(errorMessage(undefined, "Could not save."), "Could not save.");
});

test("parseTags / addTags: split at commas and newlines, trim, dedupe case-blind keeping the first", () => {
  assert.deepEqual(parseTags(" a, b ,,c\nd \n"), ["a", "b", "c", "d"]);
  assert.deepEqual(parseTags(""), []);
  assert.deepEqual(addTags(["Rust"], "rust, Go, go, Zig"), ["Rust", "Go", "Zig"]);
  const tags = ["x"];
  addTags(tags, "y");
  assert.deepEqual(tags, ["x"], "never mutates");
});

test("normalizePath / splitHref: one path per route, the query apart", () => {
  assert.equal(normalizePath(""), "/");
  assert.equal(normalizePath("/"), "/");
  assert.equal(normalizePath("/books//"), "/books");
  assert.equal(normalizePath("books"), "/books");
  const { path, query } = splitHref("/books/?sort=title&q=a%20b");
  assert.equal(path, "/books");
  assert.equal(query.get("q"), "a b");
  assert.equal(splitHref("/").query.toString(), "");
});

test("matchPath: exact segments, decoded params, malformed escapes match nothing", () => {
  assert.deepEqual(matchPath("/books", "/books/"), {});
  assert.deepEqual(matchPath("/books/:id", "/books/7"), { id: "7" });
  assert.deepEqual(matchPath("/u/:user/repos/:repo", "/u/ada/repos/a%20b"), { user: "ada", repo: "a b" });
  assert.equal(matchPath("/books/:id", "/books"), null);
  assert.equal(matchPath("/books/:id", "/books/7/edit"), null);
  assert.equal(matchPath("/books", "/films"), null);
  assert.equal(matchPath("/books/:id", "/books/%E0"), null);
  assert.deepEqual(matchPath("/", ""), {});
});

test("isPlainClick: main button, no modifier, not already handled", () => {
  const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
  assert.ok(isPlainClick(plain));
  for (const k of ["metaKey", "ctrlKey", "shiftKey", "altKey", "defaultPrevented"]) assert.ok(!isPlainClick({ ...plain, [k]: true }), k);
  assert.ok(!isPlainClick({ ...plain, button: 1 }));
});

test("lineParser plain: every line, blank ones too, \\r\\n split across chunks counts once", () => {
  const p = lineParser(false);
  assert.deepEqual(p.push("one\r"), []);
  assert.deepEqual(p.push("\ntwo\n\nthr"), ["one", "two", ""]);
  assert.deepEqual(p.push("ee"), []);
  assert.deepEqual(p.flush(), ["three"]);
  assert.deepEqual(p.flush(), []);
});

test("lineParser SSE: data lines per event at its blank line; comments and fields skipped", () => {
  const p = lineParser(true);
  assert.deepEqual(p.push(": keepalive\n\nevent: log\nid: 4\ndata: first\n"), []);
  assert.deepEqual(p.push("data:second\n\n"), ["first", "second"]);
  assert.deepEqual(p.push("retry: 1000\n\n"), [], "an event with no data yields nothing");
  assert.deepEqual(p.push("data: tail"), []);
  assert.deepEqual(p.flush(), ["tail"], "an unterminated last event still counts");
});

test("retryDelay: 1 s doubling, capped at 30 s", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 10].map(retryDelay), [1000, 2000, 4000, 8000, 16_000, 30_000, 30_000]);
});
