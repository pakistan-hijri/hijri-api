import { describe, expect, it } from "vitest";
import { addDays, diffDays, hijriKey } from "../dates.js";
import { hijriToGregorian } from "./baseline.js";
import { buildMonthTable, dayConfidence, MonthTableError, PREDICTED_UNCERTAINTY_DAYS } from "./month-table.js";
import type { ConfirmedMonth, NormalizedOverrides } from "./overrides.js";
import type { HijriDate } from "../types.js";

function confirmed(year: number, month: number, gregorian: string): ConfirmedMonth {
  const hijri: HijriDate = { year, month, day: 1 };
  return { hijri, hijriKey: hijriKey(hijri), gregorian, sources: ["https://example.com/source"] };
}

function overrides(months: ConfirmedMonth[]): NormalizedOverrides {
  return { coverageStart: months[0]?.gregorian ?? null, months };
}

function baselineLength(year: number, month: number): number {
  return diffDays(
    hijriToGregorian({ year, month, day: 1 }),
    hijriToGregorian({ year: year + (month === 12 ? 1 : 0), month: month === 12 ? 1 : month + 1, day: 1 }),
  );
}

describe("buildMonthTable", () => {
  it("uses the gap between adjacent confirmed starts as the month length", () => {
    const first = confirmed(1447, 1, "2025-06-27");
    const second = confirmed(1447, 2, "2025-07-27");
    const rows = buildMonthTable({ hijriYears: [1447], overrides: overrides([first, second]) });

    expect(rows[0]).toMatchObject({
      hijriKey: "1447-01-01",
      start: "2025-06-27",
      length: 30,
      confidence: "confirmed",
      sources: first.sources,
      nextStartConfirmed: true,
    });
    expect(rows[1]).toMatchObject({ hijriKey: "1447-02-01", start: "2025-07-27", confidence: "confirmed" });
  });

  it("projects the next start nearer the baseline for each unconfirmed month", () => {
    const baseline = hijriToGregorian({ year: 1447, month: 2, day: 1 });

    const short = buildMonthTable({
      hijriYears: [1447],
      overrides: overrides([confirmed(1447, 1, addDays(baseline, -29))]),
    });
    const long = buildMonthTable({
      hijriYears: [1447],
      overrides: overrides([confirmed(1447, 1, addDays(baseline, -30))]),
    });

    expect(short[0]?.length).toBe(29);
    expect(long[0]?.length).toBe(30);
    expect(short[1]?.start).toBe(baseline);
    expect(long[1]?.start).toBe(baseline);
    expect(short[1]?.confidence).toBe("predicted");
    expect(short[1]?.nextStartConfirmed).toBe(false);
  });

  it("splits a gap between non-adjacent confirmed starts across 29- and 30-day months", () => {
    const first = confirmed(1447, 1, "2025-06-27");
    const fourth = confirmed(1447, 4, addDays(first.gregorian, 89));
    const rows = buildMonthTable({ hijriYears: [1447], overrides: overrides([first, fourth]) });
    const split = rows.slice(0, 3);
    const baseline = [baselineLength(1447, 1), baselineLength(1447, 2), baselineLength(1447, 3)];
    const generated = split.map((row) => row.length);
    const matches = generated.filter((length, index) => length === baseline[index]).length;

    expect(generated.reduce((sum, length) => sum + length, 0)).toBe(89);
    expect(generated.filter((length) => length === 30)).toHaveLength(2);
    expect(matches).toBe(
      Math.min(2, baseline.filter((length) => length === 30).length)
        + Math.min(1, baseline.filter((length) => length === 29).length),
    );
    expect(rows.slice(1, 3).map((row) => row.confidence)).toEqual(["estimated", "estimated"]);
    expect(rows[3]).toMatchObject({ hijriKey: "1447-04-01", start: fourth.gregorian, confidence: "confirmed" });
  });

  it("fails clearly when a confirmed gap cannot be split into 29- and 30-day months", () => {
    const first = confirmed(1447, 1, "2025-06-27");
    const fourth = confirmed(1447, 4, addDays(first.gregorian, 86));

    expect(() => buildMonthTable({ hijriYears: [1447], overrides: overrides([first, fourth]) }))
      .toThrow(MonthTableError);
    expect(() => buildMonthTable({ hijriYears: [1447], overrides: overrides([first, fourth]) }))
      .toThrow(/3 months need between 87 and 90 days/);
  });
});

describe("dayConfidence", () => {
  const row = {
    hijri: { year: 1448, month: 7, day: 1 },
    hijriKey: "1448-07-01",
    start: "2026-12-11",
    length: 30 as const,
    confidence: "predicted" as const,
    nextStartConfirmed: false,
  };

  it("marks only an unanchored 30th day as unconfirmed", () => {
    expect(dayConfidence(row, 29)).toBe("predicted");
    expect(dayConfidence(row, 30)).toBe("unconfirmed");
    expect(dayConfidence({ ...row, nextStartConfirmed: true }, 30)).toBe("predicted");
    expect(dayConfidence({ ...row, length: 29 }, 29)).toBe("predicted");
  });

  it("keeps the predicted uncertainty constant at two days", () => {
    expect(PREDICTED_UNCERTAINTY_DAYS).toBe(2);
  });
});
