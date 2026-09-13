import { describe, expect, it } from 'vitest';
import {
  bestSetE1RM, bestWeight, deltaPercent, estimatedOneRepMax, mondayOf, totalVolume,
  type SetLike,
} from './stats';

const set = (weight: number | null, reps: number | null, completed = true): SetLike =>
  ({ weight, reps, completed });

describe('estimatedOneRepMax', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100);
  });

  it('applies the Epley formula above one rep', () => {
    expect(estimatedOneRepMax(100, 10)).toBeCloseTo(133.33, 2);
  });

  it('refuses nonsense input rather than returning a negative max', () => {
    expect(estimatedOneRepMax(0, 5)).toBe(0);
    expect(estimatedOneRepMax(100, 0)).toBe(0);
    expect(estimatedOneRepMax(-50, 5)).toBe(0);
  });
});

describe('bestSetE1RM', () => {
  it('takes the highest estimate across completed sets', () => {
    expect(bestSetE1RM([set(100, 5), set(90, 10)])).toBeCloseTo(120, 5);
  });

  it('ignores sets that were not completed or not filled in', () => {
    expect(bestSetE1RM([set(200, 5, false), set(null, 5), set(100, null)])).toBe(0);
  });
});

describe('bestWeight', () => {
  it('reports the heaviest completed set', () => {
    expect(bestWeight([set(60, 10), set(80, 3), set(70, 8)])).toBe(80);
  });

  it('skips incomplete sets and non-positive weights', () => {
    expect(bestWeight([set(100, 5, false), set(0, 10), set(40, 10)])).toBe(40);
  });
});

describe('totalVolume', () => {
  it('sums reps times weight and rounds', () => {
    expect(totalVolume([set(100, 5), set(62.5, 3)])).toBe(688);
  });

  it('counts only completed, fully filled sets', () => {
    expect(totalVolume([set(100, 5, false), set(100, null), set(50, 2)])).toBe(100);
  });
});

describe('mondayOf', () => {
  it('returns the same week for a midweek day', () => {
    expect(mondayOf(new Date('2026-09-09T12:00:00Z'))).toBe('2026-09-07');
  });

  it('is idempotent on a Monday', () => {
    expect(mondayOf(new Date('2026-09-07T00:00:00Z'))).toBe('2026-09-07');
  });

  it('treats Sunday as the end of the week it closes, not the start of the next', () => {
    expect(mondayOf(new Date('2026-09-13T23:00:00Z'))).toBe('2026-09-07');
  });
});

describe('deltaPercent', () => {
  it('reports a percentage change', () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(50, 100)).toBe(-50);
  });

  it('returns null rather than dividing by zero', () => {
    expect(deltaPercent(100, 0)).toBeNull();
  });
});
