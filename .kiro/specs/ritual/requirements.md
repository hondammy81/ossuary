# Requirements — Ritual

## Introduction
Ritual tracks daily practices (study, code, exercise) as check-ins.
Streaks are shown as candle flames; a missed day dims the flame but
never shames. It is App 2 built from the Ossuary skeleton.

## Requirements

### Requirement 1: Define a ritual
- WHEN the user names a ritual, THE SYSTEM SHALL create it with an
  empty check-in history and an unlit flame.

### Requirement 2: Check in
- WHEN the user checks in for today, THE SYSTEM SHALL record today's
  date for that ritual.
- WHEN the user checks in twice on the same day, THE SYSTEM SHALL keep
  exactly one record for that day.

### Requirement 3: Streaks and flames
- THE SYSTEM SHALL compute the current streak as consecutive check-in
  days ending today or yesterday, and SHALL preserve the longest streak
  separately.
- WHEN the last check-in is older than yesterday, THE SYSTEM SHALL show
  the current streak as 0 and keep the longest streak visible.
- THE SYSTEM SHALL render flame levels as: 0 = out, 1 = kindling
  (1–2 days), 2 = burning (3–6 days), 3 = blazing (7+ days).

### Requirement 4: Persistence and portability
- THE SYSTEM SHALL persist all rituals locally via the skeleton store,
  with lossless JSON export/import (same contract as Deadline Crypt).

### Requirement 5: Calm presentation
- THE SYSTEM SHALL show one flame and the streak counts per ritual,
  with no punitive language anywhere in the interface.
