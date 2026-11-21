/**
 * Assemble yearly Hijri calendar files and the calendar index from a
 * continuous month table derived from the confirmed overrides plus baseline.
 */
import type { CalendarFile, CalendarIndex, GregorianDate, HijriDayEntry } from "../types.js";
import { addDays, hijriKey } from "../dates.js";
import { BASELINE_NAME } from "./baseline.js";
import { monthName } from "./months.js";
import {
  buildMonthTable,
  dayConfidence,
  PREDICTED_UNCERTAINTY_DAYS,
  type MonthRow,
} from "./month-table.js";
import type { NormalizedOverrides } from "./overrides.js";

export interface BuildCalendarOptions {
  /** Hijri years to emit. Should be consecutive. */
  hijriYears: number[];
  overrides: NormalizedOverrides;
  /** ISO timestamp stamped into the files. Injected for deterministic tests. */
  generatedAt?: string | undefined;
  /** Today in Pakistan, `YYYY-MM-DD`. Injected for deterministic tests. */
  today?: string | undefined;
}

export interface CalendarBuildResult {
  files: CalendarFile[];
  index: CalendarIndex;
}

function entryFor(row: MonthRow, day: number, gregorian: GregorianDate): HijriDayEntry {
  const confidence = dayConfidence(row, day);
  const entry: HijriDayEntry = {
    hijri: hijriKey({ ...row.hijri, day }),
    year: row.hijri.year,
    month: row.hijri.month,
    day,
    month_name: monthName(row.hijri.month),
    confidence,
  };
  if (confidence === "predicted") entry.uncertainty_days = PREDICTED_UNCERTAINTY_DAYS;
  if (row.sources !== undefined) entry.sources = row.sources;
  return entry;
}

export function buildCalendar(options: BuildCalendarOptions): CalendarBuildResult {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const coverageStart = options.overrides.months[0]?.gregorian ?? null;
  const table = buildMonthTable({ hijriYears: options.hijriYears, overrides: options.overrides });

  const years = [...new Set(options.hijriYears)].sort((a, b) => a - b);
  const files: CalendarFile[] = [];
  let confirmedDays = 0;
  let confirmedThrough: string | null = null;

  for (const hijriYear of years) {
    const days: Record<GregorianDate, HijriDayEntry> = {};
    for (const row of table) {
      if (row.hijri.year !== hijriYear) continue;
      for (let day = 1; day <= row.length; day += 1) {
        const gregorian = addDays(row.start, day - 1);
        if (coverageStart !== null && gregorian < coverageStart) continue;
        const resolved = entryFor(row, day, gregorian);
        days[gregorian] = resolved;
        if (resolved.confidence === "confirmed") {
          confirmedDays += 1;
          if (confirmedThrough === null || gregorian > confirmedThrough) confirmedThrough = gregorian;
        }
      }
    }
    files.push({
      hijri_year: hijriYear,
      coverage_start: coverageStart,
      generated_at: generatedAt,
      baseline: BASELINE_NAME,
      days,
    });
  }

  return {
    files,
    index: {
      coverage_start: coverageStart,
      generated_at: generatedAt,
      baseline: BASELINE_NAME,
      hijri_years: years,
      confirmed_days: confirmedDays,
      confirmed_through: confirmedThrough,
    },
  };
}
