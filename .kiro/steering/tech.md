---
inclusion: always
---

# Tech — Ossuary

- **Stack:** vanilla JavaScript (ES modules) + CSS. No framework, no
  build step, no runtime dependencies. A static file server (or
  `file://`) is all an app needs. This is deliberate: the skeleton must
  stay copyable and readable — leanness is the product.
- **Shared core (`skeleton/`):**
  - `store.js` — versioned store over an injectable backend
    (localStorage in apps; in-memory in tests), JSON export/import.
  - `dates.js` — pure date math (day keys, countdown buckets, streaks).
    Pure functions only; all date logic lives here, never in views.
  - `theme.css` — design tokens + components from `product.md` rules.
  - `shell.js` — list/detail shell and form helpers.
- **Tests:** `bun test` against the pure modules. Every pure function
  ships with tests in the same change. Views are thin and untested by
  design — logic must be pushed into the pure layer until it is testable.
- **Data safety:** store writes are versioned; an import with a
  mismatched version is refused, never silently merged.
