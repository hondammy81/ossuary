/**
 * model.js — Ritual pure model
 *
 * All business logic lives here. No DOM access, no side effects.
 * Depends on dates.js (computeStreak, toKey) and store.js (makeStore).
 *
 * Data shape:
 *   state = {
 *     rituals:  Array<{ id, name, createdAt }>,
 *     checkins: { [ritualId]: "YYYY-MM-DD"[] }  // sorted, unique
 *   }
 *
 * Exports:
 *   addRitual(state, name)               → { ok: { ritual, state } } | { error }
 *   renameRitual(state, id, newName)     → { ok: { state } } | { error }
 *   removeRitual(state, id)              → { ok: { state } } | { error }
 *   checkIn(state, ritualId, now)        → { ok: { state } } | { error }
 *   ritualStats(state, ritualId, now)    → { current, longest, flame, last }
 */

import { computeStreak, toKey } from './dates.js';

// ---- Add -----------------------------------------------------------------

/**
 * Add a new ritual with an empty check-in history.
 *
 * @param {{ rituals: Array, checkins: object }} state
 * @param {string} name
 * @returns {{ ok: { ritual, state } } | { error: string }}
 */
export function addRitual(state, name) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) {
    return { error: 'Please give your ritual a name.' };
  }

  const ritual = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: new Date().toISOString(),
  };

  const newState = {
    rituals: [...state.rituals, ritual],
    checkins: { ...state.checkins, [ritual.id]: [] },
  };

  return { ok: { ritual, state: newState } };
}

// ---- Rename --------------------------------------------------------------

/**
 * Rename an existing ritual.
 *
 * @param {{ rituals: Array, checkins: object }} state
 * @param {string} id
 * @param {string} newName
 * @returns {{ ok: { state } } | { error: string }}
 */
export function renameRitual(state, id, newName) {
  const trimmed = (newName ?? '').trim();
  if (!trimmed) {
    return { error: 'Please give your ritual a name.' };
  }

  const idx = state.rituals.findIndex(r => r.id === id);
  if (idx === -1) {
    return { error: `Ritual "${id}" not found.` };
  }

  const updated = { ...state.rituals[idx], name: trimmed };
  const rituals = [
    ...state.rituals.slice(0, idx),
    updated,
    ...state.rituals.slice(idx + 1),
  ];

  return { ok: { state: { ...state, rituals } } };
}

// ---- Remove --------------------------------------------------------------

/**
 * Remove a ritual and all its check-ins.
 *
 * @param {{ rituals: Array, checkins: object }} state
 * @param {string} id
 * @returns {{ ok: { state } } | { error: string }}
 */
export function removeRitual(state, id) {
  const idx = state.rituals.findIndex(r => r.id === id);
  if (idx === -1) {
    return { error: `Ritual "${id}" not found.` };
  }

  const rituals = state.rituals.filter(r => r.id !== id);
  const checkins = { ...state.checkins };
  delete checkins[id];

  return { ok: { state: { ...state, rituals, checkins } } };
}

// ---- Check in ------------------------------------------------------------

/**
 * Record today's check-in for a ritual (idempotent — same-day repeats are no-ops).
 *
 * @param {{ rituals: Array, checkins: object }} state
 * @param {string} ritualId
 * @param {Date|string} [now]  — Date or "YYYY-MM-DD" override (defaults to today)
 * @returns {{ ok: { state } } | { error: string }}
 */
export function checkIn(state, ritualId, now) {
  const idx = state.rituals.findIndex(r => r.id === ritualId);
  if (idx === -1) {
    return { error: `Ritual "${ritualId}" not found.` };
  }

  // Resolve today's day key
  const todayKey = now instanceof Date
    ? toKey(now)
    : (typeof now === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(now) ? now : toKey(new Date()));

  const existing = state.checkins[ritualId] ?? [];

  // Idempotent: already checked in today
  if (existing.includes(todayKey)) {
    return { ok: { state } };
  }

  // Insert and keep sorted
  const updated = [...existing, todayKey].sort();
  const checkins = { ...state.checkins, [ritualId]: updated };

  return { ok: { state: { ...state, checkins } } };
}

// ---- Stats ---------------------------------------------------------------

/**
 * Compute streak statistics for one ritual.
 *
 * Uses the skeleton's computeStreak to derive current streak, longest streak,
 * and flame level. Also returns the last check-in date.
 *
 * @param {{ rituals: Array, checkins: object }} state
 * @param {string} ritualId
 * @param {Date|string} [now]  — Date or "YYYY-MM-DD" override (defaults to today)
 * @returns {{ current: number, longest: number, flame: string, last: string|null }}
 */
export function ritualStats(state, ritualId, now) {
  const todayKey = now instanceof Date
    ? toKey(now)
    : (typeof now === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(now) ? now : toKey(new Date()));

  const keys = state.checkins[ritualId] ?? [];

  const { current, longest, flameLevel } = computeStreak(keys, todayKey);

  const last = keys.length > 0 ? keys[keys.length - 1] : null;

  return { current, longest, flame: flameLevel, last };
}
