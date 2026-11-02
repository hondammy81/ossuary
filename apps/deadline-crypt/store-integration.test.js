/**
 * store-integration.test.js — export/import tests for Deadline Crypt
 *
 * Verifies:
 *  - Round-trip: export then import restores the full dataset
 *  - Version-refusal: importing a snapshot with a different version throws
 *  - Corrupt JSON is refused
 *  - Import merges into (and overwrites) existing data
 *
 * Run with: bun test
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { makeStore, memoryBackend } from './store.js';
import { addDeadline } from './model.js';

const STORE_VERSION = 1;
const STORE_KEY = 'deadline-crypt';

function freshStore(version = STORE_VERSION) {
  return makeStore({ backend: memoryBackend(), version });
}

/** Build a small state with two deadlines and save it to a store. */
function populatedStore() {
  const store = freshStore();
  let state = { deadlines: [] };

  state = addDeadline(state, { title: 'Thesis draft', due: '2026-12-01' }).ok.state;
  state = addDeadline(state, { title: 'Tax return',   due: '2027-04-15', category: 'Finance' }).ok.state;

  store.set(STORE_KEY, state);
  return { store, state };
}

// =========================================================================
// Round-trip: export → import → data unchanged
// =========================================================================
describe('store — round-trip (export → import)', () => {
  it('restores all deadlines after a round-trip', () => {
    const { store: src, state: originalState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    const restored = dst.get(STORE_KEY);
    expect(restored).toEqual(originalState);
  });

  it('round-tripped state has the same deadline count', () => {
    const { store: src, state: originalState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    expect(dst.get(STORE_KEY).deadlines).toHaveLength(
      originalState.deadlines.length,
    );
  });

  it('deadline fields are preserved exactly', () => {
    const { store: src, state: originalState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    const restored = dst.get(STORE_KEY);
    for (let i = 0; i < originalState.deadlines.length; i++) {
      expect(restored.deadlines[i]).toEqual(originalState.deadlines[i]);
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
    dst.set(STORE_KEY, { deadlines: [] }); // old, different data
    dst.importJSON(json);

    expect(dst.get(STORE_KEY)).toEqual(newState);
  });
});

// =========================================================================
// Version-refusal
// =========================================================================
describe('store — version-refusal', () => {
  it('refuses a snapshot with a higher version', () => {
    const src = freshStore(2);
    src.set(STORE_KEY, { deadlines: [] });
    const json = src.exportJSON();

    const dst = freshStore(1); // store is v1, snapshot is v2
    expect(() => dst.importJSON(json)).toThrow(/version mismatch/i);
  });

  it('refuses a snapshot with a lower version', () => {
    const src = freshStore(1);
    src.set(STORE_KEY, { deadlines: [] });
    const json = src.exportJSON();

    const dst = freshStore(2); // store is v2, snapshot is v1
    expect(() => dst.importJSON(json)).toThrow(/version mismatch/i);
  });

  it('does not modify the store when import is refused', () => {
    const store = freshStore(1);
    store.set(STORE_KEY, { deadlines: [{ id: 'original' }] });

    const badJson = JSON.stringify({ version: 99, exportedAt: '', data: {} });
    expect(() => store.importJSON(badJson)).toThrow();

    // Original data must still be intact
    expect(store.get(STORE_KEY).deadlines[0].id).toBe('original');
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
    src.set(STORE_KEY, { deadlines: [] });
    const json = src.exportJSON();

    const dst = freshStore(1);
    expect(() => dst.importJSON(json)).not.toThrow();
  });
});
