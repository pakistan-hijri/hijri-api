import { diffDays, todayInPakistan } from "../src/dates.js";
import { hijriToGregorian } from "../src/hijri/baseline.js";
import { loadOverrides } from "../src/hijri/overrides.js";

function distribution(values: number[]): Record<string, number> {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.fromEntries(
    [...counts].sort(([a], [b]) => a - b).map(([value, count]) => [String(value), count]),
  );
}

const months = loadOverrides().months;
if (months.length === 0) throw new Error("overrides.json has no confirmed months to compare");

const signed = months.map((month) => diffDays(hijriToGregorian(month.hijri), month.gregorian));
const absolute = signed.map((value) => Math.abs(value));

console.log(JSON.stringify({
  computed_on: todayInPakistan(),
  overrides_file: "data/hijri/overrides.json",
  confirmed_months: months.length,
  signed: {
    min: Math.min(...signed),
    max: Math.max(...signed),
    distribution: distribution(signed),
  },
  absolute: {
    min: Math.min(...absolute),
    max: Math.max(...absolute),
    distribution: distribution(absolute),
  },
}, null, 2));
