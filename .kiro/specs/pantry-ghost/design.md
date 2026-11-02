# Design — Pantry Ghost

## Architecture
Single static page (`index.html` + `app.js`) over a pure model
(`model.js`) built on the skeleton's `store.js` and `dates.js` —
identical shape to Deadline Crypt and Ritual, proving the skeleton's
reuse for the third time.

## Data model
```js
item = { id: string, name: string, expiresOn: "YYYY-MM-DD", addedAt: ISO string }
state = { items: item[] }   // store version 1, key "pantry-ghost"
```

## Logic (all in model.js, all unit-tested)
- `addItem(state, { id, name, expiresOn, now })` → validates a
  non-empty name and a real calendar date in `YYYY-MM-DD` form;
  refuses invalid input by returning the state unchanged. All inputs
  are explicit so the model stays pure.
- `freshness(item, now)` → `'fresh' | 'fading' | 'spoiled'` from the
  whole days between today's day key and `expiresOn`, using the
  skeleton `dates.js` day math: past → spoiled; 0–3 days → fading;
  4+ days → fresh (Requirement 2).
- `pantryList(state, now)` → items sorted by `expiresOn` ascending,
  each annotated `{ ...item, freshness, daysLeft }`.
- `removeItem(state, id)` → the item leaves the pantry (used up or
  removed — one path, per Requirement 3).
- `pantrySummary(state, now)` → `{ fresh, fading, spoiled }` counts
  for the header line.

## View
One view: an add form (name + date) at top, then the sorted list.
Each row shows the item name, its expiry date, days remaining, and a
calm freshness label (Fresh / Use soon / Past date) in the theme's
ember accent only for "Use soon". Each row carries a "Used up" button
(and removal uses the same path). Theme from skeleton `theme.css`
unchanged.

## Error handling
Same store contract as Deadline Crypt and Ritual (version refusal on
import, corrupt-data fallback with a backup key). Invalid add input
is refused silently at the model layer; the form simply keeps the
item off the list.
