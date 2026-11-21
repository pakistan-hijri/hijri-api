# Prayer spec

The implementation is [`src/prayer/`](../src/prayer/). Prayer data is independent of Hijri data;
clients join them only to show sehri/iftar during Ramadan.

## Cities

Cities come from `data/cities.json`. Each entry requires a lowercase `id`, display `name`,
`province`, numeric `latitude`, `longitude` and `elevation`, and a valid IANA `timezone`. Current
ids: `karachi`, `lahore`, `peshawar`, `quetta`.

`elevation` is stored for provenance but is not used by the calculation library.

## Profiles

Profiles are defined in `src/prayer/profiles.ts`. Current ids: `sunni_hanafi`, `sunni_asr1`,
`shia_jafari`. To match a printed timetable, adjust per-prayer `adjustMin` values rather than
angles, and document the comparison in the PR.

## Files

Each file covers one city, one profile and one Gregorian year:
`/prayer/<city>/<profile>/<year>.json`.

Top-level metadata records `city`, `city_name`, `province`, `profile`, `profile_label`, `year`,
`timezone`, `generated_at`, `disclaimer`, `sehri_offset_min` and `iftar_offset_min`.

`days` is keyed by Gregorian date. Each value has `date` and `times` with `fajr`, `sunrise`,
`dhuhr`, `asr`, `maghrib` and `isha`. Times are start times as ISO strings with `+05:00`; they are
not congregation times.

## Client behavior

`PrayerTable.maghrib(date)` returns the Maghrib string or `undefined`. `sehriIftar(date, hijri)`
returns a pair only when the supplied Hijri date is Ramadan, using `sehri_offset_min` and
`iftar_offset_min`; otherwise it returns `undefined`. `hijriDate(..., { afterMaghrib: true })`
requires the same day's Maghrib string.
