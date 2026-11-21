import type { Confidence, HijriDate } from "../types.js";
import { addDays, diffDays, hijriKey } from "../dates.js";
import { hijriToGregorian } from "./baseline.js";
import type { ConfirmedMonth, NormalizedOverrides } from "./overrides.js";

export const PREDICTED_UNCERTAINTY_DAYS = 2;

export type MonthLength = 29 | 30;

export interface MonthRow {
  hijri: HijriDate;
  hijriKey: string;
  /** Gregorian date of the 1st. */
  start: string;
  length: MonthLength;
  /** Confidence for the month's ordinary days. */
  confidence: Confidence;
  sources?: string[] | undefined;
  /** True when the following day is a confirmed 1st. */
  nextStartConfirmed: boolean;
}

export interface BuildMonthTableOptions {
  hijriYears: number[];
  overrides: NormalizedOverrides;
}

export class MonthTableError extends Error {
  override name = "MonthTableError";
}

function monthOrdinal(hijri: HijriDate): number {
  return (hijri.year - 1) * 12 + hijri.month - 1;
}

function hijriFromOrdinal(ordinal: number): HijriDate {
  return {
    year: Math.floor(ordinal / 12) + 1,
    month: (ordinal % 12) + 1,
    day: 1,
  };
}

function baselineStart(ordinal: number, cache: Map<number, string>): string {
  const cached = cache.get(ordinal);
  if (cached !== undefined) return cached;
  const gregorian = hijriToGregorian(hijriFromOrdinal(ordinal));
  cache.set(ordinal, gregorian);
  return gregorian;
}

function baselineLength(ordinal: number, cache: Map<number, string>): MonthLength {
  const length = diffDays(baselineStart(ordinal, cache), baselineStart(ordinal + 1, cache));
  if (length !== 29 && length !== 30) {
    throw new MonthTableError(
      `Baseline month ${hijriKey(hijriFromOrdinal(ordinal))} has an unsupported length of ${length} days`,
    );
  }
  return length;
}

function projectedLength(currentStart: string, nextOrdinal: number, cache: Map<number, string>): MonthLength {
  const baseline = baselineStart(nextOrdinal, cache);
  const days29 = Math.abs(diffDays(addDays(currentStart, 29), baseline));
  const days30 = Math.abs(diffDays(addDays(currentStart, 30), baseline));
  return days29 <= days30 ? 29 : 30;
}

function splitConfirmedGap(
  from: ConfirmedMonth,
  to: ConfirmedMonth,
  cache: Map<number, string>,
): Map<number, MonthLength> {
  const fromOrdinal = monthOrdinal(from.hijri);
  const toOrdinal = monthOrdinal(to.hijri);
  const monthCount = toOrdinal - fromOrdinal;
  const totalDays = diffDays(from.gregorian, to.gregorian);
  if (totalDays < monthCount * 29 || totalDays > monthCount * 30) {
    throw new MonthTableError(
      `Cannot split ${from.hijriKey} (${from.gregorian}) to ${to.hijriKey} (${to.gregorian}): `
        + `${totalDays} days cannot be divided into ${monthCount} months of 29 or 30 days`,
    );
  }

  const lengths = new Map<number, MonthLength>();
  let thirties = totalDays - monthCount * 29;
  for (let index = 0; index < monthCount; index += 1) {
    const ordinal = fromOrdinal + index;
    const baseline = baselineLength(ordinal, cache);
    const isForced = thirties === monthCount - index;
    const length: MonthLength = thirties > 0 && (baseline === 30 || isForced) ? 30 : 29;
    if (length === 30) thirties -= 1;
    lengths.set(ordinal, length);
  }
  return lengths;
}

function indexedMonths(months: ConfirmedMonth[]): Map<number, ConfirmedMonth> {
  const byOrdinal = new Map<number, ConfirmedMonth>();
  let previous: ConfirmedMonth | undefined;
  for (const month of months) {
    if (month.hijri.day !== 1) {
      throw new MonthTableError(
        `${month.hijriKey}: a confirmed start must be keyed by the 1st of the Hijri month`,
      );
    }
    const ordinal = monthOrdinal(month.hijri);
    if (byOrdinal.has(ordinal)) {
      throw new MonthTableError(`${month.hijriKey}: duplicate confirmed Hijri month`);
    }
    if (previous !== undefined) {
      if (ordinal <= monthOrdinal(previous.hijri) || month.gregorian <= previous.gregorian) {
        throw new MonthTableError(
          `Confirmed months are out of order: ${previous.hijriKey} (${previous.gregorian}) `
            + `then ${month.hijriKey} (${month.gregorian})`,
        );
      }
      const gap = ordinal - monthOrdinal(previous.hijri);
      const days = diffDays(previous.gregorian, month.gregorian);
      if (gap === 1 && days !== 29 && days !== 30) {
        throw new MonthTableError(
          `${month.hijriKey} starts ${days} days after ${previous.hijriKey}; adjacent months must start 29 or 30 days apart`,
        );
      }
      if (gap > 1 && (days < gap * 29 || days > gap * 30)) {
        throw new MonthTableError(
          `${month.hijriKey} starts ${days} days after ${previous.hijriKey}; `
            + `${gap} months need between ${gap * 29} and ${gap * 30} days`,
        );
      }
    }
    byOrdinal.set(ordinal, month);
    previous = month;
  }
  return byOrdinal;
}

function plannedLengths(months: ConfirmedMonth[], cache: Map<number, string>): Map<number, MonthLength> {
  const lengths = new Map<number, MonthLength>();
  for (let index = 0; index < months.length - 1; index += 1) {
    const current = months[index]!;
    const next = months[index + 1]!;
    const gap = monthOrdinal(next.hijri) - monthOrdinal(current.hijri);
    if (gap === 1) {
      lengths.set(monthOrdinal(current.hijri), diffDays(current.gregorian, next.gregorian) as MonthLength);
    } else {
      for (const [ordinal, length] of splitConfirmedGap(current, next, cache)) {
        lengths.set(ordinal, length);
      }
    }
  }
  return lengths;
}

export function buildMonthTable(options: BuildMonthTableOptions): MonthRow[] {
  const { overrides, hijriYears } = options;
  if (hijriYears.length === 0) return [];

  const cache = new Map<number, string>();
  const byOrdinal = overrides.months.length > 0 ? indexedMonths(overrides.months) : new Map<number, ConfirmedMonth>();
  const first = overrides.months[0];
  const last = overrides.months[overrides.months.length - 1];
  const startOrdinal = first === undefined
    ? monthOrdinal({ year: Math.min(...hijriYears), month: 1, day: 1 })
    : monthOrdinal(first.hijri);
  const endOrdinal = monthOrdinal({ year: Math.max(...hijriYears), month: 12, day: 1 });
  const lastConfirmedOrdinal = last === undefined ? Number.NEGATIVE_INFINITY : monthOrdinal(last.hijri);
  const lengths = first === undefined ? new Map<number, MonthLength>() : plannedLengths(overrides.months, cache);
  const rows: MonthRow[] = [];

  let ordinal = startOrdinal;
  let start = first?.gregorian ?? baselineStart(startOrdinal, cache);
  while (ordinal <= endOrdinal) {
    const confirmed = byOrdinal.get(ordinal);
    if (confirmed !== undefined && confirmed.gregorian !== start) {
      throw new MonthTableError(
        `${confirmed.hijriKey} was planned to start ${start}, but overrides.json records ${confirmed.gregorian}`,
      );
    }
    const length = lengths.get(ordinal) ?? projectedLength(start, ordinal + 1, cache);
    const nextStart = addDays(start, length);
    const nextConfirmed = byOrdinal.get(ordinal + 1);
    if (nextConfirmed !== undefined && nextConfirmed.gregorian !== nextStart) {
      throw new MonthTableError(
        `${nextConfirmed.hijriKey} starts ${nextConfirmed.gregorian}, but the preceding month ends at ${nextStart}`,
      );
    }

    const hijri = hijriFromOrdinal(ordinal);
    rows.push({
      hijri,
      hijriKey: hijriKey(hijri),
      start,
      length,
      confidence: confirmed !== undefined ? "confirmed" : ordinal <= lastConfirmedOrdinal ? "estimated" : "predicted",
      ...(confirmed !== undefined ? { sources: confirmed.sources } : {}),
      nextStartConfirmed: nextConfirmed !== undefined,
    });

    start = nextStart;
    ordinal += 1;
  }

  return rows;
}

export function dayConfidence(row: MonthRow, day: number): Confidence {
  if (row.length === 30 && day === 30 && !row.nextStartConfirmed) return "unconfirmed";
  return row.confidence;
}
