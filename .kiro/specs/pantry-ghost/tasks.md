# Tasks — Pantry Ghost

- [x] 1. Copy the skeleton into `apps/pantry-ghost/` and wire the
      shell page.
      _Requirements: 4, 5_
- [x] 2. Implement `model.js`: addItem validation, freshness
      classification, pantryList sorting/annotation, removeItem, and
      pantrySummary, with unit tests for the boundary days (yesterday,
      today, +3 days, +4 days), invalid-input refusal, and sort order.
      _Requirements: 1, 2, 3_
- [x] 3. Build the view: add form, sorted list with calm freshness
      labels, used-up/remove controls.
      _Requirements: 1, 3, 5_
- [x] 4. Export/import controls wired to the store; round-trip test.
      _Requirements: 4_
- [ ] 5. Manual pass: interface copy reviewed for punitive language
      (there must be none); phone viewport check.
      _Requirements: 5_
      _Progress 2026-11-02: copy audit complete — labels are exactly
      Fresh / Use soon / Past date per Requirement 5; errors are
      gentle "Please enter…" phrasing; no punitive language found.
      Viewport audit done at 390px from CSS/markup; 44px tap targets
      and 16px inputs added in the ≤640px block. Remaining: eyeball
      on a physical phone._
