# hijri-api

Static JSON for Pakistan's Hijri calendar and calculated prayer times.

> Treat any date whose `confidence` is not `confirmed` as approximate. It is not the committee's
> decision.

Confirmed month starts live in `data/hijri/overrides.json` with source URLs. Dates after that record
are projected from the Umm al-Qura baseline. The generated files under `data/` are the published API.

## API

Base URL: `https://pakistan-hijri.github.io/hijri-api`. Routes are `GET` with
`access-control-allow-origin: *`.

| Route | Contents |
|---|---|
| [`/hijri/index.json`](https://pakistan-hijri.github.io/hijri-api/hijri/index.json) | Coverage, generation time, available years, confirmed-day count |
| [`/hijri/overrides.json`](https://pakistan-hijri.github.io/hijri-api/hijri/overrides.json) | Confirmed month starts and their sources |
| `/hijri/calendar/<hijriYear>.json` | Gregorian date → Hijri date, day number and confidence |
| `/prayer/<city>/<profile>/<year>.json` | Gregorian date → calculated prayer times |

Example paths: [`hijri/calendar/1448.json`](https://pakistan-hijri.github.io/hijri-api/hijri/calendar/1448.json),
[`prayer/karachi/sunni_hanafi/2026.json`](https://pakistan-hijri.github.io/hijri-api/prayer/karachi/sunni_hanafi/2026.json).

Cities: `karachi`, `lahore`, `peshawar`, `quetta`. Profiles: `sunni_hanafi`, `sunni_asr1` (earlier
Asr), `shia_jafari`.

### `index.json`

```json
{
  "coverage_start": "2025-06-27",
  "generated_at": "2026-11-21T09:22:41.389Z",
  "baseline": "islamic-umalqura (Intl)",
  "hijri_years": [1447, 1448, 1449],
  "confirmed_days": 532,
  "confirmed_through": "2026-12-10"
}
```

`coverage_start` is the first confirmed start. `confirmed_through` is the last published day whose
confidence is `confirmed`, which is not necessarily the last confirmed 1st.

### `overrides.json`

```json
{
  "$schema": "./overrides.schema.json",
  "coverage_start": "2025-06-27",
  "months": {
    "1448-01-01": {
      "date": "2026-06-17",
      "sources": ["https://example.com/committee-announcement"]
    }
  }
}
```

Keys are Hijri 1sts. Each entry records the Gregorian start date and at least one public source URL.

### `calendar/<hijriYear>.json`

```json
{
  "hijri_year": 1448,
  "coverage_start": "2025-06-27",
  "generated_at": "2026-11-21T09:22:41.389Z",
  "baseline": "islamic-umalqura (Intl)",
  "days": {
    "2026-11-12": {
      "hijri": "1448-06-01",
      "year": 1448,
      "month": 6,
      "day": 1,
      "month_name": { "en": "Jumada al-Thani", "ur": "جمادی الثانی" },
      "confidence": "confirmed",
      "sources": ["https://example.com/committee-announcement"]
    }
  }
}
```

Confirmed days carry `sources`. Predicted days carry `uncertainty_days: 2` instead; no day is
published before `coverage_start`.

### `prayer/<city>/<profile>/<year>.json`

```json
{
  "city": "karachi",
  "city_name": "Karachi",
  "province": "Sindh",
  "profile": "sunni_hanafi",
  "profile_label": "Sunni (Hanafi)",
  "year": 2026,
  "timezone": "Asia/Karachi",
  "generated_at": "2026-11-21T09:22:41.389Z",
  "disclaimer": "Calculated prayer times, not observed. For guidance only; always defer to your local mosque or imambargah.",
  "sehri_offset_min": 0,
  "iftar_offset_min": 0,
  "days": {
    "2026-01-01": {
      "date": "2026-01-01",
      "times": {
        "fajr": "2026-01-01T05:55:00+05:00",
        "sunrise": "2026-01-01T07:17:00+05:00",
        "dhuhr": "2026-01-01T12:35:00+05:00",
        "asr": "2026-01-01T16:18:00+05:00",
        "maghrib": "2026-01-01T17:54:00+05:00",
        "isha": "2026-01-01T19:16:00+05:00"
      }
    }
  }
}
```

Times are calculated, include the Pakistan offset, and are start times only — not congregation times.

## Confidence

| Level | Meaning |
|---|---|
| `confirmed` | Inside a month whose start is verified in `overrides.json`. |
| `estimated` | A month start inferred while filling a gap between non-adjacent confirmed starts. |
| `predicted` | A month start projected after the last confirmed start using the 29th or 30th day nearer the baseline. |
| `unconfirmed` | Only a 30th day whose successor start is not confirmed; the sighting may prove it was the next month's 1st. |

Display an estimated date as `~9 Feb (estimated)` and say it is awaiting an announcement. Do not
print it as the committee's date. `uncertainty_days: 2` is a documented allowance, not a probability:
`npm run stats:baseline-variance` found baseline dates 0–2 days from committee starts across all 18
overrides on 2026-11-21.

## TypeScript client

The package exports the client and types; the JSON is the real contract for other languages.

```ts
import { HijriCalendar, PrayerTable, hijriDate, sehriIftar } from "hijri-api";

const base = "https://pakistan-hijri.github.io/hijri-api";
const json = (path: string) => fetch(`${base}${path}`).then((response) => response.json());

const calendar = HijriCalendar.fromJSON(await json("/hijri/calendar/1448.json"));
const prayer = PrayerTable.fromJSON(await json("/prayer/karachi/sunni_hanafi/2026.json"));
const gregorian = "2026-11-12";

const noon = hijriDate(new Date(`${gregorian}T12:00:00+05:00`), { calendar });
console.log(noon.hijri, noon.confidence, noon.sources);

const maghrib = prayer.maghrib(gregorian);
if (maghrib !== undefined) {
  const evening = hijriDate(new Date(`${gregorian}T20:00:00+05:00`), {
    calendar,
    afterMaghrib: true,
    maghrib,
  });
  console.log(evening.hijri);
}

const fast = sehriIftar(prayer, noon.gregorian, noon);
if (fast !== undefined) console.log(fast.sehriEnds, fast.iftar);
```

`hijriDate` uses the midnight-based date by default; `afterMaghrib` requires that day's Maghrib.
It throws `OutOfRangeError` instead of guessing outside the published range. `sehriIftar` returns a
value only during Ramadan.

## Development

Requires Node 20+.

```bash
npm install
npm test
npm run typecheck
npm run generate
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contributions and
[AGENTS.md](./AGENTS.md) for repository guidance. Normative contracts are in
[`specs/`](./specs/api.md).

Prayer times are calculated, not observed; defer to your local mosque or imambargah. Code is MIT
licensed ([LICENSE](./LICENSE)).
