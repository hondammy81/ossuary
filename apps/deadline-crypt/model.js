/**
 * model.js — Deadline Crypt pure model
 *
 * All business logic lives here. No DOM access, no side effects.
 * Depends on dates.js (deadlineBucket, toKey) and store.js (makeStore).
 *
 * Exports:
 *   bucketOf(deadline, todayRef)   → "dying"|"alive"|"dead"|"done"
 *   grouped(state, todayRef)       → { dying:[], alive:[], graveyard:[] }
 *   addDeadline(state, fields)     → { ok: deadline } | { error, field }
 *   completeDeadline(state, id, now) → { ok: state } | { error }
 *   resurrectDeadline(state, id, newDue) → { ok: state } | { error }
 */

import { deadlineBucket, toKey } from './dates.js';

// ---- Bucket classification -----------------------------------------------

/**
 * Classify a single deadline into a lifecycle bucket.
 *
 * @param {{ completedAt: string|null, due: string }} deadline
 * @param {string} [todayRef]  — "YYYY-MM-DD" override (defaults to real today)
 * @returns {"dying"|"alive"|"dead"|"done"}
 */
export function bucketOf(deadline, todayRef) {
  if (deadline.completedAt) return 'done';
  return deadlineBucket(deadline.due, todayRef);
}

// ---- Grouped view --------------------------------------------------------

/**
 * Group active (not done) deadlines into three view buckets, each sorted
 * ascending by due date.
 *
 * @param {{ deadlines: Array }} state
 * @param {string} [todayRef]  — "YYYY-MM-DD" override
 * @returns {{ dying: Array, alive: Array, graveyard: Array }}
 */
export function grouped(state, todayRef) {
  const dying = [];
  const alive = [];
  const graveyard = [];

  for (const d of state.deadlines) {
    const bucket = bucketOf(d, todayRef);
    if (bucket === 'done') continue;        // completed → excluded
    if (bucket === 'dying')    dying.push(d);
    else if (bucket === 'alive')   alive.push(d);
    else if (bucket === 'dead')    graveyard.push(d);
  }

  const byDue = (a, b) => a.due.localeCompare(b.due);
  dying.sort(byDue);
  alive.sort(byDue);
  graveyard.sort(byDue);

  return { dying, alive, graveyard };
}

// ---- Add -----------------------------------------------------------------

/**
 * Add a new deadline to the state.
 * Validates title (non-empty) and due date (non-empty, valid YYYY-MM-DD).
 *
 * @param {{ deadlines: Array }} state   — immutable input; returns new state
 * @param {{ title: string, due: string, category?: string }} fields
 * @returns {{ ok: { deadline, state } } | { error: string, field: string }}
 */
export function addDeadline(state, { title, due, category }) {
  const trimmedTitle = (title ?? '').trim();
  if (!trimmedTitle) {
    return { error: 'Title is required.', field: 'title' };
  }

  const trimmedDue = (due ?? '').trim();
  if (!trimmedDue) {
    return { error: 'Due date is required.', field: 'due' };
  }

  // Basic date format validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDue)) {
    return { error: 'Due date must be a valid date (YYYY-MM-DD).', field: 'due' };
  }

  const deadline = {
    id: crypto.randomUUID(),
    title: trimmedTitle,
    due: trimmedDue,
    category: (category ?? '').trim() || null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  const newState = {
    ...state,
    deadlines: [...state.deadlines, deadline],
  };

  return { ok: { deadline, state: newState } };
}

// ---- Complete ------------------------------------------------------------

/**
 * Mark a deadline as completed.
 * The item is removed from all active buckets (done items are excluded
 * from grouped()).
 *
 * @param {{ deadlines: Array }} state
 * @param {string} id
 * @param {Date|string} [now]  — timestamp for completedAt (defaults to new Date())
 * @returns {{ ok: { state } } | { error: string }}
 */
export function completeDeadline(state, id, now) {
  const idx = state.deadlines.findIndex(d => d.id === id);
  if (idx === -1) {
    return { error: `Deadline "${id}" not found.` };
  }

  const existing = state.deadlines[idx];
  if (existing.completedAt) {
    return { error: 'Deadline is already completed.' };
  }

  const completedAt = now instanceof Date
    ? now.toISOString()
    : (typeof now === 'string' ? now : new Date().toISOString());

  const updated = { ...existing, completedAt };
  const deadlines = [
    ...state.deadlines.slice(0, idx),
    updated,
    ...state.deadlines.slice(idx + 1),
  ];

  return { ok: { state: { ...state, deadlines } } };
}

// ---- Resurrect -----------------------------------------------------------

/**
 * Resurrect a Dead (past, uncompleted) deadline with a new due date.
 * Only accepts items whose current bucket is "dead".
 *
 * @param {{ deadlines: Array }} state
 * @param {string} id
 * @param {string} newDue  — "YYYY-MM-DD"
 * @param {string} [todayRef]  — "YYYY-MM-DD" override for bucket check
 * @returns {{ ok: { state } } | { error: string, field?: string }}
 */
export function resurrectDeadline(state, id, newDue, todayRef) {
  if (!newDue || !/^\d{4}-\d{2}-\d{2}$/.test(newDue.trim())) {
    return { error: 'A new due date is required.', field: 'newDue' };
  }

  const idx = state.deadlines.findIndex(d => d.id === id);
  if (idx === -1) {
    return { error: `Deadline "${id}" not found.` };
  }

  const existing = state.deadlines[idx];
  const bucket = bucketOf(existing, todayRef);

  if (bucket !== 'dead') {
    return { error: 'Only Dead deadlines can be resurrected.' };
  }

  const updated = { ...existing, due: newDue.trim(), completedAt: null };
  const deadlines = [
    ...state.deadlines.slice(0, idx),
    updated,
    ...state.deadlines.slice(idx + 1),
  ];

  return { ok: { state: { ...state, deadlines } } };
}
