/**
 * app.js — Ritual view layer
 *
 * DOM wiring only. All business logic lives in model.js.
 * Reads/writes state through the store; re-renders on every mutation.
 */

import { makeStore, localStorageBackend } from './store.js';
import { toKey } from './dates.js';
import {
  addRitual,
  renameRitual,
  removeRitual,
  checkIn,
  ritualStats,
} from './model.js';

// ---- Store setup ---------------------------------------------------------

const STORE_VERSION = 1;
const STORE_KEY = 'ritual';

const store = makeStore({
  backend: localStorageBackend(STORE_KEY),
  version: STORE_VERSION,
});

// ---- State helpers -------------------------------------------------------

const EMPTY_STATE = { rituals: [], checkins: {} };

function loadState() {
  return store.get(STORE_KEY) ?? EMPTY_STATE;
}

function saveState(state) {
  store.set(STORE_KEY, state);
}

// ---- Date helpers --------------------------------------------------------

/** Return today's day key for streak classification. */
function todayRef() {
  return toKey(new Date());
}

// ---- Mini DOM helpers ----------------------------------------------------

function h(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class')    node.className = v;
      else if (k === 'for') node.htmlFor = v;
      else if (k === 'aria-label')    node.setAttribute('aria-label', v);
      else if (k === 'aria-live')     node.setAttribute('aria-live', v);
      else if (k === 'aria-disabled') node.setAttribute('aria-disabled', v);
      else if (k === 'role')          node.setAttribute('role', v);
      else if (k.startsWith('data-')) node.setAttribute(k, v);
      else if (k.startsWith('on') && typeof v === 'function')
        node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v);
    }
  }
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

// ---- Flame component -----------------------------------------------------

/**
 * Build the ember dot that represents the flame level.
 * @param {"none"|"kindling"|"burning"|"blazing"} level
 * @returns {HTMLElement}
 */
function buildFlame(level) {
  const dot = h('div', {
    class: `flame flame--${level}`,
    role: 'img',
    'aria-label': `Flame: ${level}`,
  });

  const labelCls = level === 'none' ? 'flame-label' : `flame-label flame-label--${level}`;
  const label = h('span', { class: labelCls }, level === 'none' ? 'unlit' : level);

  const wrapper = h('div', { class: 'ritual-card__flame-col' }, dot, label);
  return wrapper;
}

// ---- Ritual card ---------------------------------------------------------

/**
 * Build a card for one ritual.
 *
 * @param {object}   ritual     — { id, name }
 * @param {object}   stats      — { current, longest, flame, last }
 * @param {string}   today      — "YYYY-MM-DD"
 * @param {Function} onMutate   — called with new state after any change
 */
function buildRitualCard(ritual, stats, today, onMutate) {
  const { id, name } = ritual;
  const { current, longest, flame, last } = stats;

  const checkedInToday = last === today;

  // ── Flame column ─────────────────────────────────────────────────
  const flameCol = buildFlame(flame);

  // ── Body ─────────────────────────────────────────────────────────
  const nameEl = h('div', { class: 'ritual-card__name' }, name);

  const streakLine = current > 0
    ? `${current} day streak · best ${longest}`
    : longest > 0
      ? `Streak paused · best ${longest}`
      : 'No streak yet';

  const streakEl = h('div', { class: 'ritual-card__streak' }, streakLine);

  // Check-in button
  const checkBtn = h('button', {
    class: 'btn btn--sm btn--primary',
    'aria-label': checkedInToday
      ? `Already checked in for ${name} today`
      : `Check in for ${name}`,
  }, checkedInToday ? '✓ Checked in today' : 'Check in');

  if (checkedInToday) {
    checkBtn.disabled = true;
    checkBtn.classList.add('btn--ghost');
    checkBtn.classList.remove('btn--primary');
  }

  checkBtn.addEventListener('click', () => {
    const state = loadState();
    const result = checkIn(state, id, today);
    if (result.ok) {
      saveState(result.ok.state);
      onMutate(result.ok.state);
    }
  });

  // Edit / rename toggle button
  const editBtn = h('button', {
    class: 'btn btn--sm btn--ghost',
    'aria-label': `Rename or remove ${name}`,
  }, 'Edit');

  // Rename / remove row (hidden until Edit clicked)
  const renameInput = h('input', {
    class: 'input',
    type: 'text',
    value: name,
    'aria-label': `New name for ${name}`,
    placeholder: 'New name…',
  });

  const saveNameBtn = h('button', {
    class: 'btn btn--sm btn--primary',
    type: 'button',
  }, 'Save');

  const removeBtn = h('button', {
    class: 'btn btn--sm btn--ghost',
    type: 'button',
    'aria-label': `Remove ${name}`,
  }, 'Remove');

  const editError = h('p', {
    class: 'field-error',
    role: 'alert',
    style: 'display:none',
  });

  const editRow = h('div', { class: 'ritual-card__edit-row' },
    renameInput,
    saveNameBtn,
    removeBtn,
    editError,
  );

  // Toggle edit row visibility
  editBtn.addEventListener('click', () => {
    const isOpen = editRow.classList.contains('is-open');
    editRow.classList.toggle('is-open', !isOpen);
    if (!isOpen) {
      renameInput.value = name;
      renameInput.focus();
    }
  });

  saveNameBtn.addEventListener('click', () => {
    const newName = renameInput.value;
    const state = loadState();
    const result = renameRitual(state, id, newName);
    if (result.error) {
      editError.textContent = result.error;
      editError.style.display = '';
      renameInput.focus();
      return;
    }
    editError.style.display = 'none';
    saveState(result.ok.state);
    onMutate(result.ok.state);
  });

  removeBtn.addEventListener('click', () => {
    const state = loadState();
    const result = removeRitual(state, id);
    if (result.ok) {
      saveState(result.ok.state);
      onMutate(result.ok.state);
    }
  });

  // Allow Enter key in rename input to save
  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveNameBtn.click(); }
    if (e.key === 'Escape') { editRow.classList.remove('is-open'); }
  });

  const actionRow = h('div', { class: 'ritual-card__actions' },
    checkBtn,
    editBtn,
  );

  const body = h('div', { class: 'ritual-card__body' },
    nameEl,
    streakEl,
    actionRow,
    editRow,
  );

  const card = h('article', {
    class: 'card ritual-card',
    'data-id': id,
  }, flameCol, body);

  return card;
}

// ---- Add ritual form -----------------------------------------------------

/**
 * Build the "Begin a ritual" card.
 * @param {Function} onAdd — called with new state after successful add
 */
function buildAddForm(onAdd) {
  const nameInput = h('input', {
    class: 'input',
    type: 'text',
    id: 'add-ritual-name',
    name: 'name',
    placeholder: 'e.g. Morning pages, Evening walk…',
    autocomplete: 'off',
  });

  const nameError = h('p', { class: 'field-error', role: 'alert', style: 'display:none' });

  const field = h('div', { class: 'field', 'data-field': 'name' },
    h('label', { class: 'label label--required', for: 'add-ritual-name' }, 'Ritual name'),
    nameInput,
    nameError,
  );

  function clearError() {
    nameInput.classList.remove('input--error');
    nameError.style.display = 'none';
    nameError.textContent = '';
  }

  function showError(msg) {
    nameInput.classList.add('input--error');
    nameError.textContent = msg;
    nameError.style.display = '';
    nameInput.focus();
  }

  const form = h('form', { class: 'stack', id: 'add-ritual-form' },
    field,
    h('div', { class: 'form-actions' },
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Begin ritual'),
    ),
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();

    const state = loadState();
    const result = addRitual(state, nameInput.value);

    if (result.error) {
      showError(result.error);
      return;
    }

    saveState(result.ok.state);
    form.reset();
    onAdd(result.ok.state);
  });

  const card = h('section', {
    class: 'card add-card',
    'aria-labelledby': 'add-ritual-heading',
  },
    h('h2', { id: 'add-ritual-heading' }, 'Begin a ritual'),
    form,
  );

  return card;
}

// ---- Rituals list section ------------------------------------------------

/**
 * Build the section containing all ritual cards (or an empty state).
 * @param {object} state
 * @param {string} today
 * @param {Function} onMutate
 */
function buildRitualsSection(state, today, onMutate) {
  const section = h('section', {
    class: 'rituals-section',
    'aria-label': 'Your rituals',
  });

  if (state.rituals.length === 0) {
    const empty = h('p', { class: 'meta', style: 'padding: 0.5rem 0 0;' },
      'No rituals yet. Begin one above.',
    );
    section.appendChild(empty);
    return section;
  }

  for (const ritual of state.rituals) {
    const stats = ritualStats(state, ritual.id, today);
    const card = buildRitualCard(ritual, stats, today, onMutate);
    section.appendChild(card);
  }

  return section;
}

// ---- Export / Import controls --------------------------------------------

function buildExportSection() {
  const statusEl = h('p', { class: 'import-ok',    style: 'display:none', 'aria-live': 'polite' });
  const errorEl  = h('p', { class: 'import-error', style: 'display:none', 'aria-live': 'assertive' });
  const fileInput = h('input', {
    type: 'file',
    accept: '.json',
    style: 'display:none',
    id: 'ritual-import-file',
  });

  function showStatus(msg, isError) {
    statusEl.style.display = isError ? 'none' : '';
    errorEl.style.display  = isError ? '' : 'none';
    (isError ? errorEl : statusEl).textContent = msg;
    setTimeout(() => {
      statusEl.style.display = 'none';
      errorEl.style.display  = 'none';
    }, 4000);
  }

  const exportBtn = h('button', {
    class: 'btn btn--ghost',
    id: 'ritual-export-btn',
    'aria-label': 'Export rituals as JSON',
  }, '⬇ Export JSON');

  exportBtn.addEventListener('click', () => {
    const json = store.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = h('a', { href: url, download: 'ritual-export.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showStatus('Export downloaded.', false);
  });

  const importBtn = h('button', {
    class: 'btn btn--ghost',
    id: 'ritual-import-btn',
    'aria-label': 'Import rituals from JSON',
  }, '⬆ Import JSON');

  importBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        store.importJSON(e.target.result);
        showStatus('Import complete. Your rituals have been restored.', false);
        render();
      } catch (err) {
        showStatus(err.message, true);
      } finally {
        fileInput.value = '';
      }
    };
    reader.readAsText(file);
  });

  const row = h('div', { class: 'export-section__row' }, exportBtn, importBtn, fileInput);

  const section = h('section', {
    class: 'export-section',
    'aria-label': 'Export and import',
  },
    h('h3', null, '🗝 Data'),
    row,
    statusEl,
    errorEl,
  );

  return section;
}

// ---- Main render ---------------------------------------------------------

function render() {
  const state = loadState();
  const today = todayRef();
  const app   = document.getElementById('app');
  app.innerHTML = '';

  // ── Topbar ───────────────────────────────────────────────────────────────
  const topbar = h('header', { class: 'app-topbar', role: 'banner' },
    h('span', { class: 'app-topbar__title' }, '🕯 Ritual'),
  );
  app.appendChild(topbar);

  // ── Main column ──────────────────────────────────────────────────────────
  const main = h('main', { class: 'app-main', role: 'main' });

  // "Begin a ritual" form
  main.appendChild(buildAddForm(() => render()));

  // All ritual cards
  main.appendChild(buildRitualsSection(state, today, () => render()));

  // Export / Import
  main.appendChild(buildExportSection());

  app.appendChild(main);
}

// ---- Boot ----------------------------------------------------------------

render();
