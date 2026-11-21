# API contract

The published contract is defined in [`src/types.ts`](../src/types.ts). This file records the rules
that changes must preserve. The website (`data/index.html`) is published from the `data/` directory
as the site root.

## Base and transport

- Base URL: `https://pakistan-hijri.github.io/hijri-api`.
- All routes are static `GET` files and return `access-control-allow-origin: *`.
- Missing or ungenerated paths return the host's normal `404`; clients must handle that.
- There is no envelope. Each route returns its file object directly.

## Routes

| Route | File type | Keyed by |
|---|---|---|
| `/hijri/index.json` | `IndexFile` | — |
| `/hijri/overrides.json` | `OverridesFile` | Hijri 1st, `YYYY-MM-DD` |
| `/hijri/calendar/<hijriYear>.json` | `CalendarFile` | Gregorian date, `YYYY-MM-DD` |
| `/prayer/<city>/<profile>/<year>.json` | `PrayerYearFile` | Gregorian date, `YYYY-MM-DD` |

Valid cities: `karachi`, `lahore`, `peshawar`, `quetta`. Valid profiles: `sunni_hanafi`,
`sunni_asr1`, `shia_jafari`.

## `IndexFile`

Fields: `coverage_start`, `generated_at`, `baseline`, `hijri_years`, `confirmed_days`,
`confirmed_through`.

- `coverage_start` equals the first confirmed month start.
- `generated_at` is an ISO timestamp.
- `confirmed_through` is the last published `confirmed` day, not the last confirmed 1st.

## `OverridesFile`

Fields: `$schema`, `coverage_start`, `months`.

- Each `months` key is a Hijri 1st in `YYYY-MM-DD` form.
- Each value has a Gregorian `date` and at least one `http(s)` URL in `sources`.
- Gregorian start dates must be unique.
- `coverage_start` is retained for readability; generators use the earliest confirmed month.

## `CalendarFile`

Top-level fields: `hijri_year`, `coverage_start`, `generated_at`, `baseline`, `days`.

Each `days[gregorianDate]` entry has `hijri`, `year`, `month`, `day`, `month_name: { en, ur }` and
`confidence`. Confirmed entries add `sources`; predicted entries add `uncertainty_days: 2`. An
entry must never have both `sources` and `uncertainty_days`.

## `PrayerYearFile`

Top-level fields: `city`, `city_name`, `province`, `profile`, `profile_label`, `year`, `timezone`,
`generated_at`, `disclaimer`, `sehri_offset_min`, `iftar_offset_min`, `days`.

Each `days[gregorianDate]` entry has `date` and `times` with `fajr`, `sunrise`, `dhuhr`, `asr`,
`maghrib` and `isha`. Times are ISO strings with a fixed `+05:00` offset.

## Compatibility

Prefer additive changes. A key rename, removal, or meaning change requires an explicit migration
plan and updates to the client, README and website in the same PR.
