# Design — Deadline Crypt

## Architecture
Single static page (`index.html` + `app.js`) over a pure model
(`model.js`) built on the skeleton's `store.js` and `dates.js`.

## Data model
```js
deadline = {
  id: string,            // crypto.randomUUID()
  title: string,
  due: "YYYY-MM-DD",
  category: string | null,
  createdAt: ISO string,
  completedAt: ISO string | null
}
state = { deadlines: deadline[] }   // store version 1, key "deadline-crypt"
```

## Logic (all in model.js, all unit-tested)
- `bucketOf(deadline, now)` → "dying" | "alive" | "dead" | "done"
  (done when completedAt is set; otherwise the skeleton's
  `deadlineBucket` on the due date).
- `grouped(state, now)` → `{ dying: [], alive: [], graveyard: [] }`,
  each sorted by due date ascending; completed items excluded.
- `addDeadline(state, {title, due, category})` → validates title/date,
  returns `{ ok }` or `{ error }` naming the missing field.
- `completeDeadline(state, id, now)`, `resurrectDeadline(state, id, newDue)`
  → pure updates; resurrect only accepts Dead items.

## View
Three sections in order (Dying, Alive, Graveyard) per Requirement 5,
an add-form at top, per-item actions (Complete; Resurrect with a date
input in the Graveyard). Theme from skeleton `theme.css` unchanged.

## Error handling
Invalid form input → inline message naming the missing field; a
version-mismatched import → refused with an explanation; corrupt local
data → the store falls back to an empty state and keeps the raw value
under a backup key (never destroys it silently).
