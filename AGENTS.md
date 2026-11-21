# AGENTS.md

Guidance for automated agents working in this repository. Read the linked specs before changing
published data, generators, or client behavior.

## Non-negotiables

- `data/hijri/overrides.json` is the only source of confirmed month starts. Never overwrite it with
  generated values.
- Generated output under `data/hijri/calendar/` and `data/prayer/` is the deployed product. Change
  the source code and run `npm run generate`; do not hand-edit those files.
- Adjacent confirmed starts must be 29 or 30 days apart. No dates are published before
  `coverage_start`.
- `unconfirmed` applies only to a 30th day whose successor start is not confirmed. Never label a
  non-`confirmed` date as the committee's decision.
- Prayer times are calculated, not observed. `sehri_offset_min` and `iftar_offset_min` are the only
  adjustments; there are no congregation times.
- Routes are stable. Do not add a `/v1/` prefix or rename published JSON keys without an explicit
  breaking-change request.
- `docs/scanner-pr-18.png` is pre-existing and untracked; leave it alone.

## Source of truth

| Need | Read |
|---|---|
| Published JSON contract | [`src/types.ts`](src/types.ts), [`specs/api.md`](specs/api.md) |
| Confirmed month starts | [`data/hijri/overrides.json`](data/hijri/overrides.json) |
| Calendar/confidence rules | [`src/hijri/month-table.ts`](src/hijri/month-table.ts), [`specs/calendar.md`](specs/calendar.md) |
| Prayer data/contract | [`data/cities.json`](data/cities.json), [`src/prayer/profiles.ts`](src/prayer/profiles.ts), [`specs/prayer.md`](specs/prayer.md) |
| Build and scan commands | [`src/cli.ts`](src/cli.ts), [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Website documentation | [`data/index.html`](data/index.html) |
| Deployment | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) |

`README.md` and `data/index.html` are user-facing. `specs/` is normative for implementation. When
adding or changing a JSON field, update `src/types.ts`, the generator, the spec, the README and the
website in the same change.

## Commands

```bash
npm test
npm run typecheck
npm run build
npm run lint
npm run generate
```

Run the checks after any TypeScript change. `npm run generate` must produce no unexpected diff.

## Review checklist

- Does the change keep the JSON contract additive and stable?
- Are generated files reproducible from committed inputs?
- Are approximate dates still visibly qualified?
- Do README/website examples use real field names and existing routes?
- Was `docs/scanner-pr-18.png` left untouched?
