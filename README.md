# hijri-api

> **Read this first:** treat anything whose confidence is not `confirmed` as approximate. Never
> present it as the committee's decision.

Open Hijri calendar and prayer time data for Pakistan, served as static JSON.

Pakistan has no machine-readable source for **sighted** Hijri month starts. This project keeps a
verified, auditable archive of them with a calculated fallback, computes prayer times locally, and
scans the news for each announcement so a human approves the update through a pull request. The
repository is the data store, the build system and the API.

> Every published Hijri date carries a confidence level; prayer times are calculated, not observed.

## API

Base URL: `https://pakistan-hijri.github.io/hijri-api`. All routes are `GET`, served with
`access-control-allow-origin: *`.

| Route | Returns |
|---|---|
| `/hijri/index.json` | Coverage, `confirmed_through`, generation time, available Hijri years |
| `/hijri/overrides.json` | The confirmed month-start record (human-edited, with sources) |
| `/hijri/calendar/<hijriYear>.json` | Gregorian date → Hijri date + confidence |
| `/prayer/<city>/<profile>/<year>.json` | Daily prayer times |

Cities: `karachi`, `lahore`, `peshawar`. Profiles: `sunni_hanafi`, `sunni_asr1` (earlier Asr),
`shia_jafari`.

### Confidence

| Level | Meaning |
|---|---|
| `confirmed` | The month start has a verified date and source in `overrides.json`, and every day shown is before the next confirmed start. |
| `estimated` | A month start inferred while filling a gap between two non-adjacent confirmed starts. Its 29/30-day length follows the Umm al-Qura baseline where possible. |
| `predicted` | A month start projected after the last confirmed start by choosing the 29th or 30th day closer to the Umm al-Qura baseline. |
| `unconfirmed` | Only the 30th day of a month whose successor start is not confirmed. It remains labelled day 30 here, but the sighting may prove it was the next month's 1st. |

Do: show `~9 Feb (estimated)` and say the date is awaiting an announcement. Don't: print
"1 Ramadan is 9 Feb" as fact when its confidence is `estimated`, `predicted` or `unconfirmed`.

`coverage_start` is the first confirmed start; earlier dates are not published.
`index.json.confirmed_through` is the last date actually published as `confirmed`, not simply the
last confirmed 1st of a month.

Predicted day entries carry `uncertainty_days: 2`. This is a documented allowance for now, not a
probability bound. It was chosen from the archive: on 2026-11-21, `npm run stats:baseline-variance`
compared all 18 confirmed starts in `overrides.json` with Umm al-Qura and found a difference of
0–2 days (0 days: 1 month, 1 day: 14 months, 2 days: 3 months). Re-run that script to refresh the
statistic after new confirmations.

## Client

The package ships the client only; prayer times are precomputed, so no astronomy library is needed.
The JSON is the real contract, so other languages can read it directly.

```ts
import { HijriCalendar, PrayerTable, hijriDate, sehriIftar } from "hijri-api";

const base = "https://pakistan-hijri.github.io/hijri-api";
const calendar = HijriCalendar.fromJSON(await (await fetch(`${base}/hijri/calendar/1448.json`)).json());
const prayer = PrayerTable.fromJSON(await (await fetch(`${base}/prayer/karachi/sunni_hanafi/2026.json`)).json());

// Default is the midnight-based date; pass afterMaghrib with that day's Maghrib for the Islamic day.
const today = hijriDate(new Date(), { calendar, afterMaghrib: true, maghrib: prayer.maghrib("2026-03-01") });
console.log(today.hijri, today.confidence);

const fast = sehriIftar(prayer, today.gregorian, today);
if (fast) console.log("Sehri ends", fast.sehriEnds, "Iftar", fast.iftar);
```

`hijriDate` throws `OutOfRangeError` rather than guessing when data does not cover the date; sehri
and iftar are returned only during Ramadan.

## Development

Requires Node 20+.

```bash
npm install
npm test                 # vitest
npm run generate         # rebuild data/hijri/calendar and data/prayer
npm run scanner          # dry run: detect and print, never write
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for adding a city or a confirmed month, and
[MODULES.md](./MODULES.md) for the code layout.

## Scanner

The Ruet-e-Hilal Committee meets on the evening of the 29th, so the scanner computes the two
candidate dates, polls the news, and proposes an `overrides.json` entry only when **two independent
publishers agree** on the same date. Because generic searches rank by relevance and miss minor
months, it queries the month being scanned across its common spellings and reads direct feeds too.
It opens a pull request rather than writing to `main`, and rebuilds the calendar in the same pull
request so the change is complete and reviewable in one step; merging it deploys the site.
A wrong month start is the worst failure mode, so a human stays in the loop, and an unconfirmed
month raises an issue instead of failing silently. It measures from the last confirmed start, so
backfill one recent anchor first.

## Accuracy and license

Prayer times are calculated, not observed: for guidance only, and always defer to your local mosque
or imambargah. Every confirmed month cites at least one public source. Code is MIT licensed
([LICENSE](./LICENSE)).
