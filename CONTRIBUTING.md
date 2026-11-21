# Contributing

## Confirm a month start

1. Edit `data/hijri/overrides.json`.
2. Add a key for the Hijri 1st (`YYYY-MM-DD`) with its Gregorian `date` and at least one public
   source URL.
3. Run `npm run generate`.
4. Open a pull request using the [backfill month](.github/PULL_REQUEST_TEMPLATE/backfill-month.md)
   template.

```json
{
  "months": {
    "1448-01-01": {
      "date": "2026-06-17",
      "sources": ["https://example.com/committee-announcement"]
    }
  }
}
```

The generator requires real dates, at least one `http(s)` source, unique Gregorian starts, keys on
the 1st, and adjacent confirmed starts 29 or 30 days apart. `coverage_start` is derived from the
earliest confirmed month; leave it as it is.

Store confirmed start dates, not offsets. A wrong offset shifts every later month; a wrong start
date stays local.

## Scanner

The scanner polls on the 29th evening and proposes a start only when two independent publishers
agree. It rejects any announced date that is not 29 or 30 days after the previous confirmed start,
and opens a PR with the proposal and regenerated data for human review. It never writes to `main`.

Debug a run locally:

```bash
npx tsx src/cli.ts scan --now 2026-10-12T20:00:00+05:00 --dump
```

## Backfill a past year

The manual `backfill` workflow reports confirmed and missing months without writing data:

```bash
npm run backfill -- --hijri-year 1447 --dry-run --markdown-out backfill-out/1447.md
```

Add each confirmed start to `overrides.json`, run `npm run generate`, and open a PR. Consecutive
confirmed starts must be 29 or 30 days apart; gaps are allowed and are published as `estimated`.

## Add a city

Append a row to `data/cities.json`, then run `npm run generate`:

```json
{
  "id": "quetta",
  "name": "Quetta",
  "province": "Balochistan",
  "latitude": 30.1798,
  "longitude": 66.9750,
  "elevation": 1680,
  "timezone": "Asia/Karachi"
}
```

`id` must be a lowercase slug and `timezone` a valid IANA name. `elevation` is recorded but not used
by the calculation library.

## Adjust a profile

Profiles live in `src/prayer/profiles.ts`. To match a printed timetable, adjust the per-prayer
`adjustMin` values rather than the angles, and explain the comparison in the PR.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
npm run generate
```

Generated files under `data/hijri/calendar/` and `data/prayer/` are the deployed product. Do not
edit them by hand. `src/data-freshness.test.ts` and `src/hijri/calendar-invariants.test.ts` check
that they match the source data and stay continuous.

See [AGENTS.md](AGENTS.md) for repository guidance and [`specs/`](specs/api.md) for the published
contracts.

## Report a wrong date

Open an issue with the Hijri month, the published Gregorian date, and a source for the correct date.
