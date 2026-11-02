/**
 * model.js — Pantry Ghost pure model
 *
 * All business logic lives here. No DOM access, no side effects.
 * Depends on dates.js (dayDiff, toKey) and store.js (makeStore).
 *
 * Data shape:
 *   item  = { id: string, name: string, expiresOn: "YYYY-MM-DD", addedAt: ISO string }
 *   state = { items: item[] }
 *
 * Exports:
 *   addItem(state, { id, name, expiresOn, now })  → state (unchanged if invalid)
 *   freshness(item, now)                           → 'fresh' | 'fading' | 'spoiled'
 *   pantryList(state, now)                         → annotated items sorted by expiresOn
 *   removeItem(state, id)                          → state
 *   pantrySummary(state, now)                      → { fresh, fading, spoiled }
 */

import { dayDiff, toKey } from './dates.js';

// ---- Date helpers --------------------------------------------------------

/**
 * Normalise a `now` argument to a "YYYY-MM-DD" day key.
 * Accepts a Date, an ISO string, or a "YYYY-MM-DD" string.
 * Falls back to today if nothing useful is passed.
 *
 * @param {Date|string|undefined} now
 * @returns {string}
 */
function resolveToday(now) {
  if (now instanceof Date) return toKey(now);
  if (typeof now === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(now)) return now;
  // ISO string with time component
  if (typeof now === 'string' && now.length > 10) return toKey(new Date(now));
  return toKey(new Date());
}

/**
 * Return true when the string is a valid calendar date in "YYYY-MM-DD" form.
 * Rejects non-dates like "2026-02-30".
 *
 * @param {string} str
 * @returns {boolean}
 */
function isValidDate(str) {
  if (typeof str !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00');  // force local-time parse
  return !isNaN(d.getTime()) && toKey(d) === str;
}

// ---- Add -----------------------------------------------------------------

/**
 * Add a new item to the pantry.
 *
 * Validation:
 *  - `name` must be a non-empty string (after trimming)
 *  - `expiresOn` must be a valid "YYYY-MM-DD" calendar date
 *
 * Invalid input returns the state unchanged (silent refusal, per design).
 *
 * @param {{ items: Array }} state
 * @param {{ id?: string, name: string, expiresOn: string, now?: Date|string }} opts
 * @returns {{ items: Array }}  new state, or original state if invalid
 */
export function addItem(state, { id, name, expiresOn, now }) {
  const trimmedName = (name ?? '').trim();
  if (!trimmedName) return state;
  if (!isValidDate(expiresOn)) return state;

  const item = {
    id:        id ?? crypto.randomUUID(),
    name:      trimmedName,
    expiresOn,
    addedAt:   now instanceof Date ? now.toISOString() : new Date().toISOString(),
  };

  return { ...state, items: [...state.items, item] };
}

// ---- Freshness -----------------------------------------------------------

/**
 * Classify an item's freshness relative to a reference day.
 *
 * Rule (whole days between today's key and expiresOn):
 *   past (diff < 0) → 'spoiled'
 *   0–3 days        → 'fading'
 *   4+ days         → 'fresh'
 *
 * @param {{ expiresOn: string }} item
 * @param {Date|string} [now]   — reference date, defaults to today
 * @returns {'fresh'|'fading'|'spoiled'}
 */
export function freshness(item, now) {
  const todayRef = resolveToday(now);
  const diff = dayDiff(todayRef, item.expiresOn); // expiresOn − today

  if (diff < 0)  return 'spoiled';
  if (diff <= 3) return 'fading';
  return 'fresh';
}

// ---- Pantry list ---------------------------------------------------------

/**
 * Return all items sorted by expiresOn ascending, each annotated with
 * freshness and daysLeft (whole days until expiry; negative when spoiled).
 *
 * @param {{ items: Array }} state
 * @param {Date|string} [now]
 * @returns {Array<{ id, name, expiresOn, addedAt, freshness: string, daysLeft: number }>}
 */
export function pantryList(state, now) {
  const todayRef = resolveToday(now);
  return [...state.items]
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))
    .map(item => ({
      ...item,
      freshness: freshness(item, todayRef),
      daysLeft:  dayDiff(todayRef, item.expiresOn),
    }));
}

// ---- Remove --------------------------------------------------------------

/**
 * Remove an item from the pantry by id.
 * Returns the state unchanged if the id is not found.
 *
 * @param {{ items: Array }} state
 * @param {string} id
 * @returns {{ items: Array }}
 */
export function removeItem(state, id) {
  const items = state.items.filter(i => i.id !== id);
  if (items.length === state.items.length) return state; // not found — no-op
  return { ...state, items };
}

// ---- Summary -------------------------------------------------------------

/**
 * Count items by freshness.
 *
 * @param {{ items: Array }} state
 * @param {Date|string} [now]
 * @returns {{ fresh: number, fading: number, spoiled: number }}
 */
export function pantrySummary(state, now) {
  const todayRef = resolveToday(now);
  const counts = { fresh: 0, fading: 0, spoiled: 0 };
  for (const item of state.items) {
    counts[freshness(item, todayRef)]++;
  }
  return counts;
}
