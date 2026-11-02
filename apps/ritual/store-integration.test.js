/**
 * store-integration.test.js — export/import tests for Ritual
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
import { addRitual, checkIn } from './model.js';

const STORE_VERSION = 1;
const STORE_KEY = 'ritual';

function freshStore(version = STORE_VERSION) {
  return makeStore({ backend: memoryBackend(), version });
}

/** Build a state with two rituals, one with check-ins, and save it to a store. */
function populatedStore() {
  const store = freshStore();
  let state = { rituals: [], checkins: {} };

  state = addRitual(state, 'Morning Pages').ok.state;
  const id1 = state.rituals[0].id;
  state = checkIn(state, id1, '2026-10-31').ok.state;
  state = checkIn(state, id1, '2026-11-01').ok.state;

  state = addRitual(state, 'Evening Walk').ok.state;
  const id2 = state.rituals[1].id;
  state = checkIn(state, id2, '2026-11-01').ok.state;

  store.set(STORE_KEY, state);
  return { store, state };
}

// =========================================================================
// Round-trip: export → import → data unchanged
// =========================================================================
describe('store — round-trip (export → import)', () => {
  it('restores all rituals and check-ins after a round-trip', () => {
    const { store: src, state: originalState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    const restored = dst.get(STORE_KEY);
    expect(restored).toEqual(originalState);
  });

  it('round-tripped state has the same ritual count', () => {
    const { store: src, state: originalState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    expect(dst.get(STORE_KEY).rituals).toHaveLength(originalState.rituals.length);
  });

  it('ritual fields are preserved exactly', () => {
    const { store: src, state: originalState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    const restored = dst.get(STORE_KEY);
    for (let i = 0; i < originalState.rituals.length; i++) {
      expect(restored.rituals[i]).toEqual(originalState.rituals[i]);
    }
  });

  it('check-in history is preserved exactly', () => {
    const { store: src, state: originalState } = populatedStore();
    const json = src.exportJSON();

    const dst = freshStore();
    dst.importJSON(json);

    const restored = dst.get(STORE_KEY);
    expect(restored.checkins).toEqual(originalState.checkins);
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
    dst.set(STORE_KEY, { rituals: [], checkins: {} }); // old, empty data
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
    src.set(STORE_KEY, { rituals: [], checkins: {} });
    const json = src.exportJSON();

    const dst = freshStore(1);
    expect(() => dst.importJSON(json)).toThrow(/version mismatch/i);
  });

  it('refuses a snapshot with a lower version', () => {
    const src = freshStore(1);
    src.set(STORE_KEY, { rituals: [], checkins: {} });
    const json = src.exportJSON();

    const dst = freshStore(2);
    expect(() => dst.importJSON(json)).toThrow(/version mismatch/i);
  });

  it('does not modify the store when import is refused', () => {
    const store = freshStore(1);
    store.set(STORE_KEY, { rituals: [{ id: 'original' }], checkins: {} });

    const badJson = JSON.stringify({ version: 99, exportedAt: '', data: {} });
    expect(() => store.importJSON(badJson)).toThrow();

    expect(store.get(STORE_KEY).rituals[0].id).toBe('original');
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
    src.set(STORE_KEY, { rituals: [], checkins: {} });
    const json = src.exportJSON();

    const dst = freshStore(1);
    expect(() => dst.importJSON(json)).not.toThrow();
  });
});
