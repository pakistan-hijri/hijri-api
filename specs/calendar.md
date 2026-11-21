# Calendar spec

The implementation is [`src/hijri/month-table.ts`](../src/hijri/month-table.ts). Tests that enforce
these rules live in `src/hijri/`.

## Month table

- Start from the confirmed entries in `data/hijri/overrides.json`, sorted by Gregorian date.
- Adjacent confirmed starts define that month's length, which must be 29 or 30 days.
- After the last confirmed start, choose 29 or 30 days from the previous start, whichever puts the
  next start nearer the Umm al-Qura baseline. Mark those months `predicted`.
- Between non-adjacent confirmed starts, split the gap into 29- and 30-day months, following baseline
  lengths where possible. Mark those months `estimated`. Impossible splits fail generation.
- Never publish a date before `coverage_start`.
- Consecutive starts are always 29 or 30 days apart in every generated calendar file.

## Confidence

| Value | Rule |
|---|---|
| `confirmed` | The month start is verified in `overrides.json`. |
| `estimated` | The start is inferred inside a gap between non-adjacent confirmed starts. |
| `predicted` | The start is projected after the last confirmed start. |
| `unconfirmed` | A 30th day whose successor start is not confirmed. |

`unconfirmed` is about the 30th day only; the month remains labelled day 30. Do not reinterpret it
as a Hijri 1st. Any date whose confidence is not `confirmed` must be shown as approximate and never
as the committee's decision.

## Index

`index.json.confirmed_days` counts published days with `confidence === "confirmed"`.
`index.json.confirmed_through` is the latest such Gregorian date.

## Uncertainty

Predicted entries carry `uncertainty_days: 2`. This is a documented allowance, not a probability.
Recompute the archive comparison with `npm run stats:baseline-variance` rather than hard-coding a
new bound.
