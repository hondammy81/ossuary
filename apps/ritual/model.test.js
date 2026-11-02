/**
 * model.test.js — tests for apps/ritual/model.js
 * Run with: bun test
 */

import { describe, it, expect } from 'bun:test';
import {
  addRitual,
  renameRitual,
  removeRitual,
  checkIn,
  ritualStats,
} from './model.js';

// =========================================================================
// Helpers
// =========================================================================

const TODAY = '2026-11-01';

/** Build an empty app state. */
function emptyState() {
  return { rituals: [], checkins: {} };
}

/**
 * Build a state with one ritual already added.
 * @param {string} [name]
 * @returns {{ state, id }}
 */
function stateWithOne(name = 'Morning Pages') {
  const base = emptyState();
  const result = addRitual(base, name);
  if (!result.ok) throw new Error('addRitual failed in test setup');
  return { state: result.ok.state, id: result.ok.ritual.id };
}

// =========================================================================
// addRitual
// =========================================================================
describe('addRitual', () => {
  it('creates a ritual with an empty check-in array', () => {
    const result = addRitual(emptyState(), 'Morning Pages');
    expect(result.ok).toBeTruthy();
    const { ritual, state } = result.ok;
    expect(ritual.name).toBe('Morning Pages');
    expect(ritual.id).toBeTruthy();
    expect(state.checkins[ritual.id]).toEqual([]);
  });

  it('trims whitespace from name', () => {
    const result = addRitual(emptyState(), '  Meditation  ');
    expect(result.ok.ritual.name).toBe('Meditation');
  });

  it('returns error for empty name', () => {
    const result = addRitual(emptyState(), '');
    expect(result.error).toBeTruthy();
    expect(result.ok).toBeUndefined();
  });

  it('returns error for whitespace-only name', () => {
    const result = addRitual(emptyState(), '   ');
    expect(result.error).toBeTruthy();
  });

  it('does not mutate original state', () => {
    const state = emptyState();
    addRitual(state, 'Walk');
    expect(state.rituals).toHaveLength(0);
  });

  it('appends to existing rituals', () => {
    const { state } = stateWithOne('Walk');
    const result = addRitual(state, 'Run');
    expect(result.ok.state.rituals).toHaveLength(2);
  });
});

// =========================================================================
// renameRitual
// =========================================================================
describe('renameRitual', () => {
  it('renames an existing ritual', () => {
    const { state, id } = stateWithOne('Walk');
    const result = renameRitual(state, id, 'Run');
    expect(result.ok).toBeTruthy();
    const found = result.ok.state.rituals.find(r => r.id === id);
    expect(found.name).toBe('Run');
  });

  it('returns error for empty new name', () => {
    const { state, id } = stateWithOne('Walk');
    const result = renameRitual(state, id, '');
    expect(result.error).toBeTruthy();
  });

  it('returns error for unknown id', () => {
    const state = emptyState();
    const result = renameRitual(state, 'ghost-id', 'Anything');
    expect(result.error).toBeTruthy();
  });

  it('does not mutate original state', () => {
    const { state, id } = stateWithOne('Walk');
    renameRitual(state, id, 'Run');
    expect(state.rituals[0].name).toBe('Walk');
  });
});

// =========================================================================
// removeRitual
// =========================================================================
describe('removeRitual', () => {
  it('removes the ritual and its check-ins', () => {
    const { state, id } = stateWithOne('Walk');
    // add a check-in so we can verify it's cleaned up
    const withCheckin = checkIn(state, id, TODAY).ok.state;
    const result = removeRitual(withCheckin, id);
    expect(result.ok).toBeTruthy();
    expect(result.ok.state.rituals).toHaveLength(0);
    expect(result.ok.state.checkins[id]).toBeUndefined();
  });

  it('returns error for unknown id', () => {
    const state = emptyState();
    const result = removeRitual(state, 'ghost-id');
    expect(result.error).toBeTruthy();
  });

  it('does not mutate original state', () => {
    const { state, id } = stateWithOne('Walk');
    removeRitual(state, id);
    expect(state.rituals).toHaveLength(1);
  });
});

// =========================================================================
// checkIn — idempotency (same-day repeats)
// =========================================================================
describe('checkIn — same-day idempotency', () => {
  it('records a check-in for today', () => {
    const { state, id } = stateWithOne();
    const result = checkIn(state, id, TODAY);
    expect(result.ok).toBeTruthy();
    expect(result.ok.state.checkins[id]).toContain(TODAY);
  });

  it('checking in twice on the same day changes nothing (exact same state)', () => {
    const { state, id } = stateWithOne();
    const once = checkIn(state, id, TODAY).ok.state;
    const twice = checkIn(once, id, TODAY).ok.state;
    // checkins array must still have exactly one entry for today
    expect(twice.checkins[id]).toHaveLength(1);
    expect(twice.checkins[id]).toEqual([TODAY]);
  });

  it('checking in three times on the same day keeps exactly one entry', () => {
    const { state, id } = stateWithOne();
    const s1 = checkIn(state, id, TODAY).ok.state;
    const s2 = checkIn(s1,    id, TODAY).ok.state;
    const s3 = checkIn(s2,    id, TODAY).ok.state;
    expect(s3.checkins[id]).toHaveLength(1);
  });

  it('returns the unchanged state reference when already checked in', () => {
    const { state, id } = stateWithOne();
    const once = checkIn(state, id, TODAY).ok.state;
    const result = checkIn(once, id, TODAY);
    // After an idempotent no-op, the state object returned equals the input
    expect(result.ok.state).toBe(once);
  });

  it('returns error for unknown ritual id', () => {
    const state = emptyState();
    const result = checkIn(state, 'ghost-id', TODAY);
    expect(result.error).toBeTruthy();
  });

  it('does not mutate original state', () => {
    const { state, id } = stateWithOne();
    checkIn(state, id, TODAY);
    expect(state.checkins[id]).toHaveLength(0);
  });
});

// =========================================================================
// ritualStats — streak edge cases
// =========================================================================
describe('ritualStats — no check-ins', () => {
  it('returns zeros and flame=none for a fresh ritual', () => {
    const { state, id } = stateWithOne();
    const stats = ritualStats(state, id, TODAY);
    expect(stats.current).toBe(0);
    expect(stats.longest).toBe(0);
    expect(stats.flame).toBe('none');
    expect(stats.last).toBeNull();
  });
});

describe('ritualStats — yesterday-ending streak (grace day)', () => {
  it('streak is still live when last check-in was yesterday', () => {
    const { state, id } = stateWithOne();
    // Check in for 2026-10-31 (yesterday relative to TODAY 2026-11-01)
    const YESTERDAY = '2026-10-31';
    const s1 = checkIn(state, id, YESTERDAY).ok.state;
    const stats = ritualStats(s1, id, TODAY);
    expect(stats.current).toBe(1);
    expect(stats.flame).toBe('kindling');
    expect(stats.last).toBe(YESTERDAY);
  });

  it('multi-day streak ending yesterday is still live', () => {
    const { state, id } = stateWithOne();
    // Build a 4-day streak ending yesterday
    let s = state;
    s = checkIn(s, id, '2026-10-28').ok.state;
    s = checkIn(s, id, '2026-10-29').ok.state;
    s = checkIn(s, id, '2026-10-30').ok.state;
    s = checkIn(s, id, '2026-10-31').ok.state;
    const stats = ritualStats(s, id, TODAY);
    expect(stats.current).toBe(4);
    expect(stats.flame).toBe('burning');
  });
});

describe('ritualStats — broken streak', () => {
  it('current streak is 0 when last check-in was 2 days ago', () => {
    const { state, id } = stateWithOne();
    const TWO_DAYS_AGO = '2026-10-30';
    const s1 = checkIn(state, id, TWO_DAYS_AGO).ok.state;
    const stats = ritualStats(s1, id, TODAY);
    expect(stats.current).toBe(0);
    expect(stats.flame).toBe('none');
  });

  it('longest streak is preserved when current is broken', () => {
    const { state, id } = stateWithOne();
    // Build a 3-day streak…
    let s = state;
    s = checkIn(s, id, '2026-10-20').ok.state;
    s = checkIn(s, id, '2026-10-21').ok.state;
    s = checkIn(s, id, '2026-10-22').ok.state;
    // …then a gap, then one more check-in last week
    s = checkIn(s, id, '2026-10-27').ok.state;

    const stats = ritualStats(s, id, TODAY);
    // current streak broken (last was 5 days ago)
    expect(stats.current).toBe(0);
    // longest streak from the consecutive block = 3
    expect(stats.longest).toBe(3);
    expect(stats.flame).toBe('none');
  });

  it('current streak is 0 when last check-in was a week ago', () => {
    const { state, id } = stateWithOne();
    const s1 = checkIn(state, id, '2026-10-25').ok.state;
    const stats = ritualStats(s1, id, TODAY);
    expect(stats.current).toBe(0);
    expect(stats.flame).toBe('none');
  });
});

describe('ritualStats — flame levels', () => {
  it('flame is kindling for a 1-day streak', () => {
    const { state, id } = stateWithOne();
    const s1 = checkIn(state, id, TODAY).ok.state;
    expect(ritualStats(s1, id, TODAY).flame).toBe('kindling');
  });

  it('flame is kindling for a 2-day streak', () => {
    const { state, id } = stateWithOne();
    let s = state;
    s = checkIn(s, id, '2026-10-31').ok.state;
    s = checkIn(s, id, TODAY).ok.state;
    expect(ritualStats(s, id, TODAY).flame).toBe('kindling');
  });

  it('flame is burning for a 3-day streak', () => {
    const { state, id } = stateWithOne();
    let s = state;
    s = checkIn(s, id, '2026-10-30').ok.state;
    s = checkIn(s, id, '2026-10-31').ok.state;
    s = checkIn(s, id, TODAY).ok.state;
    expect(ritualStats(s, id, TODAY).flame).toBe('burning');
  });

  it('flame is burning for a 6-day streak', () => {
    const { state, id } = stateWithOne();
    let s = state;
    for (let i = 5; i >= 0; i--) {
      // 2026-10-27 through 2026-11-01
      const d = new Date(2026, 10 - 1, 27 + (5 - i));
      s = checkIn(s, id, `2026-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`).ok.state;
    }
    expect(ritualStats(s, id, TODAY).flame).toBe('burning');
  });

  it('flame is blazing for a 7-day streak', () => {
    const { state, id } = stateWithOne();
    let s = state;
    // 2026-10-26 through 2026-11-01 = 7 days
    const days = ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01'];
    for (const d of days) s = checkIn(s, id, d).ok.state;
    expect(ritualStats(s, id, TODAY).flame).toBe('blazing');
  });
});

// =========================================================================
// Integration: full lifecycle
// =========================================================================
describe('full lifecycle', () => {
  it('add → check in every day for 7 days → blazing flame', () => {
    let state = emptyState();
    const addResult = addRitual(state, 'Daily Writing');
    expect(addResult.ok).toBeTruthy();
    state = addResult.ok.state;
    const id = addResult.ok.ritual.id;

    const days = ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01'];
    for (const d of days) {
      state = checkIn(state, id, d).ok.state;
    }

    const stats = ritualStats(state, id, '2026-11-01');
    expect(stats.current).toBe(7);
    expect(stats.flame).toBe('blazing');
  });

  it('rename then check in — name updated, streak continues', () => {
    let state = emptyState();
    state = addRitual(state, 'Old Name').ok.state;
    const id = state.rituals[0].id;
    state = checkIn(state, id, '2026-10-31').ok.state;
    state = renameRitual(state, id, 'New Name').ok.state;
    state = checkIn(state, id, TODAY).ok.state;

    expect(state.rituals[0].name).toBe('New Name');
    expect(ritualStats(state, id, TODAY).current).toBe(2);
  });

  it('remove drops ritual and check-ins completely', () => {
    let state = emptyState();
    state = addRitual(state, 'Walk').ok.state;
    const id = state.rituals[0].id;
    state = checkIn(state, id, TODAY).ok.state;
    state = removeRitual(state, id).ok.state;

    expect(state.rituals).toHaveLength(0);
    expect(state.checkins[id]).toBeUndefined();
  });

  it('same-day check-in idempotency does not corrupt streak', () => {
    let state = emptyState();
    state = addRitual(state, 'Read').ok.state;
    const id = state.rituals[0].id;

    // check in today 5 times
    for (let i = 0; i < 5; i++) {
      state = checkIn(state, id, TODAY).ok.state;
    }

    expect(state.checkins[id]).toHaveLength(1);
    expect(ritualStats(state, id, TODAY).current).toBe(1);
  });
});
