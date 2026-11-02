/**
 * store-integration.test.js — export/import tests for Pantry Ghost
 *
 * Verifies:
 *  - Round-trip: export then import restores the full dataset
 *  - Version-refusal: importing a snapshot with a different version throws
 *  - Corrupt JSON is refused
 *  - Import merges into (and overwrites) existing data
 *
 * Run with: bun test
 */

import { describe, it, expect } from 'bun:test';
import { makeStore, memoryBackend } from './store.js';
import { addItem, removeItem, pantryList } from './model.js';

const STORE_VERSION = 1;
const STORE_KEY = 'pantry-ghost';

function freshStore(version = STORE_VERSION) {
  return makeStore({ backend: memoryBackend(), version });
}

/** Build a state with several items and save it to a store. */
function populatedStore() {
  const store = freshStore();
  let state = { items: [] };

  state = addItem(state, { id: 'a', name: 'Milk',    expiresOn: '2026-11-06', now: new Date('2026-11-02') });
  state = addItem(state, { id: 'b', name: 'Cheese',  expiresOn: '2026-11-04', now: new Date('2026-11-02') });
  state = addItem(state, { id: 'c', name: 'Leftovers', expiresOn: '2026-10-30', now: new Date('2026-11-02') }); // spoiled

  store.set(STORE_KEY, state);
  return { store, state };
}

// =========================================================================
// Round-trip: export → import → data unchanged
// =========================================================================
describe('store — round-trip (export → import)', () => {
  it('restores all items after a round-trip', () => {
    const { store: src, state: originalState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    const restored = dst.get(STORE_KEY);
    expect(restored).toEqual(originalState);
  });

  it('round-tripped state has the same item count', () => {
    const { store: src, state: originalState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    expect(dst.get(STORE_KEY).items).toHaveLength(originalState.items.length);
  });

  it('item fields are preserved exactly', () => {
    const { store: src, state: originalState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    const restored = dst.get(STORE_KEY);
    for (let i = 0; i < originalState.items.length; i++) {
      expect(restored.items[i]).toEqual(originalState.items[i]);
    }
  });

  it('export → import → re-export produces the same data object', () => {
    const { store: src } = populatedStore();
    const json1 = src.exportJSON();

    const mid = freshStore();
    mid.importJSON(json1);
    const json2 = mid.exportJSON();

    expect(JSON.parse(json2).data).toEqual(JSON.parse(json1).data);
  });

  it('import merges without deleting unrelated keys', () => {
    const { store: src } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.set('unrelated-key', 'preserved');
    dst.importJSON(json);

    expect(dst.get('unrelated-key')).toBe('preserved');
    expect(dst.get(STORE_KEY)).toBeTruthy();
  });

  it('import overwrites a key that already exists in the destination', () => {
    const { store: src, state: newState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.set(STORE_KEY, { items: [] }); // old, empty data
    dst.importJSON(json);

    expect(dst.get(STORE_KEY)).toEqual(newState);
  });

  it('pantryList works correctly on round-tripped state', () => {
    const { store: src } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    const state = dst.get(STORE_KEY);
    const list  = pantryList(state, '2026-11-02');

    // Items should be sorted soonest first: Leftovers (past), Cheese (+2), Milk (+4)
    expect(list[0].id).toBe('c'); // Leftovers — spoiled
    expect(list[1].id).toBe('b'); // Cheese — fading
    expect(list[2].id).toBe('a'); // Milk — fresh
  });
});

// =========================================================================
// Version-refusal
// =========================================================================
describe('store — version-refusal', () => {
  it('refuses a snapshot with a higher version', () => {
    const src = freshStore(2);
    src.set(STORE_KEY, { items: [] });
    const json = src.exportJSON();

    const dst = freshStore(1);
    expect(() => dst.importJSON(json)).toThrow(/version mismatch/i);
  });

  it('refuses a snapshot with a lower version', () => {
    const src = freshStore(1);
    src.set(STORE_KEY, { items: [] });
    const json = src.exportJSON();

    const dst = freshStore(2);
    expect(() => dst.importJSON(json)).toThrow(/version mismatch/i);
  });

  it('does not modify the store when import is refused', () => {
    const store = freshStore(1);
    store.set(STORE_KEY, { items: [{ id: 'original' }] });

    const badJson = JSON.stringify({ version: 99, exportedAt: '', data: {} });
    expect(() => store.importJSON(badJson)).toThrow();

    expect(store.get(STORE_KEY).items[0].id).toBe('original');
  });

  it('refuses corrupt / non-JSON input', () => {
    const store = freshStore();
    expect(() => store.importJSON('not valid json')).toThrow();
  });

  it('refuses input with missing data field', () => {
    const store = freshStore(1);
    const bad = JSON.stringify({ version: 1, exportedAt: new Date().toISOString() });
    expect(() => store.importJSON(bad)).toThrow(/missing data/i);
  });

  it('accepts a valid same-version snapshot without error', () => {
    const src = freshStore(1);
    src.set(STORE_KEY, { items: [] });
    const json = src.exportJSON();

    const dst = freshStore(1);
    expect(() => dst.importJSON(json)).not.toThrow();
  });
});

// =========================================================================
// Remove + round-trip
// =========================================================================
describe('store — remove then round-trip', () => {
  it('removed items are absent after export→import', () => {
    let state = { items: [] };
    state = addItem(state, { id: 'x', name: 'Yogurt', expiresOn: '2026-11-10' });
    state = addItem(state, { id: 'y', name: 'Juice',  expiresOn: '2026-11-15' });
    state = removeItem(state, 'x');

    const src = freshStore();
    src.set(STORE_KEY, state);
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    const restored = dst.get(STORE_KEY);
    expect(restored.items).toHaveLength(1);
    expect(restored.items[0].id).toBe('y');
  });
});
