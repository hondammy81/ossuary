/**
 * model.test.js — tests for apps/pantry-ghost/model.js
 * Run with: bun test
 */

import { describe, it, expect } from 'bun:test';
import {
  addItem,
  freshness,
  pantryList,
  removeItem,
  pantrySummary,
} from './model.js';

// =========================================================================
// Helpers
// =========================================================================

const TODAY = '2026-11-02';

/** Build an empty app state. */
function emptyState() {
  return { items: [] };
}

/**
 * Add one item with a fixed id for deterministic tests.
 */
function stateWithItem({ name = 'Milk', expiresOn = '2026-11-10', id = 'item-1' } = {}) {
  return addItem(emptyState(), { id, name, expiresOn, now: new Date(TODAY) });
}

// =========================================================================
// addItem
// =========================================================================
describe('addItem', () => {
  it('adds a valid item to an empty pantry', () => {
    const state = addItem(emptyState(), { id: 'x', name: 'Eggs', expiresOn: '2026-11-10', now: new Date(TODAY) });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].name).toBe('Eggs');
    expect(state.items[0].expiresOn).toBe('2026-11-10');
  });

  it('trims whitespace from name', () => {
    const state = addItem(emptyState(), { id: 'x', name: '  Butter  ', expiresOn: '2026-11-15', now: new Date(TODAY) });
    expect(state.items[0].name).toBe('Butter');
  });

  it('returns unchanged state for empty name', () => {
    const state = addItem(emptyState(), { name: '', expiresOn: '2026-11-10' });
    expect(state.items).toHaveLength(0);
  });

  it('returns unchanged state for whitespace-only name', () => {
    const state = addItem(emptyState(), { name: '   ', expiresOn: '2026-11-10' });
    expect(state.items).toHaveLength(0);
  });

  it('returns unchanged state for missing expiresOn', () => {
    const state = addItem(emptyState(), { name: 'Milk', expiresOn: undefined });
    expect(state.items).toHaveLength(0);
  });

  it('returns unchanged state for invalid date string', () => {
    const state = addItem(emptyState(), { name: 'Milk', expiresOn: 'not-a-date' });
    expect(state.items).toHaveLength(0);
  });

  it('returns unchanged state for impossible date (Feb 30)', () => {
    const state = addItem(emptyState(), { name: 'Milk', expiresOn: '2026-02-30' });
    expect(state.items).toHaveLength(0);
  });

  it('does not mutate original state', () => {
    const state = emptyState();
    addItem(state, { id: 'y', name: 'Yogurt', expiresOn: '2026-11-10' });
    expect(state.items).toHaveLength(0);
  });

  it('appends to existing items', () => {
    const s1 = addItem(emptyState(), { id: 'a', name: 'Cheese', expiresOn: '2026-11-05' });
    const s2 = addItem(s1, { id: 'b', name: 'Ham', expiresOn: '2026-11-08' });
    expect(s2.items).toHaveLength(2);
  });
});

// =========================================================================
// freshness — boundary days
// =========================================================================
describe('freshness — boundary days', () => {
  it('yesterday (diff = -1) → spoiled', () => {
    const item = { expiresOn: '2026-11-01' }; // 1 day before TODAY
    expect(freshness(item, TODAY)).toBe('spoiled');
  });

  it('today (diff = 0) → fading', () => {
    const item = { expiresOn: '2026-11-02' }; // same as TODAY
    expect(freshness(item, TODAY)).toBe('fading');
  });

  it('+1 day (diff = 1) → fading', () => {
    const item = { expiresOn: '2026-11-03' };
    expect(freshness(item, TODAY)).toBe('fading');
  });

  it('+3 days (diff = 3) → fading', () => {
    const item = { expiresOn: '2026-11-05' };
    expect(freshness(item, TODAY)).toBe('fading');
  });

  it('+4 days (diff = 4) → fresh', () => {
    const item = { expiresOn: '2026-11-06' };
    expect(freshness(item, TODAY)).toBe('fresh');
  });

  it('far future → fresh', () => {
    const item = { expiresOn: '2027-06-01' };
    expect(freshness(item, TODAY)).toBe('fresh');
  });

  it('well in the past → spoiled', () => {
    const item = { expiresOn: '2025-01-01' };
    expect(freshness(item, TODAY)).toBe('spoiled');
  });

  it('accepts a Date object as now', () => {
    const item = { expiresOn: '2026-11-02' };
    expect(freshness(item, new Date('2026-11-02'))).toBe('fading');
  });
});

// =========================================================================
// pantryList — sort order and annotation
// =========================================================================
describe('pantryList', () => {
  it('returns empty array for empty state', () => {
    expect(pantryList(emptyState(), TODAY)).toEqual([]);
  });

  it('sorts items by expiresOn ascending (soonest first)', () => {
    let state = emptyState();
    state = addItem(state, { id: 'c', name: 'Cream',   expiresOn: '2026-11-20' });
    state = addItem(state, { id: 'a', name: 'Apple',   expiresOn: '2026-11-03' });
    state = addItem(state, { id: 'b', name: 'Bread',   expiresOn: '2026-11-10' });

    const list = pantryList(state, TODAY);
    expect(list.map(i => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('annotates each item with freshness and daysLeft', () => {
    const state = stateWithItem({ name: 'Milk', expiresOn: '2026-11-06' }); // +4 days
    const list  = pantryList(state, TODAY);
    expect(list[0].freshness).toBe('fresh');
    expect(list[0].daysLeft).toBe(4);
  });

  it('daysLeft is negative for spoiled items', () => {
    const state = stateWithItem({ name: 'Milk', expiresOn: '2026-10-30' }); // past
    const list  = pantryList(state, TODAY);
    expect(list[0].freshness).toBe('spoiled');
    expect(list[0].daysLeft).toBeLessThan(0);
  });

  it('does not mutate original state items array', () => {
    const state = stateWithItem();
    const before = state.items.length;
    pantryList(state, TODAY);
    expect(state.items.length).toBe(before);
  });
});

// =========================================================================
// removeItem
// =========================================================================
describe('removeItem', () => {
  it('removes an item by id', () => {
    const state = stateWithItem({ id: 'item-1' });
    const next  = removeItem(state, 'item-1');
    expect(next.items).toHaveLength(0);
  });

  it('returns unchanged state for unknown id', () => {
    const state = stateWithItem({ id: 'item-1' });
    const next  = removeItem(state, 'ghost');
    expect(next.items).toHaveLength(1);
    expect(next).toBe(state); // same reference — no mutation
  });

  it('does not mutate original state', () => {
    const state = stateWithItem({ id: 'item-1' });
    removeItem(state, 'item-1');
    expect(state.items).toHaveLength(1);
  });

  it('removes only the targeted item when multiple exist', () => {
    let state = emptyState();
    state = addItem(state, { id: 'a', name: 'Apple', expiresOn: '2026-11-10' });
    state = addItem(state, { id: 'b', name: 'Bread', expiresOn: '2026-11-12' });
    const next = removeItem(state, 'a');
    expect(next.items).toHaveLength(1);
    expect(next.items[0].id).toBe('b');
  });
});

// =========================================================================
// pantrySummary
// =========================================================================
describe('pantrySummary', () => {
  it('returns zeros for empty state', () => {
    expect(pantrySummary(emptyState(), TODAY)).toEqual({ fresh: 0, fading: 0, spoiled: 0 });
  });

  it('counts fresh, fading, and spoiled items correctly', () => {
    let state = emptyState();
    // fresh: +4 days
    state = addItem(state, { id: 'a', name: 'Apple',  expiresOn: '2026-11-06' });
    state = addItem(state, { id: 'b', name: 'Butter', expiresOn: '2026-11-09' });
    // fading: today (0 days)
    state = addItem(state, { id: 'c', name: 'Cream',  expiresOn: '2026-11-02' }); // today
    state = addItem(state, { id: 'd', name: 'Dip',    expiresOn: '2026-11-04' }); // +2 days
    // spoiled: past
    state = addItem(state, { id: 'e', name: 'Egg',    expiresOn: '2026-10-30' });

    const summary = pantrySummary(state, TODAY);
    expect(summary.fresh).toBe(2);
    expect(summary.fading).toBe(2);
    expect(summary.spoiled).toBe(1);
  });
});

// =========================================================================
// Integration: full lifecycle
// =========================================================================
describe('full lifecycle', () => {
  it('add → list → remove → list is empty', () => {
    let state = emptyState();
    state = addItem(state, { id: 'x', name: 'Yogurt', expiresOn: '2026-11-10' });
    expect(pantryList(state, TODAY)).toHaveLength(1);

    state = removeItem(state, 'x');
    expect(pantryList(state, TODAY)).toHaveLength(0);
  });

  it('invalid add is silently refused — list unchanged', () => {
    let state = emptyState();
    state = addItem(state, { id: 'a', name: 'Apple', expiresOn: '2026-11-10' });
    state = addItem(state, { id: 'b', name: '',      expiresOn: '2026-11-10' }); // invalid
    state = addItem(state, { id: 'c', name: 'Cake',  expiresOn: 'bad-date' });   // invalid

    expect(state.items).toHaveLength(1);
  });

  it('summary reflects freshness distribution correctly', () => {
    let state = emptyState();
    // 1 fresh, 1 fading, 1 spoiled
    state = addItem(state, { id: 'a', name: 'Apple',   expiresOn: '2026-11-06' }); // +4 fresh
    state = addItem(state, { id: 'b', name: 'Bread',   expiresOn: '2026-11-05' }); // +3 fading
    state = addItem(state, { id: 'c', name: 'Carrots', expiresOn: '2026-11-01' }); // past spoiled

    const s = pantrySummary(state, TODAY);
    expect(s).toEqual({ fresh: 1, fading: 1, spoiled: 1 });
  });

  it('boundary at exactly +3 days is fading, +4 is fresh', () => {
    let state = emptyState();
    state = addItem(state, { id: 'a', name: 'A', expiresOn: '2026-11-05' }); // +3 = fading
    state = addItem(state, { id: 'b', name: 'B', expiresOn: '2026-11-06' }); // +4 = fresh

    const list = pantryList(state, TODAY);
    expect(list.find(i => i.id === 'a').freshness).toBe('fading');
    expect(list.find(i => i.id === 'b').freshness).toBe('fresh');
  });

  it('sort order is stable: spoiled first, then fading, then fresh', () => {
    let state = emptyState();
    state = addItem(state, { id: 'f', name: 'Fresh', expiresOn: '2026-11-10' }); // fresh
    state = addItem(state, { id: 's', name: 'Spoil', expiresOn: '2026-10-29' }); // spoiled
    state = addItem(state, { id: 'd', name: 'Fading', expiresOn: '2026-11-04' }); // fading

    const ids = pantryList(state, TODAY).map(i => i.id);
    expect(ids).toEqual(['s', 'd', 'f']); // soonest expiresOn first
  });
});
