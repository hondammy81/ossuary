# Requirements — Pantry Ghost

## Introduction
Pantry Ghost tracks expiry dates for food the user already has at home.
Each item is calmly shown as fresh, fading (use it soon), or past its
date — a state of the food, never a judgement of the user. It is the
third app built from the Ossuary skeleton, created live in the demo to
prove the skeleton raises a new app from one spec.

## Requirements

### Requirement 1: Add an item
- WHEN the user names a food item and gives its expiry date, THE
  SYSTEM SHALL record the item with that name and expiry date.
- WHEN the name is empty or the expiry date is missing or not a valid
  calendar date, THE SYSTEM SHALL refuse to add the item.

### Requirement 2: Freshness states
- THE SYSTEM SHALL classify each item against today as: **fresh**
  (expiry more than 3 days away), **fading** (expiry today or within
  the next 3 days), or **spoiled** (expiry date in the past).
- THE SYSTEM SHALL present the pantry sorted by expiry date, soonest
  first, each item showing its freshness state and days remaining.

### Requirement 3: Use up or remove
- WHEN the user marks an item used up, THE SYSTEM SHALL remove it
  from the pantry.
- WHEN the user removes an item, THE SYSTEM SHALL remove it from the
  pantry. Removal is the only way an item leaves; nothing expires
  silently off the list.

### Requirement 4: Persistence and portability
- THE SYSTEM SHALL persist all items locally via the skeleton store,
  with lossless JSON export/import (same contract as Deadline Crypt
  and Ritual).

### Requirement 5: Calm presentation
- THE SYSTEM SHALL use calm, factual labels for freshness (Fresh /
  Use soon / Past date), with no punitive or shaming language anywhere
  in the interface.
