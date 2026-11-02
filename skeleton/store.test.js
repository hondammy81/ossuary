/**
 * store.test.js — tests for skeleton/store.js
 * Run with: bun test
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { makeStore, memoryBackend, localStorageBackend } from './store.js';

// ---- helpers ------------------------------------------------------------

function freshStore(version = 1) {
  return makeStore({ backend: memoryBackend(), version });
}

// =========================================================================
// makeStore — validation
// =========================================================================
describe('makeStore — validation', () => {
  it('throws for non-integer version', () => {
    expect(() => makeStore({ backend: memoryBackend(), version: 1.5 })).toThrow();
  });

  it('throws for version < 1', () => {
    expect(() => makeStore({ backend: memoryBackend(), version: 0 })).toThrow();
  });

  it('throws for missing backend', () => {
    expect(() => makeStore({ backend: null, version: 1 })).toThrow();
  });

  it('throws for non-string version', () => {
    expect(() => makeStore({ backend: memoryBackend(), version: '1' })).toThrow();
  });
});

// =========================================================================
// get / set / delete / keys
// =========================================================================
describe('store — get / set / delete / keys', () => {
  let store;
  beforeEach(() => { store = freshStore(); });

  it('returns undefined for missing key', () => {
    expect(store.get('missing')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    store.set('name', 'Ossuary');
    expect(store.get('name')).toBe('Ossuary');
  });

  it('stores and retrieves an object', () => {
    const obj = { title: 'Test', count: 3 };
    store.set('item', obj);
    expect(store.get('item')).toEqual(obj);
  });

  it('overwrites an existing key', () => {
    store.set('x', 1);
    store.set('x', 2);
    expect(store.get('x')).toBe(2);
  });

  it('delete removes the key', () => {
    store.set('y', 99);
    store.delete('y');
    expect(store.get('y')).toBeUndefined();
  });

  it('delete on absent key does not throw', () => {
    expect(() => store.delete('ghost')).not.toThrow();
  });

  it('keys returns all stored keys', () => {
    store.set('a', 1);
    store.set('b', 2);
    expect(store.keys().sort()).toEqual(['a', 'b']);
  });

  it('keys returns empty array for empty store', () => {
    expect(store.keys()).toEqual([]);
  });
});

// =========================================================================
// clear
// =========================================================================
describe('store — clear', () => {
  it('removes all keys', () => {
    const store = freshStore();
    store.set('p', 1);
    store.set('q', 2);
    store.clear();
    expect(store.keys()).toHaveLength(0);
  });
});

// =========================================================================
// exportJSON
// =========================================================================
describe('store — exportJSON', () => {
  it('produces valid JSON', () => {
    const store = freshStore(2);
    store.set('foo', 'bar');
    const json = store.exportJSON();
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('envelope contains correct version', () => {
    const store = freshStore(3);
    store.set('k', 'v');
    const { version } = JSON.parse(store.exportJSON());
    expect(version).toBe(3);
  });

  it('envelope contains exportedAt timestamp', () => {
    const store = freshStore();
    const { exportedAt } = JSON.parse(store.exportJSON());
    expect(typeof exportedAt).toBe('string');
    expect(new Date(exportedAt).getTime()).toBeGreaterThan(0);
  });

  it('envelope data contains stored values', () => {
    const store = freshStore();
    store.set('title', 'Ossuary');
    store.set('count', 7);
    const { data } = JSON.parse(store.exportJSON());
    expect(data.title).toBe('Ossuary');
    expect(data.count).toBe(7);
  });

  it('empty store exports empty data object', () => {
    const store = freshStore();
    const { data } = JSON.parse(store.exportJSON());
    expect(data).toEqual({});
  });
});

// =========================================================================
// importJSON
// =========================================================================
describe('store — importJSON', () => {
  it('imports data from a matching-version snapshot', () => {
    const src = freshStore(1);
    src.set('item1', { x: 10 });
    const json = src.exportJSON();

    const dst = freshStore(1);
    dst.importJSON(json);
    expect(dst.get('item1')).toEqual({ x: 10 });
  });

  it('merges imported keys with existing keys', () => {
    const src = freshStore(1);
    src.set('new', 42);
    const json = src.exportJSON();

    const dst = freshStore(1);
    dst.set('existing', 'kept');
    dst.importJSON(json);

    expect(dst.get('existing')).toBe('kept');
    expect(dst.get('new')).toBe(42);
  });

  it('overwrites keys present in both snapshot and store', () => {
    const src = freshStore(1);
    src.set('shared', 'snapshot-value');

    const dst = freshStore(1);
    dst.set('shared', 'original-value');
    dst.importJSON(src.exportJSON());

    expect(dst.get('shared')).toBe('snapshot-value');
  });

  it('throws on version mismatch — snapshot v1 into store v2', () => {
    const src = freshStore(1);
    src.set('k', 'v');
    const json = src.exportJSON();

    const dst = freshStore(2);
    expect(() => dst.importJSON(json)).toThrow(/version mismatch/i);
  });

  it('throws on version mismatch — snapshot v3 into store v1', () => {
    const src = freshStore(3);
    const json = src.exportJSON();

    const dst = freshStore(1);
    expect(() => dst.importJSON(json)).toThrow(/version mismatch/i);
  });

  it('throws on invalid JSON string', () => {
    const store = freshStore();
    expect(() => store.importJSON('not-json')).toThrow();
  });

  it('throws on missing data field', () => {
    const store = freshStore(1);
    const bad = JSON.stringify({ version: 1, exportedAt: new Date().toISOString() });
    expect(() => store.importJSON(bad)).toThrow(/missing data/i);
  });

  it('does not modify store when import throws', () => {
    const store = freshStore(1);
    store.set('safe', 'value');

    const badJson = JSON.stringify({ version: 99, exportedAt: '', data: {} });
    expect(() => store.importJSON(badJson)).toThrow();

    expect(store.get('safe')).toBe('value');
  });
});

// =========================================================================
// memoryBackend isolation
// =========================================================================
describe('memoryBackend — isolation', () => {
  it('two stores with separate backends do not share data', () => {
    const a = makeStore({ backend: memoryBackend(), version: 1 });
    const b = makeStore({ backend: memoryBackend(), version: 1 });
    a.set('x', 'from-a');
    expect(b.get('x')).toBeUndefined();
  });
});

// =========================================================================
// round-trip: export → import → export
// =========================================================================
describe('store — round-trip', () => {
  it('two exports of same data are structurally equal', () => {
    const a = freshStore(1);
    a.set('foo', [1, 2, 3]);
    a.set('bar', { nested: true });

    const json = a.exportJSON();
    const b = freshStore(1);
    b.importJSON(json);

    expect(JSON.parse(b.exportJSON()).data).toEqual(JSON.parse(json).data);
  });
});
