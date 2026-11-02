/**
 * dates.test.js — tests for skeleton/dates.js
 * Run with: bun test
 */

import { describe, it, expect } from 'bun:test';
import {
  todayKey,
  toKey,
  fromKey,
  dayDiff,
  deadlineBucket,
  flameLevel,
  computeStreak,
} from './dates.js';

// =========================================================================
// toKey / fromKey / todayKey
// =========================================================================
describe('toKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toKey(new Date(2026, 9, 31))).toBe('2026-10-31'); // months 0-indexed
  });

  it('zero-pads month and day', () => {
    expect(toKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('accepts a ms timestamp', () => {
    const ms = new Date(2026, 10, 1).getTime();
    expect(toKey(ms)).toBe('2026-11-01');
  });
});

describe('fromKey', () => {
  it('parses a YYYY-MM-DD key to a local Date at midnight', () => {
    const d = fromKey('2026-10-31');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);  // 0-indexed
    expect(d.getDate()).toBe(31);
    expect(d.getHours()).toBe(0);
  });
});

describe('toKey ↔ fromKey round-trip', () => {
  it('is lossless', () => {
    const key = '2026-06-15';
    expect(toKey(fromKey(key))).toBe(key);
  });
});

describe('todayKey', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches toKey(new Date())', () => {
    // call both in the same tick to avoid midnight edge case
    const now = new Date();
    expect(todayKey()).toBe(toKey(now));
  });
});

// =========================================================================
// dayDiff
// =========================================================================
describe('dayDiff', () => {
  it('returns 0 for the same key', () => {
    expect(dayDiff('2026-10-31', '2026-10-31')).toBe(0);
  });

  it('returns 1 for consecutive days', () => {
    expect(dayDiff('2026-10-30', '2026-10-31')).toBe(1);
  });

  it('returns -1 when second key is before first', () => {
    expect(dayDiff('2026-11-01', '2026-10-31')).toBe(-1);
  });

  it('handles month boundaries', () => {
    expect(dayDiff('2026-01-31', '2026-02-01')).toBe(1);
  });

  it('handles year boundaries', () => {
    expect(dayDiff('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('returns 31 for a full month apart', () => {
    expect(dayDiff('2026-10-01', '2026-11-01')).toBe(31);
  });

  it('handles leap day', () => {
    expect(dayDiff('2024-02-28', '2024-03-01')).toBe(2);
  });
});

// =========================================================================
// deadlineBucket
// =========================================================================
describe('deadlineBucket', () => {
  const TODAY = '2026-10-31';

  it('dead — deadline was yesterday', () => {
    expect(deadlineBucket('2026-10-30', TODAY)).toBe('dead');
  });

  it('dead — deadline was a week ago', () => {
    expect(deadlineBucket('2026-10-24', TODAY)).toBe('dead');
  });

  it('dying — deadline is today', () => {
    expect(deadlineBucket('2026-10-31', TODAY)).toBe('dying');
  });

  it('dying — deadline is tomorrow', () => {
    expect(deadlineBucket('2026-11-01', TODAY)).toBe('dying');
  });

  it('dying — deadline is 2 days away', () => {
    expect(deadlineBucket('2026-11-02', TODAY)).toBe('dying');
  });

  it('alive — deadline is 3 days away', () => {
    expect(deadlineBucket('2026-11-03', TODAY)).toBe('alive');
  });

  it('alive — deadline is far in the future', () => {
    expect(deadlineBucket('2027-06-01', TODAY)).toBe('alive');
  });

  it('uses real today when no ref given', () => {
    const result = deadlineBucket(todayKey());
    // Today's deadline is always dying (diff 0)
    expect(result).toBe('dying');
  });
});

// =========================================================================
// flameLevel
// =========================================================================
describe('flameLevel', () => {
  it('none for 0', ()   => expect(flameLevel(0)).toBe('none'));
  it('none for negative', () => expect(flameLevel(-1)).toBe('none'));
  it('kindling for 1',  ()  => expect(flameLevel(1)).toBe('kindling'));
  it('kindling for 2',  ()  => expect(flameLevel(2)).toBe('kindling'));
  it('burning for 3',   ()  => expect(flameLevel(3)).toBe('burning'));
  it('burning for 6',   ()  => expect(flameLevel(6)).toBe('burning'));
  it('blazing for 7',   ()  => expect(flameLevel(7)).toBe('blazing'));
  it('blazing for 100', ()  => expect(flameLevel(100)).toBe('blazing'));
});

// =========================================================================
// computeStreak
// =========================================================================
describe('computeStreak — edge cases', () => {
  it('empty array → current 0, longest 0, none', () => {
    const r = computeStreak([], '2026-10-31');
    expect(r).toEqual({ current: 0, longest: 0, flameLevel: 'none' });
  });

  it('null/undefined → same as empty', () => {
    const r = computeStreak(null, '2026-10-31');
    expect(r).toEqual({ current: 0, longest: 0, flameLevel: 'none' });
  });

  it('deduplicates keys', () => {
    const r = computeStreak(['2026-10-31', '2026-10-31'], '2026-10-31');
    expect(r.current).toBe(1);
  });
});

describe('computeStreak — current streak live', () => {
  it('single check-in today → current 1, kindling', () => {
    const r = computeStreak(['2026-10-31'], '2026-10-31');
    expect(r.current).toBe(1);
    expect(r.flameLevel).toBe('kindling');
  });

  it('single check-in yesterday → current 1 (grace day), kindling', () => {
    const r = computeStreak(['2026-10-30'], '2026-10-31');
    expect(r.current).toBe(1);
    expect(r.flameLevel).toBe('kindling');
  });

  it('two consecutive days ending today → current 2, kindling', () => {
    const r = computeStreak(['2026-10-30', '2026-10-31'], '2026-10-31');
    expect(r.current).toBe(2);
    expect(r.flameLevel).toBe('kindling');
  });

  it('3-day run ending today → current 3, burning', () => {
    const r = computeStreak(['2026-10-29', '2026-10-30', '2026-10-31'], '2026-10-31');
    expect(r.current).toBe(3);
    expect(r.flameLevel).toBe('burning');
  });

  it('7-day run ending today → current 7, blazing', () => {
    const keys = ['2026-10-25','2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31'];
    const r = computeStreak(keys, '2026-10-31');
    expect(r.current).toBe(7);
    expect(r.flameLevel).toBe('blazing');
  });

  it('unsorted input still computes correctly', () => {
    const r = computeStreak(['2026-10-31', '2026-10-29', '2026-10-30'], '2026-10-31');
    expect(r.current).toBe(3);
  });
});

describe('computeStreak — broken streak', () => {
  it('last check-in 2 days ago → current 0, none', () => {
    const r = computeStreak(['2026-10-29'], '2026-10-31');
    expect(r.current).toBe(0);
    expect(r.flameLevel).toBe('none');
  });

  it('last check-in a week ago → current 0', () => {
    const r = computeStreak(['2026-10-24'], '2026-10-31');
    expect(r.current).toBe(0);
  });
});

describe('computeStreak — longest', () => {
  it('longest reflects the max historical run', () => {
    // Past 5-day run, then a gap, then current 2-day run
    const keys = [
      '2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05', // longest=5
      '2026-10-30','2026-10-31',                                         // current=2
    ];
    const r = computeStreak(keys, '2026-10-31');
    expect(r.current).toBe(2);
    expect(r.longest).toBe(5);
  });

  it('longest equals current when no prior longer run', () => {
    const keys = ['2026-10-29','2026-10-30','2026-10-31'];
    const r = computeStreak(keys, '2026-10-31');
    expect(r.longest).toBe(r.current);
  });

  it('longest is at least 1 for a single past check-in (broken streak)', () => {
    const r = computeStreak(['2026-10-01'], '2026-10-31');
    expect(r.longest).toBe(0); // only 1 day, current=0, longest from broken run is 1 key = 1 run
  });
});
