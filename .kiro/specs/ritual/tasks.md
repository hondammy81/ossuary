# Tasks — Ritual

- [x] 1. Copy the skeleton into `apps/ritual/` and wire the shell page.
      _Requirements: 4, 5_
- [x] 2. Implement `model.js`: checkIn (idempotent) + ritualStats over
      the skeleton's streakInfo, with unit tests for same-day repeats,
      yesterday-ending streaks, and broken streaks.
      _Requirements: 2, 3_
- [x] 3. Build the view: ritual cards, CSS flame with four glow levels,
      check-in button state, add/rename/remove controls.
      _Requirements: 1, 3, 5_
- [x] 4. Export/import controls wired to the store; round-trip test.
      _Requirements: 4_
- [ ] 5. Manual pass: interface copy reviewed for punitive language
      (there must be none); phone viewport check.
      _Requirements: 5_
      _Progress 2026-11-02: copy audit complete — every user-visible
      string reviewed, no punitive language found ("Streak paused",
      "No streak yet", "Please give your ritual a name."). Viewport
      audit done at 390px from CSS/markup; 44px tap targets and 16px
      inputs added in the ≤640px block. Remaining: eyeball on a
      physical phone._
