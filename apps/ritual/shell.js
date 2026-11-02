/**
 * shell.js — Ossuary list/detail page shell + form helpers
 *
 * Thin DOM utilities. No framework, no virtual DOM.
 * Each helper returns a plain DOM node that the caller appends.
 *
 * Exports:
 *
 *  Shell (app scaffolding)
 *    buildShell(opts)      → { topbar, listPanel, detailPanel }
 *    showEmpty(panel, opts)
 *    clearPanel(panel)
 *
 *  List
 *    buildListItem(opts)   → HTMLElement
 *    setActiveItem(el)
 *
 *  Detail / forms
 *    buildField(opts)      → HTMLElement  (label + input/textarea/select)
 *    buildForm(opts)       → HTMLFormElement
 *    getFormValues(form)   → object
 *    setFormValues(form, values)
 *    clearFormErrors(form)
 *    showFieldError(form, name, message)
 *
 *  Misc
 *    el(tag, attrs, ...children) → HTMLElement  (mini-createElement)
 *    on(target, event, handler)  → () => void   (returns removeListener)
 */

// ---- Mini createElement -------------------------------------------------

/**
 * Create a DOM element with optional attributes/properties and children.
 *
 * @param {string} tag
 * @param {object|null} attrs  — plain object of attributes/properties.
 *   Keys starting with "on" are treated as event listeners.
 *   "class" is set via className; "dataset" keys are spread onto el.dataset.
 * @param {...(Node|string)} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);

  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'class') {
        node.className = val;
      } else if (key === 'dataset') {
        for (const [dk, dv] of Object.entries(val)) {
          node.dataset[dk] = dv;
        }
      } else if (key.startsWith('on') && typeof val === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), val);
      } else {
        node[key] = val;
      }
    }
  }

  for (const child of children) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }

  return node;
}

/**
 * Attach an event listener and return a cleanup function.
 * @param {EventTarget} target
 * @param {string} event
 * @param {EventListener} handler
 * @returns {() => void}
 */
export function on(target, event, handler) {
  target.addEventListener(event, handler);
  return () => target.removeEventListener(event, handler);
}

// ---- App shell ----------------------------------------------------------

/**
 * Inject the two-panel list/detail shell into a container element.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.container    — element to inject into (e.g. document.body)
 * @param {string}      opts.appName      — shown in the topbar
 * @param {Node[]}      [opts.topbarActions] — buttons to place in topbar right slot
 * @returns {{ topbar: HTMLElement, listPanel: HTMLElement, detailPanel: HTMLElement }}
 */
export function buildShell({ container, appName, topbarActions = [] }) {
  const topbarActionsRow = el('div', { class: 'app-topbar__actions' }, ...topbarActions);

  const topbar = el('header', { class: 'app-topbar' },
    el('span', { class: 'app-topbar__title' }, appName),
    topbarActionsRow,
  );

  const listPanel  = el('nav',    { class: 'list-panel',   role: 'navigation', 'aria-label': 'Items' });
  const detailPanel = el('main',  { class: 'detail-panel', role: 'main' });

  const body = el('div', { class: 'app-body' }, listPanel, detailPanel);
  const shell = el('div', { class: 'app-shell' }, topbar, body);

  container.innerHTML = '';
  container.appendChild(shell);

  return { topbar, listPanel, detailPanel };
}

// ---- List panel helpers -------------------------------------------------

/**
 * Build a single list-item card.
 *
 * @param {object} opts
 * @param {string}      opts.id
 * @param {string}      opts.title
 * @param {string}      [opts.sub]    — secondary line
 * @param {string}      [opts.icon]   — emoji or SVG string
 * @param {string}      [opts.bucket] — "alive"|"dying"|"dead"
 * @param {Function}    [opts.onClick]
 * @returns {HTMLElement}
 */
export function buildListItem({ id, title, sub, icon, bucket, onClick }) {
  const children = [];

  if (icon) {
    children.push(el('span', { class: 'list-item__icon', 'aria-hidden': 'true' }, icon));
  }

  const bodyChildren = [el('div', { class: 'list-item__title' }, title)];
  if (sub) bodyChildren.push(el('div', { class: 'list-item__sub' }, sub));
  children.push(el('div', { class: 'list-item__body' }, ...bodyChildren));

  if (bucket) {
    children.push(el('span', { class: `bucket bucket--${bucket}` }, bucket));
  }

  const item = el('div', {
    class: 'list-item',
    role: 'button',
    tabIndex: 0,
    dataset: { id },
    onClick,
    onKeydown(e) { if (e.key === 'Enter' || e.key === ' ') onClick?.(e); },
  }, ...children);

  return item;
}

/**
 * Mark one list item as active (and deactivate siblings).
 * @param {HTMLElement} itemEl
 */
export function setActiveItem(itemEl) {
  const panel = itemEl.closest('.list-panel');
  if (panel) {
    panel.querySelectorAll('.list-item--active').forEach(el => {
      el.classList.remove('list-item--active');
    });
  }
  itemEl.classList.add('list-item--active');
}

// ---- Empty state --------------------------------------------------------

/**
 * Replace a panel's contents with a calm empty-state message.
 * @param {HTMLElement} panel
 * @param {object} opts
 * @param {string} opts.icon
 * @param {string} opts.title
 * @param {string} [opts.body]
 * @param {HTMLElement} [opts.action]
 */
export function showEmpty(panel, { icon, title, body, action }) {
  const children = [
    el('div', { class: 'empty-state__icon', 'aria-hidden': 'true' }, icon),
    el('div', { class: 'empty-state__title' }, title),
  ];
  if (body) children.push(el('p', { class: 'empty-state__body' }, body));
  if (action) children.push(action);

  clearPanel(panel);
  panel.appendChild(el('div', { class: 'empty-state' }, ...children));
}

/**
 * Remove all children from a panel.
 * @param {HTMLElement} panel
 */
export function clearPanel(panel) {
  panel.innerHTML = '';
}

// ---- Form helpers -------------------------------------------------------

/**
 * Build a labelled form field (label + control + optional hint).
 *
 * @param {object} opts
 * @param {string}  opts.name       — input name attribute
 * @param {string}  opts.label      — visible label text
 * @param {"text"|"date"|"number"|"textarea"|"select"} [opts.type] — defaults to "text"
 * @param {string}  [opts.placeholder]
 * @param {string}  [opts.hint]     — helper text below the control
 * @param {boolean} [opts.required]
 * @param {{value:string, label:string}[]} [opts.options] — for type="select"
 * @returns {HTMLElement}
 */
export function buildField({ name, label: labelText, type = 'text', placeholder, hint, required, options }) {
  const labelEl = el('label', {
    class: required ? 'label label--required' : 'label',
    htmlFor: name,
  }, labelText);

  let controlEl;
  if (type === 'textarea') {
    controlEl = el('textarea', { class: 'textarea', id: name, name, placeholder: placeholder ?? '' });
  } else if (type === 'select') {
    const optEls = (options ?? []).map(o =>
      el('option', { value: o.value }, o.label)
    );
    controlEl = el('select', { class: 'select', id: name, name }, ...optEls);
  } else {
    controlEl = el('input', { class: 'input', id: name, name, type, placeholder: placeholder ?? '' });
  }

  if (required) controlEl.required = true;

  const fieldChildren = [labelEl, controlEl];
  if (hint) fieldChildren.push(el('p', { class: 'hint' }, hint));

  return el('div', { class: 'field', dataset: { field: name } }, ...fieldChildren);
}

/**
 * Wrap fields inside a <form> with an action row (submit + optional cancel).
 *
 * @param {object} opts
 * @param {HTMLElement[]} opts.fields    — field elements to include
 * @param {string}        opts.submitLabel  — submit button text
 * @param {Function}      [opts.onSubmit]   — called with the submit event
 * @param {string}        [opts.cancelLabel]
 * @param {Function}      [opts.onCancel]
 * @returns {HTMLFormElement}
 */
export function buildForm({ fields, submitLabel, onSubmit, cancelLabel, onCancel }) {
  const actionChildren = [
    el('button', { class: 'btn btn--primary', type: 'submit' }, submitLabel),
  ];

  if (cancelLabel && onCancel) {
    actionChildren.push(
      el('button', { class: 'btn btn--ghost', type: 'button', onClick: onCancel }, cancelLabel)
    );
  }

  const form = el('form', {
    class: 'stack',
    onSubmit(e) {
      e.preventDefault();
      onSubmit?.(e);
    },
  }, ...fields, el('div', { class: 'form-actions' }, ...actionChildren));

  return form;
}

/**
 * Collect all named control values from a form into a plain object.
 * Checkboxes return booleans; all others return strings.
 * @param {HTMLFormElement} form
 * @returns {object}
 */
export function getFormValues(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      data[el.name] = el.checked;
    } else if (el.type === 'radio') {
      if (el.checked) data[el.name] = el.value;
    } else {
      data[el.name] = el.value;
    }
  }
  return data;
}

/**
 * Populate a form's controls from a plain-object map of name → value.
 * @param {HTMLFormElement} form
 * @param {object} values
 */
export function setFormValues(form, values) {
  for (const [name, value] of Object.entries(values)) {
    const ctrl = form.elements[name];
    if (!ctrl) continue;
    if (ctrl.type === 'checkbox') {
      ctrl.checked = Boolean(value);
    } else {
      ctrl.value = value ?? '';
    }
  }
}

/**
 * Remove all field-error states from a form.
 * @param {HTMLFormElement} form
 */
export function clearFormErrors(form) {
  form.querySelectorAll('.input--error, .textarea--error, .select--error').forEach(c => {
    c.classList.remove('input--error', 'textarea--error', 'select--error');
  });
  form.querySelectorAll('.field-error').forEach(e => e.remove());
}

/**
 * Mark a specific field as invalid with a message.
 * @param {HTMLFormElement} form
 * @param {string} name    — the field's name attribute
 * @param {string} message
 */
export function showFieldError(form, name, message) {
  const fieldWrapper = form.querySelector(`[data-field="${name}"]`);
  if (!fieldWrapper) return;

  const ctrl = fieldWrapper.querySelector(`[name="${name}"]`);
  if (ctrl) ctrl.classList.add(`${ctrl.tagName.toLowerCase()}--error`);

  // Remove any prior error message for this field
  fieldWrapper.querySelector('.field-error')?.remove();
  fieldWrapper.appendChild(el('p', { class: 'field-error', role: 'alert' }, message));
}
