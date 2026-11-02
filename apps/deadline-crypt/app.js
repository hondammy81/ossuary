/**
 * app.js — Deadline Crypt view layer
 *
 * DOM wiring only. All business logic lives in model.js.
 * Reads/writes state through the store; re-renders on every mutation.
 */

import { makeStore, localStorageBackend } from './store.js';
import { toKey } from './dates.js';
import {
  grouped,
  addDeadline,
  completeDeadline,
  resurrectDeadline,
} from './model.js';

// ---- Store setup ---------------------------------------------------------

const STORE_VERSION = 1;
const STORE_KEY = 'deadline-crypt';

const store = makeStore({
  backend: localStorageBackend(STORE_KEY),
  version: STORE_VERSION,
});

// ---- State helpers -------------------------------------------------------

const EMPTY_STATE = { deadlines: [] };

function loadState() {
  return store.get(STORE_KEY) ?? EMPTY_STATE;
}

function saveState(state) {
  store.set(STORE_KEY, state);
}

// ---- Date helpers --------------------------------------------------------

/** Format a YYYY-MM-DD due string for display. */
function formatDue(due) {
  const [y, m, d] = due.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** Return the today key for bucket classification. */
function todayRef() {
  return toKey(new Date());
}

// ---- Mini DOM helpers ----------------------------------------------------

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class')       el.className = v;
      else if (k === 'for')    el.htmlFor = v;
      else if (k.startsWith('on') && typeof v === 'function')
        el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    }
  }
  for (const c of children) {
    if (c == null) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

function text(str) { return document.createTextNode(str); }

// ---- Add form ------------------------------------------------------------

/**
 * Build the "Add a deadline" card with form and inline error display.
 * @param {Function} onAdd  — called with new state after a successful add
 */
function buildAddForm(onAdd) {
  const titleInput = h('input', {
    class: 'input', type: 'text', id: 'add-title', name: 'title',
    placeholder: 'e.g. History essay', required: 'required',
    autocomplete: 'off',
  });
  const titleError = h('p', { class: 'field-error', role: 'alert', style: 'display:none' });
  const titleField = h('div', { class: 'field', 'data-field': 'title' },
    h('label', { class: 'label label--required', for: 'add-title' }, 'Title'),
    titleInput,
    titleError,
  );

  const dueInput = h('input', {
    class: 'input', type: 'date', id: 'add-due', name: 'due',
    required: 'required',
  });
  const dueError = h('p', { class: 'field-error', role: 'alert', style: 'display:none' });
  const dueField = h('div', { class: 'field', 'data-field': 'due' },
    h('label', { class: 'label label--required', for: 'add-due' }, 'Due date'),
    dueInput,
    dueError,
  );

  const catInput = h('input', {
    class: 'input', type: 'text', id: 'add-cat', name: 'category',
    placeholder: 'e.g. School, Work (optional)',
    autocomplete: 'off',
  });
  const catField = h('div', { class: 'field', 'data-field': 'category' },
    h('label', { class: 'label', for: 'add-cat' }, 'Category'),
    catInput,
  );

  function clearErrors() {
    titleInput.classList.remove('input--error');
    dueInput.classList.remove('input--error');
    titleError.style.display = 'none';
    titleError.textContent = '';
    dueError.style.display = 'none';
    dueError.textContent = '';
  }

  function showError(field, message) {
    if (field === 'title') {
      titleInput.classList.add('input--error');
      titleError.textContent = message;
      titleError.style.display = '';
      titleInput.focus();
    } else if (field === 'due') {
      dueInput.classList.add('input--error');
      dueError.textContent = message;
      dueError.style.display = '';
      dueInput.focus();
    }
  }

  const form = h('form', { class: 'stack', id: 'add-form' },
    titleField,
    dueField,
    catField,
    h('div', { class: 'form-actions' },
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Add deadline'),
    ),
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const state = loadState();
    const result = addDeadline(state, {
      title: titleInput.value,
      due: dueInput.value,
      category: catInput.value,
    });

    if (result.error) {
      showError(result.field, result.error);
      return;
    }

    saveState(result.ok.state);
    form.reset();
    onAdd(result.ok.state);
  });

  const card = h('section', { class: 'card add-card', 'aria-labelledby': 'add-heading' },
    h('h2', { id: 'add-heading' }, 'Add a deadline'),
    form,
  );

  return card;
}

// ---- Single deadline card ------------------------------------------------

/**
 * Build a card for one deadline item.
 *
 * @param {object} deadline
 * @param {"alive"|"dying"|"dead"} bucket
 * @param {Function} onComplete  — called with updated state
 * @param {Function} onResurrect — called with updated state (graveyard only)
 */
function buildDeadlineCard(deadline, bucket, onComplete, onResurrect) {
  const { id, title, due, category } = deadline;

  const metaText = `Due ${formatDue(due)}`;
  const meta = h('div', { class: 'deadline-card__meta' }, metaText);

  const bodyChildren = [
    h('div', { class: 'deadline-card__title' }, title),
    meta,
  ];
  if (category) {
    bodyChildren.push(h('div', { class: 'deadline-card__category' }, category));
  }

  const body = h('div', { class: 'deadline-card__body' }, ...bodyChildren);

  // Actions column
  const actions = h('div', { class: 'deadline-card__actions' });

  if (bucket !== 'dead') {
    // Alive / Dying: show Complete button
    const completeBtn = h('button', {
      class: 'btn btn--sm btn--ghost',
      'data-id': id,
      'aria-label': `Mark "${title}" complete`,
    }, 'Complete');

    completeBtn.addEventListener('click', () => {
      const state = loadState();
      const result = completeDeadline(state, id);
      if (result.ok) {
        saveState(result.ok.state);
        onComplete(result.ok.state);
      }
    });

    actions.appendChild(completeBtn);
  } else {
    // Graveyard: show Resurrect row with inline date input
    const newDueInput = h('input', {
      class: 'input', type: 'date', 'aria-label': 'New due date for resurrection',
    });
    const resurrectError = h('p', {
      class: 'field-error', role: 'alert', style: 'display:none',
    });
    const resurrectBtn = h('button', {
      class: 'btn btn--sm btn--ghost',
      'data-id': id,
      'aria-label': `Resurrect "${title}"`,
    }, 'Resurrect');

    resurrectBtn.addEventListener('click', () => {
      const newDue = newDueInput.value;
      const state = loadState();
      const result = resurrectDeadline(state, id, newDue, todayRef());

      if (result.error) {
        resurrectError.textContent = result.error;
        resurrectError.style.display = '';
        newDueInput.classList.add('input--error');
        newDueInput.focus();
        return;
      }

      newDueInput.classList.remove('input--error');
      resurrectError.style.display = 'none';
      saveState(result.ok.state);
      onResurrect(result.ok.state);
    });

    const resurrectRow = h('div', { class: 'resurrect-row' },
      newDueInput,
      resurrectBtn,
      resurrectError,
    );

    body.appendChild(resurrectRow);
  }

  const card = h('article', {
    class: `card deadline-card${bucket === 'dead' ? ' card--dead' : ''}`,
    'data-id': id,
    'data-bucket': bucket,
  }, body, actions);

  return card;
}

// ---- Bucket section ------------------------------------------------------

const BUCKET_META = {
  dying:     { label: 'Dying',         cls: 'dying',  icon: '☠️',  emptyMsg: 'Nothing urgent right now.' },
  alive:     { label: 'Alive',          cls: 'alive',  icon: '📅', emptyMsg: 'No upcoming deadlines.' },
  graveyard: { label: 'The Graveyard',  cls: 'dead',   icon: '🪦',  emptyMsg: 'No missed deadlines.' },
};

/**
 * Build one bucket section (heading + deadline cards or empty state).
 */
function buildBucketSection(bucketKey, items, onComplete, onResurrect) {
  const meta = BUCKET_META[bucketKey];
  const heading = h('h2', {
    class: `bucket-section__heading bucket-section__heading--${meta.cls}`,
  }, `${meta.icon} ${meta.label}`);

  const section = h('section', {
    class: 'bucket-section',
    'aria-labelledby': `bucket-heading-${bucketKey}`,
  });
  heading.id = `bucket-heading-${bucketKey}`;
  section.appendChild(heading);

  if (items.length === 0) {
    const empty = h('p', { class: 'meta', style: 'padding: 0.5rem 0 0;' }, meta.emptyMsg);
    section.appendChild(empty);
  } else {
    const isGraveyard = bucketKey === 'graveyard';
    for (const deadline of items) {
      const card = buildDeadlineCard(
        deadline,
        isGraveyard ? 'dead' : bucketKey === 'dying' ? 'dying' : 'alive',
        onComplete,
        onResurrect,
      );
      section.appendChild(card);
    }
  }

  return section;
}

// ---- Export / Import controls --------------------------------------------

function buildExportSection() {
  const statusEl = h('p', { class: 'import-ok', style: 'display:none' });
  const errorEl  = h('p', { class: 'import-error', style: 'display:none' });
  const fileInput = h('input', { type: 'file', accept: '.json', style: 'display:none', id: 'import-file-input' });

  function showStatus(msg, isError) {
    statusEl.style.display = isError ? 'none' : '';
    errorEl.style.display  = isError ? '' : 'none';
    (isError ? errorEl : statusEl).textContent = msg;
    setTimeout(() => {
      statusEl.style.display = 'none';
      errorEl.style.display  = 'none';
    }, 4000);
  }

  const exportBtn = h('button', { class: 'btn btn--ghost', id: 'export-btn' }, '⬇ Export JSON');
  exportBtn.addEventListener('click', () => {
    const json = store.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = h('a', { href: url, download: 'deadline-crypt-export.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showStatus('Export downloaded.', false);
  });

  const importBtn = h('button', { class: 'btn btn--ghost', id: 'import-btn' }, '⬆ Import JSON');
  importBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        store.importJSON(e.target.result);
        showStatus('Import successful.', false);
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

  const section = h('section', { class: 'export-section', 'aria-label': 'Export and import' },
    h('h3', null, '🗝 Data'),
    row,
    statusEl,
    errorEl,
  );

  return section;
}

// ---- Main render ---------------------------------------------------------

function render() {
  const state  = loadState();
  const ref    = todayRef();
  const groups = grouped(state, ref);

  const app = document.getElementById('app');
  app.innerHTML = '';

  // ── topbar ──────────────────────────────────────────────────────────────
  const topbar = h('header', { class: 'app-topbar', role: 'banner' },
    h('span', { class: 'app-topbar__title' }, '🕯 Deadline Crypt'),
  );
  app.appendChild(topbar);

  // ── main column ─────────────────────────────────────────────────────────
  const main = h('main', { class: 'app-main', role: 'main' });

  // Add form
  main.appendChild(buildAddForm(() => render()));

  // Bucket sections — order: Dying, Alive, Graveyard (Req 5)
  main.appendChild(buildBucketSection('dying',     groups.dying,     () => render(), () => render()));
  main.appendChild(buildBucketSection('alive',     groups.alive,     () => render(), () => render()));
  main.appendChild(buildBucketSection('graveyard', groups.graveyard, () => render(), () => render()));

  // Export / Import
  main.appendChild(buildExportSection());

  app.appendChild(main);
}

// ---- Boot ----------------------------------------------------------------

render();
