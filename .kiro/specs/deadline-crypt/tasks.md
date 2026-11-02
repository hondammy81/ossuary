# Tasks — Deadline Crypt

- [x] 1. Copy the skeleton into `apps/deadline-crypt/` (theme.css,
      store.js, dates.js) and wire the shell page.
      _Requirements: 4, 5_
- [x] 2. Implement `model.js`: bucketOf + grouped, with unit tests for
      bucket boundaries (2 days, 0 days, past) and sort order.
      _Requirements: 2_
- [x] 3. Implement add/complete/resurrect in `model.js` with tests:
      validation errors, completion exclusion, resurrect only from Dead.
      _Requirements: 1, 3_
- [x] 4. Build the view in `app.js` + `index.html`: add-form, three
      bucket sections, per-item actions, inline error text.
      _Requirements: 1, 2, 3, 5_
- [x] 5. Export/import controls wired to the store; test the round-trip
      and the version-refusal path.
      _Requirements: 4_
- [ ] 6. Manual pass on a phone-sized viewport: one focal point per
      view, no horizontal scroll, calm palette per steering/product.md.
      _Requirements: 5_
      _Progress 2026-11-02: CSS/markup audit done at 390px — single
      column, calm palette confirmed, long-title overflow guard added,
      phone tap targets raised to 44px and inputs to 16px (no iOS
      focus zoom) in the ≤640px block. Copy audit: no punitive
      language found. Remaining: eyeball on a physical phone._
