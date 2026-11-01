# Requirements — Deadline Crypt

## Introduction
Deadline Crypt tracks dated obligations (assignments, submissions,
applications) and gives each a lifecycle: alive, dying, dead — and
resurrectable. It is App 1 built from the Ossuary skeleton.

## Requirements

### Requirement 1: Capture a deadline
- WHEN the user submits a title, a due date, and an optional category,
  THE SYSTEM SHALL store the deadline and display it in the Alive list.
- WHEN the title is empty or the date is missing, THE SYSTEM SHALL
  refuse the entry and state what is missing.

### Requirement 2: Lifecycle buckets
- WHEN a deadline is more than 2 days away, THE SYSTEM SHALL present
  it as Alive.
- WHEN a deadline is 0–2 days away, THE SYSTEM SHALL present it as
  Dying.
- WHEN a deadline's date has passed and it is not completed, THE SYSTEM
  SHALL present it as Dead, in the Graveyard view.

### Requirement 3: Complete and resurrect
- WHEN the user marks a deadline complete, THE SYSTEM SHALL remove it
  from all buckets and record the completion.
- WHEN the user resurrects a Dead deadline with a new date, THE SYSTEM
  SHALL return it to the bucket matching the new date.

### Requirement 4: Persistence and portability
- THE SYSTEM SHALL persist all deadlines locally via the skeleton store.
- WHEN the user exports, THE SYSTEM SHALL produce the full dataset as
  JSON; WHEN the user imports a valid export, THE SYSTEM SHALL restore
  it without loss.

### Requirement 5: Calm presentation
- THE SYSTEM SHALL present buckets in the order Dying, Alive,
  Graveyard, with no badges, popups, or sounds.
