# Design — Ritual

## Architecture
Single static page (`index.html` + `app.js`) over a pure model
(`model.js`) built on the skeleton's `store.js` and `dates.js` —
identical shape to Deadline Crypt, proving the skeleton's reuse.

## Data model
```js
ritual = { id: string, name: string, createdAt: ISO string }
state = {
  rituals: ritual[],
  checkins: { [ritualId]: "YYYY-MM-DD"[] }   // sorted, unique
}   // store version 1, key "ritual"
```

## Logic (all in model.js, all unit-tested)
- `checkIn(state, ritualId, now)` → appends today's day key if absent
  (idempotent per Requirement 2).
- `ritualStats(state, ritualId, now)` → the skeleton's `streakInfo`:
  `{ current, longest, flame, last }`.
- `renameRitual` / `removeRitual` → plain updates; removal also drops
  that ritual's check-ins.

## View
One card per ritual: name, flame (drawn with CSS — a single ember dot
whose glow scales with the flame level), current + longest streak,
and a Check in button that disables itself once today is recorded.
Theme from skeleton `theme.css` unchanged.

## Error handling
Same store contract as Deadline Crypt (version refusal on import,
corrupt-data fallback with a backup key).
