/**
 * dates.js — Ossuary pure date math
 *
 * All functions are pure (no side effects, no global state).
 * All date logic for apps lives here, never in views.
 *
 * Conventions:
 *  - "day key"   — a local-time ISO date string: "YYYY-MM-DD"
 *  - "timestamp" — a JS Date or integer milliseconds (both accepted)
 *
 * Exports:
 *   todayKey()                          → "YYYY-MM-DD" (local today)
 *   toKey(date)                         → "YYYY-MM-DD"
 *   fromKey(key)                        → Date (midnight local)
 *   dayDiff(keyA, keyB)                 → integer days (keyB − keyA)
 *   deadlineBucket(deadlineKey, today)  → "alive" | "dying" | "dead"
 *   computeStreak(sortedKeys, today)    → { current, longest, flameLevel }
 *   flameLevel(currentStreak)           → "none" | "kindling" | "burning" | "blazing"
 */

// ---- Day key helpers -----------------------------------------------------

/**
 * Return today's local date as a "YYYY-MM-DD" string.
 * @returns {string}
 */
export function todayKey() {
  return toKey(new Date());
}

/**
 * Convert a Date (or ms timestamp) to a "YYYY-MM-DD" day key using local time.
 * @param {Date|number} date
 * @returns {string}
 */
export function toKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse a "YYYY-MM-DD" key back to a Date at local midnight.
 * @param {string} key
 * @returns {Date}
 */
export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ---- Day arithmetic ------------------------------------------------------

/**
 * Number of whole days between two day keys (keyB − keyA).
 * Positive when keyB is after keyA.
 * @param {string} keyA
 * @param {string} keyB
 * @returns {number}
 */
export function dayDiff(keyA, keyB) {
  const msPerDay = 86_400_000;
  return Math.round((fromKey(keyB) - fromKey(keyA)) / msPerDay);
}

// ---- Deadline bucket rule ------------------------------------------------

/**
 * Classify a deadline into a bucket relative to a reference day.
 *
 * Rule:
 *   dead   — deadline is strictly before today (past)
 *   dying  — deadline is today or within the next 2 days (urgent)
 *   alive  — deadline is 3+ days away
 *
 * @param {string} deadlineKey  — "YYYY-MM-DD" of the deadline
 * @param {string} [todayRef]   — "YYYY-MM-DD" to treat as today (defaults to todayKey())
 * @returns {"alive"|"dying"|"dead"}
 */
export function deadlineBucket(deadlineKey, todayRef) {
  const ref = todayRef ?? todayKey();
  const diff = dayDiff(ref, deadlineKey); // deadlineKey − today

  if (diff < 0)  return 'dead';
  if (diff <= 2) return 'dying';
  return 'alive';
}

// ---- Streak computation --------------------------------------------------

/**
 * Determine the flame level for a current streak count.
 *
 *   0        → "none"
 *   1–2      → "kindling"
 *   3–6      → "burning"
 *   7+       → "blazing"
 *
 * @param {number} current — current streak in days
 * @returns {"none"|"kindling"|"burning"|"blazing"}
 */
export function flameLevel(current) {
  if (current <= 0) return 'none';
  if (current <= 2) return 'kindling';
  if (current <= 6) return 'burning';
  return 'blazing';
}

/**
 * Compute streak statistics from a set of completed-day keys.
 *
 * A streak is a run of consecutive calendar days ending on or including
 * today. Missing today is allowed: if yesterday was the last check-in,
 * the streak is still live (one grace day). If the last check-in was
 * 2+ days ago, the current streak is 0 (broken).
 *
 * @param {string[]} completedKeys  — unsorted array of "YYYY-MM-DD" keys
 * @param {string}   [todayRef]     — "YYYY-MM-DD" override (defaults to todayKey())
 * @returns {{ current: number, longest: number, flameLevel: string }}
 */
export function computeStreak(completedKeys, todayRef) {
  const ref = todayRef ?? todayKey();

  if (!completedKeys || completedKeys.length === 0) {
    return { current: 0, longest: 0, flameLevel: 'none' };
  }

  // Deduplicate and sort ascending
  const keys = [...new Set(completedKeys)].sort();

  // Build consecutive runs
  let longest = 1;
  let runLen = 1;
  for (let i = 1; i < keys.length; i++) {
    const diff = dayDiff(keys[i - 1], keys[i]);
    if (diff === 1) {
      runLen++;
      if (runLen > longest) longest = runLen;
    } else {
      runLen = 1;
    }
  }

  // Current streak: count backwards from today (or yesterday as grace)
  const lastKey = keys[keys.length - 1];
  const daysAgo = dayDiff(lastKey, ref); // ref − lastKey

  let current = 0;
  if (daysAgo <= 1) {
    // Last check-in was today or yesterday — count the trailing run
    current = 1;
    for (let i = keys.length - 2; i >= 0; i--) {
      if (dayDiff(keys[i], keys[i + 1]) === 1) {
        current++;
      } else {
        break;
      }
    }
  }
  // else: last check-in was 2+ days ago — streak broken, current = 0

  // longest may have been updated in the loop above but we need to
  // re-evaluate in case the array had only one element
  if (keys.length === 1) longest = current > 0 ? 1 : 0;

  return {
    current,
    longest: Math.max(longest, current),
    flameLevel: flameLevel(current),
  };
}
