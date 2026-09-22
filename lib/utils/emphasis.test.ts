import { describe, expect, it } from 'vitest';
import {
  emphasisFor,
  hasLightSplit,
  isLight,
  lightSeries,
  mainSeries,
  splitE1RM,
  type Emphasis,
} from './emphasis';

const point = (emphasis: Emphasis, e1rm = 0) => ({ emphasis, e1rm });

// One heavy + two light sessions a week, which is the shape that broke the chart.
const week = [point('heavy', 100), point('light', 88), point('light', 89)];

describe('emphasisFor', () => {
  it('reads the session snapshot by exercise id', () => {
    expect(emphasisFor({ a: 'heavy', b: 'light' }, 'b')).toBe('light');
  });

  it('is unclassified when the exercise is absent from the snapshot', () => {
    expect(emphasisFor({ a: 'heavy' }, 'b')).toBeNull();
  });

  it('is unclassified for sessions logged before emphasis existed', () => {
    expect(emphasisFor({}, 'a')).toBeNull();
    expect(emphasisFor(null, 'a')).toBeNull();
    expect(emphasisFor(undefined, 'a')).toBeNull();
  });
});

describe('isLight', () => {
  it('holds apart light days only — unclassified is not light', () => {
    expect(isLight('light')).toBe(true);
    expect(isLight('heavy')).toBe(false);
    expect(isLight(null)).toBe(false);
  });
});

describe('splitE1RM', () => {
  it('routes a heavy day to the main series', () => {
    expect(splitE1RM(100, 'heavy')).toEqual({ main: 100, light: null });
  });

  it('routes a light day to the light series', () => {
    expect(splitE1RM(88, 'light')).toEqual({ main: null, light: 88 });
  });

  it('folds an unclassified day into the main series', () => {
    expect(splitE1RM(95, null)).toEqual({ main: 95, light: null });
  });

  it('never puts a value in both series', () => {
    for (const e of ['heavy', 'light', null] as Emphasis[]) {
      const { main, light } = splitE1RM(42, e);
      expect(main === null).toBe(light !== null);
    }
  });
});

describe('mainSeries', () => {
  it('drops light days', () => {
    expect(mainSeries(week)).toEqual([point('heavy', 100)]);
  });

  it('keeps unclassified history alongside heavy days', () => {
    const history = [point(null, 90), point(null, 92), point('heavy', 100), point('light', 88)];
    expect(mainSeries(history).map((p) => p.e1rm)).toEqual([90, 92, 100]);
  });

  it('preserves order', () => {
    const history = [point('heavy', 1), point('light', 0), point('heavy', 2), point('heavy', 3)];
    expect(mainSeries(history).map((p) => p.e1rm)).toEqual([1, 2, 3]);
  });
});

describe('lightSeries', () => {
  it('keeps only light days, in order', () => {
    expect(lightSeries(week).map((p) => p.e1rm)).toEqual([88, 89]);
  });
});

describe('hasLightSplit', () => {
  it('is true once there are two light days to connect', () => {
    expect(hasLightSplit(week)).toBe(true);
  });

  it('is false for a single stray light day', () => {
    expect(hasLightSplit([point('heavy'), point('light')])).toBe(false);
  });

  it('is false for history with no emphasis at all', () => {
    expect(hasLightSplit([point(null), point(null), point(null)])).toBe(false);
  });
});
