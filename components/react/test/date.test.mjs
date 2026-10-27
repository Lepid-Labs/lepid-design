// Preset dates and typed entry behind DateField. Run in New York, where an evening
// is already tomorrow in UTC and March has a 23-hour day.
process.env.TZ = "America/New_York";

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  DATE_PRESETS,
  dateInRange,
  isISODate,
  isoToTyped,
  localISODate,
  nextWeekday,
  presetValue,
  typedToISO,
  weekday,
} from "../src/date-presets.ts";

test("localISODate: the reader's calendar date, not the UTC one", () => {
  const evening = new Date(2026, 2, 7, 23, 30); // 04:30 UTC on the 8th
  assert.equal(evening.toISOString().slice(0, 10), "2026-03-08");
  assert.equal(localISODate(evening), "2026-03-07");
  assert.equal(localISODate(new Date(2026, 0, 1, 0, 5)), "2026-01-01");
});

test("addDays: across months, years, leap days and the DST change", () => {
  assert.equal(addDays("2026-03-07", 1), "2026-03-08");
  assert.equal(addDays("2026-03-08", 1), "2026-03-09"); // the 23-hour day
  assert.equal(addDays("2026-11-01", 1), "2026-11-02"); // the 25-hour day
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2027-02-28", 1), "2027-03-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("presets: today, tomorrow and next Monday", () => {
  const sat = "2026-03-07";
  assert.equal(weekday(sat), 6);
  assert.equal(DATE_PRESETS.today.resolve(sat), sat);
  assert.equal(DATE_PRESETS.tomorrow.resolve(sat), "2026-03-08");
  assert.equal(DATE_PRESETS.nextWeek.resolve(sat), "2026-03-09");
  assert.equal(nextWeekday("2026-03-09", 1), "2026-03-16"); // a Monday's next week is a week on
  assert.equal(nextWeekday("2026-03-08", 1), "2026-03-09"); // from Sunday, tomorrow
  assert.equal(nextWeekday("2026-12-30", 5), "2027-01-01");
});

test("isISODate and dateInRange", () => {
  assert.ok(isISODate("2028-02-29"));
  assert.ok(!isISODate("2026-02-29"));
  assert.ok(!isISODate("2026-13-01"));
  assert.ok(!isISODate("2026-3-1"));
  assert.ok(dateInRange("2026-03-10", "2026-03-01", "2026-03-31"));
  assert.ok(dateInRange("2026-03-01", "2026-03-01"));
  assert.ok(!dateInRange("2026-02-28", "2026-03-01"));
  assert.ok(!dateInRange("2026-04-01", undefined, "2026-03-31"));
});

test("presetValue: a datetime-local keeps its time", () => {
  assert.equal(presetValue("2026-03-09", "date", "2026-03-01"), "2026-03-09");
  assert.equal(presetValue("2026-03-09", "datetime-local", "2026-03-01T14:30"), "2026-03-09T14:30");
  assert.equal(presetValue("2026-03-09", "datetime-local"), "2026-03-09T09:00");
  assert.equal(presetValue("2026-03-09", "datetime-local", "", "17:00"), "2026-03-09T17:00");
});

test("typed entry: eight digits make a real date or nothing", () => {
  assert.equal(typedToISO("03152026"), "2026-03-15");
  assert.equal(typedToISO("15032026", "dmy"), "2026-03-15");
  assert.equal(typedToISO("02302026"), undefined);
  assert.equal(typedToISO("0315202"), undefined);
  assert.equal(typedToISO("13012026"), undefined);
  assert.equal(isoToTyped("2026-03-15"), "03152026");
  assert.equal(isoToTyped("2026-03-15T09:00", "dmy"), "15032026");
  assert.equal(isoToTyped(""), "");
});
