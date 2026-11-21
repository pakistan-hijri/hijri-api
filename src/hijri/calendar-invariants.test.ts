import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addDays, diffDays, hijriKey } from "../dates.js";
import { buildCalendar } from "./calendar.js";
import type { ConfirmedMonth, NormalizedOverrides } from "./overrides.js";
import { CALENDAR_DIR, CALENDAR_INDEX_FILE } from "../paths.js";
import type { CalendarFile, CalendarIndex, GregorianDate, HijriDayEntry, HijriDate } from "../types.js";

interface Dataset {
  files: CalendarFile[];
  index: CalendarIndex;
}

function confirmed(year: number, month: number, gregorian: string): ConfirmedMonth {
  const hijri: HijriDate = { year, month, day: 1 };
  return { hijri, hijriKey: hijriKey(hijri), gregorian, sources: ["https://example.com/source"] };
}

function overrides(months: ConfirmedMonth[]): NormalizedOverrides {
  return { coverageStart: months[0]?.gregorian ?? null, months };
}

function built(months: ConfirmedMonth[], hijriYears: number[]): Dataset {
  return buildCalendar({
    hijriYears,
    overrides: overrides(months),
    today: "2026-11-12",
    generatedAt: "2026-11-12T00:00:00.000Z",
  });
}

function loadCommittedData(): Dataset {
  const files = readdirSync(CALENDAR_DIR)
    .filter((name) => /^\d+\.json$/.test(name))
    .map((name) => JSON.parse(readFileSync(join(CALENDAR_DIR, name), "utf8")) as CalendarFile);
  const index = JSON.parse(readFileSync(CALENDAR_INDEX_FILE, "utf8")) as CalendarIndex;
  return { files, index };
}

function merged(files: CalendarFile[]): Map<GregorianDate, HijriDayEntry> {
  const days = new Map<GregorianDate, HijriDayEntry>();
  for (const file of files) {
    for (const [date, entry] of Object.entries(file.days)) {
      if (days.has(date)) throw new Error(`Duplicate Gregorian date ${date} across calendar files`);
      days.set(date, entry);
    }
  }
  return days;
}

function monthKey(entry: HijriDayEntry): string {
  return entry.hijri.slice(0, 7);
}

function assertInvariants(dataset: Dataset): Map<GregorianDate, HijriDayEntry> {
  const days = merged(dataset.files);
  const ordered = [...days.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const coverageStart = dataset.index.coverage_start;

  for (const [date] of ordered) {
    if (coverageStart !== null) expect(date >= coverageStart, `${date} precedes coverage_start`).toBe(true);
  }

  const monthLengths = new Map<string, number>();
  const starts: GregorianDate[] = [];
  let previous: { date: GregorianDate; entry: HijriDayEntry } | undefined;

  for (const [date, entry] of ordered) {
    const key = monthKey(entry);
    monthLengths.set(key, (monthLengths.get(key) ?? 0) + 1);
    if (entry.day === 1) {
      expect(previous === undefined || monthKey(previous.entry) !== key, `${date} repeats a month start`).toBe(true);
      starts.push(date);
    } else {
      expect(previous, `${date} is not a month start`).toBeDefined();
      expect(monthKey(previous!.entry), `${date} changes month outside a month start`).toBe(key);
      expect(entry.day, `${date} does not increment the day number`).toBe(previous!.entry.day + 1);
    }
    previous = { date, entry };
  }

  for (const [key, length] of monthLengths) {
    expect(length, `${key} has ${length} days`).toBeGreaterThanOrEqual(29);
    expect(length, `${key} has ${length} days`).toBeLessThanOrEqual(30);
  }

  for (let index = 1; index < starts.length; index += 1) {
    const length = diffDays(starts[index - 1]!, starts[index]!);
    expect([29, 30], `${starts[index]} starts ${length} days after ${starts[index - 1]}`).toContain(length);
  }

  const confirmedDates = ordered.filter(([, entry]) => entry.confidence === "confirmed").map(([date]) => date);
  expect(dataset.index.confirmed_days).toBe(confirmedDates.length);
  expect(dataset.index.confirmed_through).toBe(confirmedDates.at(-1) ?? null);

  for (const [date, entry] of ordered) {
    if (entry.confidence === "predicted") {
      expect(entry.uncertainty_days, `${date} is missing predicted uncertainty`).toBe(2);
    }
  }

  return days;
}

describe("calendar invariants", () => {
  it("holds for the committed calendar data", () => {
    assertInvariants(loadCommittedData());
  });

  it("holds for the Nov-Dec 2026 projection fixture", () => {
    const dataset = built(
      [confirmed(1448, 5, "2026-10-13"), confirmed(1448, 6, "2026-11-12")],
      [1448],
    );
    const days = assertInvariants(dataset);

    expect(days.get("2026-12-10")?.hijri).toBe("1448-06-29");
    expect(days.get("2026-12-11")).toMatchObject({ hijri: "1448-07-01", day: 1 });
  });

  it("holds for an estimated gap between non-adjacent confirmed starts", () => {
    const first = confirmed(1448, 5, "2026-10-13");
    const dataset = built([first, confirmed(1448, 7, addDays(first.gregorian, 59))], [1448]);
    const days = assertInvariants(dataset);

    expect(days.get("2026-11-12")?.confidence).toBe("estimated");
    expect(days.get("2026-12-11")?.confidence).toBe("confirmed");
  });
});
