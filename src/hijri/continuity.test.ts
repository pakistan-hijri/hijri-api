import { describe, expect, it } from "vitest";
import type { GregorianDate, HijriDayEntry } from "../types.js";
import { buildCalendar } from "./calendar.js";
import { loadOverrides } from "./overrides.js";

function buildDays(): Record<GregorianDate, HijriDayEntry> {
  const { files } = buildCalendar({
    hijriYears: [1447, 1448],
    overrides: loadOverrides(),
    today: "2026-11-12",
    generatedAt: "2026-11-12T00:00:00.000Z",
  });
  return Object.assign({}, ...files.map((file) => file.days));
}

describe("calendar continuity regressions", () => {
  const days = buildDays();

  it("starts 1448-07 the day after the confirmed 1448-06 month", () => {
    expect(days["2026-12-11"]?.hijri).toBe("1448-06-30");
    expect(days["2026-12-12"]?.hijri).toBe("1448-07-01");
    expect(days["2026-12-12"]?.day).toBe(1);
  });

  it("does not emit days before coverage_start or duplicate a month start", () => {
    expect(days["2025-06-26"]).toBeUndefined();
    const muharramDays = Object.values(days).filter((entry) => entry.hijri.startsWith("1447-01-"));
    expect(muharramDays).toHaveLength(30);
    expect(muharramDays.filter((entry) => entry.day === 1)).toHaveLength(1);
  });
});
