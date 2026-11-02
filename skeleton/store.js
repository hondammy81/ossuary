/**
 * store.js — Ossuary versioned store
 *
 * A thin, versioned key-value store over an injectable backend.
 * Apps supply a localStorage adapter; tests supply an in-memory one.
 *
 * Usage:
 *   import { makeStore, localStorageBackend } from './store.js';
 *   const store = makeStore({ backend: localStorageBackend('myapp'), version: 1 });
 *
 * API:
 *   store.get(key)          → value | undefined
 *   store.set(key, value)   → void
 *   store.delete(key)       → void
 *   store.keys()            → string[]
 *   store.exportJSON()      → string  (versioned snapshot)
 *   store.importJSON(str)   → void    (throws on version mismatch)
 *   store.clear()           → void    (removes all keys for this store)
 */

// ---- Backend factories --------------------------------------------------

/**
 * Browser localStorage backend.
 * All keys are namespaced under `${namespace}:` to avoid collisions.
 * @param {string} namespace
 * @returns {Backend}
 */
export function localStorageBackend(namespace) {
  const prefix = `${namespace}:`;
  return {
    get(key) {
      const raw = localStorage.getItem(prefix + key);
      return raw === null ? undefined : JSON.parse(raw);
    },
    set(key, value) {
      localStorage.setItem(prefix + key, JSON.stringify(value));
    },
    delete(key) {
      localStorage.removeItem(prefix + key);
    },
    keys() {
      const result = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          result.push(k.slice(prefix.length));
        }
      }
      return result;
    },
    clear() {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    },
  };
}

/**
 * In-memory backend — used in tests and as a default fallback.
 * @returns {Backend}
 */
export function memoryBackend() {
  const map = new Map();
  return {
    get(key)        { return map.get(key); },
    set(key, value) { map.set(key, value); },
    delete(key)     { map.delete(key); },
    keys()          { return [...map.keys()]; },
    clear()         { map.clear(); },
  };
}

// ---- Store factory -------------------------------------------------------

/**
 * Create a versioned store.
 *
 * @param {object} opts
 * @param {Backend}  opts.backend   — storage backend (localStorage or memory)
 * @param {number}   opts.version   — schema version; importJSON refuses mismatches
 * @returns {Store}
 */
export function makeStore({ backend, version }) {
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error('makeStore: version must be a positive integer');
  }
  if (!backend || typeof backend.get !== 'function') {
    throw new Error('makeStore: a valid backend is required');
  }

  /** @type {Store} */
  const store = {
    /**
     * Retrieve a stored value.
     * @param {string} key
     * @returns {*} stored value, or undefined if absent
     */
    get(key) {
      return backend.get(key);
    },

    /**
     * Store a value.
     * @param {string} key
     * @param {*} value  — must be JSON-serialisable
     */
    set(key, value) {
      backend.set(key, value);
    },

    /**
     * Remove a key.
     * @param {string} key
     */
    delete(key) {
      backend.delete(key);
    },

    /**
     * List all keys currently in the store.
     * @returns {string[]}
     */
    keys() {
      return backend.keys();
    },

    /**
     * Export the entire store as a versioned JSON string.
     * The envelope: { version, exportedAt, data: { [key]: value } }
     * @returns {string}
     */
    exportJSON() {
      const data = {};
      for (const key of backend.keys()) {
        data[key] = backend.get(key);
      }
      return JSON.stringify({
        version,
        exportedAt: new Date().toISOString(),
        data,
      });
    },

    /**
     * Import a versioned JSON string produced by exportJSON.
     * Throws if the version in the snapshot does not match this store's version.
     * On success, merges all keys from the snapshot (existing keys are overwritten).
     * @param {string} jsonStr
     * @throws {Error} on version mismatch or malformed JSON
     */
    importJSON(jsonStr) {
      let envelope;
      try {
        envelope = JSON.parse(jsonStr);
      } catch {
        throw new Error('importJSON: invalid JSON');
      }
      if (!envelope || typeof envelope !== 'object') {
        throw new Error('importJSON: malformed snapshot');
      }
      if (envelope.version !== version) {
        throw new Error(
          `importJSON: version mismatch — snapshot is v${envelope.version}, store is v${version}`
        );
      }
      if (!envelope.data || typeof envelope.data !== 'object') {
        throw new Error('importJSON: snapshot missing data field');
      }
      for (const [key, value] of Object.entries(envelope.data)) {
        backend.set(key, value);
      }
    },

    /**
     * Remove all keys from this store.
     */
    clear() {
      backend.clear();
    },
  };

  return store;
}
