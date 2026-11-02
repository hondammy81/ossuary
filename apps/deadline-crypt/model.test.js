/**
 * model.test.js — tests for apps/deadline-crypt/model.js
 * Run with: bun test
 */

import { describe, it, expect } from 'bun:test';
import {
  bucketOf,
  grouped,
  addDeadline,
  completeDeadline,
  resurrectDeadline,
} from './model.js';

// =========================================================================
// Helpers
// =========================================================================

const TODAY = '2026-11-01';

function makeDeadline(overrides = {}) {
  return {
    id: 'test-id-' + Math.random().toString(36).slice(2),
    title: 'Test Deadline',
    due: '2026-11-10',
    category: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

function makeState(deadlines = []) {
  return { deadlines };
}

// =========================================================================
// bucketOf — Task 2: bucket boundary tests
// =========================================================================
describe('bucketOf — bucket boundaries', () => {
  it('done — completedAt set', () => {
    const d = makeDeadline({ completedAt: '2026-11-01T12:00:00.000Z' });
    expect(bucketOf(d, TODAY)).toBe('done');
  });

  it('dead — due date was yesterday (1 day past)', () => {
    const d = makeDeadline({ due: '2026-10-31' });
    expect(bucketOf(d, TODAY)).toBe('dead');
  });

  it('dead — due date was a week ago', () => {
    const d = makeDeadline({ due: '2026-10-24' });
    expect(bucketOf(d, TODAY)).toBe('dead');
  });

  it('dying — due date is today (0 days away)', () => {
    const d = makeDeadline({ due: '2026-11-01' });
    expect(bucketOf(d, TODAY)).toBe('dying');
  });

  it('dying — due date is tomorrow (1 day away)', () => {
    const d = makeDeadline({ due: '2026-11-02' });
    expect(bucketOf(d, TODAY)).toBe('dying');
  });

  it('dying — due date is exactly 2 days away (boundary)', () => {
    const d = makeDeadline({ due: '2026-11-03' });
    expect(bucketOf(d, TODAY)).toBe('dying');
  });

  it('alive — due date is exactly 3 days away (boundary)', () => {
    const d = makeDeadline({ due: '2026-11-04' });
    expect(bucketOf(d, TODAY)).toBe('alive');
  });

  it('alive — due date is far in the future', () => {
    const d = makeDeadline({ due: '2027-06-01' });
    expect(bucketOf(d, TODAY)).toBe('alive');
  });
});

// =========================================================================
// grouped — sort order and completion exclusion
// =========================================================================
describe('grouped — sort order', () => {
  it('alive deadlines are sorted by due date ascending', () => {
    const state = makeState([
      makeDeadline({ due: '2026-11-20' }),
      makeDeadline({ due: '2026-11-10' }),
      makeDeadline({ due: '2026-11-15' }),
    ]);
    const { alive } = grouped(state, TODAY);
    expect(alive.map(d => d.due)).toEqual(['2026-11-10', '2026-11-15', '2026-11-20']);
  });

  it('dying deadlines are sorted by due date ascending', () => {
    const state = makeState([
      makeDeadline({ due: '2026-11-03' }),
      makeDeadline({ due: '2026-11-01' }),
      makeDeadline({ due: '2026-11-02' }),
    ]);
    const { dying } = grouped(state, TODAY);
    expect(dying.map(d => d.due)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('graveyard deadlines are sorted by due date ascending', () => {
    const state = makeState([
      makeDeadline({ due: '2026-10-29' }),
      makeDeadline({ due: '2026-10-25' }),
      makeDeadline({ due: '2026-10-27' }),
    ]);
    const { graveyard } = grouped(state, TODAY);
    expect(graveyard.map(d => d.due)).toEqual(['2026-10-25', '2026-10-27', '2026-10-29']);
  });

  it('each deadline appears in exactly one bucket', () => {
    const state = makeState([
      makeDeadline({ due: '2026-11-20' }),  // alive
      makeDeadline({ due: '2026-11-01' }),  // dying
      makeDeadline({ due: '2026-10-30' }),  // dead
    ]);
    const { dying, alive, graveyard } = grouped(state, TODAY);
    expect(alive).toHaveLength(1);
    expect(dying).toHaveLength(1);
    expect(graveyard).toHaveLength(1);
  });
});

describe('grouped — completed items excluded', () => {
  it('completed item does not appear in any bucket', () => {
    const state = makeState([
      makeDeadline({ due: '2026-11-20', completedAt: '2026-11-01T00:00:00.000Z' }),
      makeDeadline({ due: '2026-11-01', completedAt: '2026-11-01T00:00:00.000Z' }),
      makeDeadline({ due: '2026-10-30', completedAt: '2026-11-01T00:00:00.000Z' }),
    ]);
    const { dying, alive, graveyard } = grouped(state, TODAY);
    expect(dying).toHaveLength(0);
    expect(alive).toHaveLength(0);
    expect(graveyard).toHaveLength(0);
  });

  it('mix of completed and active: only active appear', () => {
    const state = makeState([
      makeDeadline({ id: 'active', due: '2026-11-20', completedAt: null }),
      makeDeadline({ id: 'done',   due: '2026-11-20', completedAt: '2026-11-01T00:00:00.000Z' }),
    ]);
    const { alive } = grouped(state, TODAY);
    expect(alive).toHaveLength(1);
    expect(alive[0].id).toBe('active');
  });

  it('empty state returns three empty arrays', () => {
    const { dying, alive, graveyard } = grouped(makeState([]), TODAY);
    expect(dying).toHaveLength(0);
    expect(alive).toHaveLength(0);
    expect(graveyard).toHaveLength(0);
  });
});

// =========================================================================
// addDeadline — Task 3: validation errors
// =========================================================================
describe('addDeadline — validation', () => {
  it('returns error when title is empty', () => {
    const result = addDeadline(makeState(), { title: '', due: '2026-11-10' });
    expect(result.error).toBeTruthy();
    expect(result.field).toBe('title');
    expect(result.ok).toBeUndefined();
  });

  it('returns error when title is whitespace only', () => {
    const result = addDeadline(makeState(), { title: '   ', due: '2026-11-10' });
    expect(result.error).toBeTruthy();
    expect(result.field).toBe('title');
  });

  it('returns error when due is empty', () => {
    const result = addDeadline(makeState(), { title: 'Thesis', due: '' });
    expect(result.error).toBeTruthy();
    expect(result.field).toBe('due');
    expect(result.ok).toBeUndefined();
  });

  it('returns error when due is null/undefined', () => {
    const result = addDeadline(makeState(), { title: 'Thesis', due: null });
    expect(result.error).toBeTruthy();
    expect(result.field).toBe('due');
  });

  it('returns error for invalid date format', () => {
    const result = addDeadline(makeState(), { title: 'Thesis', due: 'not-a-date' });
    expect(result.error).toBeTruthy();
    expect(result.field).toBe('due');
  });

  it('succeeds with valid title and due', () => {
    const result = addDeadline(makeState(), { title: 'Thesis', due: '2026-12-01' });
    expect(result.ok).toBeTruthy();
    expect(result.error).toBeUndefined();
    expect(result.ok.deadline.title).toBe('Thesis');
    expect(result.ok.deadline.due).toBe('2026-12-01');
    expect(result.ok.deadline.id).toBeTruthy();
    expect(result.ok.deadline.completedAt).toBeNull();
  });

  it('trims whitespace from title and due', () => {
    const result = addDeadline(makeState(), { title: '  Exam  ', due: '2026-12-01' });
    expect(result.ok.deadline.title).toBe('Exam');
  });

  it('stores null category when none provided', () => {
    const result = addDeadline(makeState(), { title: 'Exam', due: '2026-12-01' });
    expect(result.ok.deadline.category).toBeNull();
  });

  it('stores category when provided', () => {
    const result = addDeadline(makeState(), {
      title: 'Exam', due: '2026-12-01', category: 'School',
    });
    expect(result.ok.deadline.category).toBe('School');
  });

  it('new deadline is added to state.deadlines', () => {
    const state = makeState();
    const result = addDeadline(state, { title: 'Test', due: '2026-12-01' });
    expect(result.ok.state.deadlines).toHaveLength(1);
    expect(result.ok.state.deadlines[0].id).toBe(result.ok.deadline.id);
  });

  it('does not mutate original state', () => {
    const state = makeState([makeDeadline()]);
    const result = addDeadline(state, { title: 'New', due: '2026-12-01' });
    expect(state.deadlines).toHaveLength(1);       // original unchanged
    expect(result.ok.state.deadlines).toHaveLength(2);
  });
});

// =========================================================================
// completeDeadline — Task 3: completion tests
// =========================================================================
describe('completeDeadline', () => {
  it('marks a deadline as completed', () => {
    const d = makeDeadline({ id: 'abc' });
    const state = makeState([d]);
    const result = completeDeadline(state, 'abc');
    expect(result.ok).toBeTruthy();
    const updated = result.ok.state.deadlines.find(x => x.id === 'abc');
    expect(updated.completedAt).toBeTruthy();
  });

  it('returns error for unknown id', () => {
    const state = makeState([makeDeadline({ id: 'real' })]);
    const result = completeDeadline(state, 'ghost');
    expect(result.error).toBeTruthy();
    expect(result.ok).toBeUndefined();
  });

  it('returns error when already completed', () => {
    const d = makeDeadline({ id: 'done', completedAt: '2026-11-01T00:00:00.000Z' });
    const state = makeState([d]);
    const result = completeDeadline(state, 'done');
    expect(result.error).toBeTruthy();
  });

  it('completed item is excluded from active buckets', () => {
    const d = makeDeadline({ id: 'abc', due: '2026-11-20' });
    const state = makeState([d]);
    const { ok } = completeDeadline(state, 'abc');
    const { alive, dying, graveyard } = grouped(ok.state, TODAY);
    expect(alive).toHaveLength(0);
    expect(dying).toHaveLength(0);
    expect(graveyard).toHaveLength(0);
  });

  it('accepts a custom now timestamp', () => {
    const d = makeDeadline({ id: 'abc' });
    const state = makeState([d]);
    const ts = '2026-11-05T10:00:00.000Z';
    const result = completeDeadline(state, 'abc', ts);
    expect(result.ok.state.deadlines[0].completedAt).toBe(ts);
  });

  it('does not mutate original state', () => {
    const d = makeDeadline({ id: 'abc' });
    const state = makeState([d]);
    completeDeadline(state, 'abc');
    expect(state.deadlines[0].completedAt).toBeNull();
  });
});

// =========================================================================
// resurrectDeadline — Task 3: resurrect only from Dead
// =========================================================================
describe('resurrectDeadline', () => {
  it('resurrects a dead deadline with a new due date', () => {
    const d = makeDeadline({ id: 'dead1', due: '2026-10-25' }); // past → dead
    const state = makeState([d]);
    const result = resurrectDeadline(state, 'dead1', '2026-11-20', TODAY);
    expect(result.ok).toBeTruthy();
    const updated = result.ok.state.deadlines.find(x => x.id === 'dead1');
    expect(updated.due).toBe('2026-11-20');
    expect(updated.completedAt).toBeNull();
  });

  it('resurrected deadline appears in alive bucket after new due', () => {
    const d = makeDeadline({ id: 'dead1', due: '2026-10-25' });
    const state = makeState([d]);
    const { ok } = resurrectDeadline(state, 'dead1', '2026-11-20', TODAY);
    const { alive } = grouped(ok.state, TODAY);
    expect(alive[0].id).toBe('dead1');
  });

  it('returns error when item is alive (not dead)', () => {
    const d = makeDeadline({ id: 'alive1', due: '2026-11-20' }); // future → alive
    const state = makeState([d]);
    const result = resurrectDeadline(state, 'alive1', '2026-12-01', TODAY);
    expect(result.error).toBeTruthy();
    expect(result.ok).toBeUndefined();
  });

  it('returns error when item is dying (not dead)', () => {
    const d = makeDeadline({ id: 'dying1', due: '2026-11-02' }); // 1 day → dying
    const state = makeState([d]);
    const result = resurrectDeadline(state, 'dying1', '2026-12-01', TODAY);
    expect(result.error).toBeTruthy();
  });

  it('returns error when item is already completed (done)', () => {
    const d = makeDeadline({
      id: 'done1',
      due: '2026-10-25',
      completedAt: '2026-10-25T00:00:00.000Z',
    });
    const state = makeState([d]);
    const result = resurrectDeadline(state, 'done1', '2026-12-01', TODAY);
    expect(result.error).toBeTruthy();
  });

  it('returns error for unknown id', () => {
    const state = makeState([makeDeadline()]);
    const result = resurrectDeadline(state, 'ghost', '2026-12-01', TODAY);
    expect(result.error).toBeTruthy();
  });

  it('returns error when newDue is empty', () => {
    const d = makeDeadline({ id: 'dead1', due: '2026-10-25' });
    const state = makeState([d]);
    const result = resurrectDeadline(state, 'dead1', '', TODAY);
    expect(result.error).toBeTruthy();
    expect(result.field).toBe('newDue');
  });

  it('returns error when newDue has invalid format', () => {
    const d = makeDeadline({ id: 'dead1', due: '2026-10-25' });
    const state = makeState([d]);
    const result = resurrectDeadline(state, 'dead1', 'bad-date', TODAY);
    expect(result.error).toBeTruthy();
    expect(result.field).toBe('newDue');
  });

  it('does not mutate original state', () => {
    const d = makeDeadline({ id: 'dead1', due: '2026-10-25' });
    const state = makeState([d]);
    resurrectDeadline(state, 'dead1', '2026-12-01', TODAY);
    expect(state.deadlines[0].due).toBe('2026-10-25');
  });
});

// =========================================================================
// Integration: full lifecycle
// =========================================================================
describe('full lifecycle', () => {
  it('add → appears in alive → complete → excluded from all buckets', () => {
    let state = makeState();

    const addResult = addDeadline(state, { title: 'Big Exam', due: '2026-11-20' });
    expect(addResult.ok).toBeTruthy();
    state = addResult.ok.state;

    const { alive: before } = grouped(state, TODAY);
    expect(before).toHaveLength(1);

    const id = addResult.ok.deadline.id;
    const completeResult = completeDeadline(state, id);
    expect(completeResult.ok).toBeTruthy();
    state = completeResult.ok.state;

    const { dying, alive, graveyard } = grouped(state, TODAY);
    expect(dying).toHaveLength(0);
    expect(alive).toHaveLength(0);
    expect(graveyard).toHaveLength(0);
  });

  it('add → becomes dead → resurrect → appears in correct bucket', () => {
    let state = makeState();

    const addResult = addDeadline(state, { title: 'Old Assignment', due: '2026-10-20' });
    state = addResult.ok.state;
    const id = addResult.ok.deadline.id;

    const { graveyard: before } = grouped(state, TODAY);
    expect(before).toHaveLength(1);

    const resurrectResult = resurrectDeadline(state, id, '2026-11-20', TODAY);
    expect(resurrectResult.ok).toBeTruthy();
    state = resurrectResult.ok.state;

    const { graveyard: after, alive } = grouped(state, TODAY);
    expect(after).toHaveLength(0);
    expect(alive).toHaveLength(1);
  });
});
