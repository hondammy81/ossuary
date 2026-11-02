/**
 * app.js — Pantry Ghost view layer
 *
 * DOM wiring only. All business logic lives in model.js.
 * Reads/writes state through the store; re-renders on every mutation.
 */

import { makeStore, localStorageBackend } from './store.js';
import { toKey } from './dates.js';
import {
  addItem,
  freshness,
  pantryList,
  removeItem,
  pantrySummary,
} from './model.js';

// ---- Store setup ---------------------------------------------------------

const STORE_VERSION = 1;
const STORE_KEY = 'pantry-ghost';

const store = makeStore({
  backend: localStorageBackend(STORE_KEY),
  version: STORE_VERSION,
});

// ---- State helpers -------------------------------------------------------

const EMPTY_STATE = { items: [] };

function loadState() {
  return store.get(STORE_KEY) ?? EMPTY_STATE;
}

function saveState(state) {
  store.set(STORE_KEY, state);
}

// ---- Date helpers --------------------------------------------------------

function todayRef() {
  return toKey(new Date());
}

// ---- Mini DOM helper -----------------------------------------------------

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

// ---- Freshness labels (calm, no shame) -----------------------------------

const FRESHNESS_LABELS = {
  fresh:   'Fresh',
  fading:  'Use soon',
  spoiled: 'Past date',
};

// ---- Summary bar ---------------------------------------------------------

/**
 * Build the three-count freshness summary bar.
 * @param {{ fresh: number, fading: number, spoiled: number }} summary
 */
function buildSummaryBar(summary) {
  const bar = h('div', { class: 'pantry-summary', 'aria-label': 'Pantry summary' });

  const items = [
    { key: 'fresh',   count: summary.fresh,   label: 'Fresh'     },
    { key: 'fading',  count: summary.fading,  label: 'Use soon'  },
    { key: 'spoiled', count: summary.spoiled, label: 'Past date' },
  ];

  for (const { key, count, label } of items) {
    bar.appendChild(h('div', { class: 'pantry-summary__item' },
      h('span', { class: 'pantry-summary__count' }, String(count)),
      h('span', { class: `pantry-summary__label pantry-summary__label--${key}` }, label),
    ));
  }

  return bar;
}

// ---- Add item form -------------------------------------------------------

/**
 * Build the "Add an item" card with name + date inputs.
 * @param {Function} onAdd — called after a successful add
 */
function buildAddForm(onAdd) {
  const nameInput = h('input', {
    class: 'input',
    type: 'text',
    id: 'add-item-name',
    name: 'name',
    placeholder: 'e.g. Milk, Eggs, Leftover soup…',
    autocomplete: 'off',
  });

  const dateInput = h('input', {
    class: 'input',
    type: 'date',
    id: 'add-item-date',
    name: 'expiresOn',
  });

  const nameField = h('div', { class: 'field', 'data-field': 'name' },
    h('label', { class: 'label label--required', for: 'add-item-name' }, 'Item name'),
    nameInput,
  );

  const dateField = h('div', { class: 'field', 'data-field': 'expiresOn' },
    h('label', { class: 'label label--required', for: 'add-item-date' }, 'Expiry date'),
    dateInput,
  );

  const formError = h('p', { class: 'field-error', role: 'alert', style: 'display:none' });

  function clearError() {
    nameInput.classList.remove('input--error');
    dateInput.classList.remove('input--error');
    formError.style.display = 'none';
    formError.textContent = '';
  }

  function showError(msg) {
    formError.textContent = msg;
    formError.style.display = '';
  }

  const form = h('form', { id: 'add-item-form' },
    h('div', { class: 'form-row' },
      nameField,
      dateField,
    ),
    formError,
    h('div', { class: 'form-actions' },
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Add to pantry'),
    ),
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();

    const name      = nameInput.value;
    const expiresOn = dateInput.value;

    const state    = loadState();
    const newState = addItem(state, { name, expiresOn, now: new Date() });

    if (newState === state) {
      // Model refused — show inline guidance
      if (!name.trim()) {
        nameInput.classList.add('input--error');
        showError('Please enter an item name.');
        nameInput.focus();
      } else {
        dateInput.classList.add('input--error');
        showError('Please enter a valid expiry date.');
        dateInput.focus();
      }
      return;
    }

    saveState(newState);
    form.reset();
    nameInput.focus();
    onAdd(newState);
  });

  const card = h('section', {
    class: 'card add-card',
    'aria-labelledby': 'add-item-heading',
  },
    h('h2', { id: 'add-item-heading' }, 'Add an item'),
    form,
  );

  return card;
}

// ---- Pantry item row -----------------------------------------------------

/**
 * Build a single item row in the pantry list.
 *
 * @param {object}   item       — { id, name, expiresOn, freshness, daysLeft }
 * @param {Function} onMutate   — called with new state after removal
 */
function buildItemRow(item, onMutate) {
  const { id, name, expiresOn, freshness: f, daysLeft } = item;

  // Freshness dot
  const dot = h('div', {
    class: `freshness-dot freshness-dot--${f}`,
    role: 'img',
    'aria-label': `${FRESHNESS_LABELS[f]} indicator`,
  });

  // Item info
  const nameEl = h('div', { class: 'pantry-item__name' }, name);

  let daysText;
  if (daysLeft < 0) {
    daysText = `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago · ${expiresOn}`;
  } else if (daysLeft === 0) {
    daysText = `Expires today · ${expiresOn}`;
  } else {
    daysText = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left · ${expiresOn}`;
  }

  const metaEl = h('div', { class: 'pantry-item__meta' }, daysText);
  const body   = h('div', { class: 'pantry-item__body' }, nameEl, metaEl);

  // Freshness badge
  const badge = h('span', { class: `freshness-badge freshness-badge--${f}` },
    FRESHNESS_LABELS[f],
  );

  // "Used up" button — removal is the only exit path
  const removeBtn = h('button', {
    class: 'btn btn--sm btn--ghost',
    type: 'button',
    'aria-label': `Mark ${name} as used up or remove it`,
  }, 'Used up');

  removeBtn.addEventListener('click', () => {
    const state    = loadState();
    const newState = removeItem(state, id);
    saveState(newState);
    onMutate(newState);
  });

  const row = h('article', {
    class: `card pantry-item${f === 'spoiled' ? ' pantry-item--spoiled' : ''}`,
    'data-id': id,
  },
    dot,
    body,
    h('div', { class: 'pantry-item__badge' }, badge),
    h('div', { class: 'pantry-item__action' }, removeBtn),
  );

  return row;
}

// ---- Pantry list section -------------------------------------------------

/**
 * Build the pantry list section (or an empty state).
 * @param {object}   state
 * @param {string}   today
 * @param {Function} onMutate
 */
function buildPantrySection(state, today, onMutate) {
  const section = h('section', {
    class: 'pantry-section',
    'aria-label': 'Your pantry',
  });

  const list = pantryList(state, today);

  if (list.length === 0) {
    const empty = h('p', { class: 'meta', style: 'padding: 0.5rem 0 0;' },
      'Your pantry is empty. Add an item above.',
    );
    section.appendChild(empty);
    return section;
  }

  for (const item of list) {
    section.appendChild(buildItemRow(item, onMutate));
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
    id: 'pantry-import-file',
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
    id: 'pantry-export-btn',
    'aria-label': 'Export pantry as JSON',
  }, '⬇ Export JSON');

  exportBtn.addEventListener('click', () => {
    const json = store.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = h('a', { href: url, download: 'pantry-ghost-export.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showStatus('Export downloaded.', false);
  });

  const importBtn = h('button', {
    class: 'btn btn--ghost',
    id: 'pantry-import-btn',
    'aria-label': 'Import pantry from JSON',
  }, '⬆ Import JSON');

  importBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        store.importJSON(e.target.result);
        showStatus('Import complete. Your pantry has been restored.', false);
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
    h('span', { class: 'app-topbar__title' }, '👻 Pantry Ghost'),
  );
  app.appendChild(topbar);

  // ── Main column ──────────────────────────────────────────────────────────
  const main = h('main', { class: 'app-main', role: 'main' });

  // Summary counts
  const summary = pantrySummary(state, today);
  if (state.items.length > 0) {
    main.appendChild(buildSummaryBar(summary));
  }

  // Add form
  main.appendChild(buildAddForm(() => render()));

  // Pantry list
  main.appendChild(buildPantrySection(state, today, () => render()));

  // Export / Import
  main.appendChild(buildExportSection());

  app.appendChild(main);
}

// ---- Boot ----------------------------------------------------------------

render();
