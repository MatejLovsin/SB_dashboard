import { describe, expect, it } from 'vitest';
import {
  PASS_MARK, chainMembers, countedExams, descendantsOf, isPass, resolveAttempts,
  type ExamAttempt,
} from './grades';

const exam = (id: string, grade: number | null, date: string, retakeOf: string | null = null): ExamAttempt =>
  ({ id, grade, exam_date: date, retake_of: retakeOf });

describe('isPass', () => {
  it('treats an ungraded exam as not passed', () => {
    expect(isPass(null)).toBe(false);
    expect(isPass(undefined)).toBe(false);
  });

  it('puts the boundary at PASS_MARK inclusive', () => {
    expect(isPass(PASS_MARK - 1)).toBe(false);
    expect(isPass(PASS_MARK)).toBe(true);
  });
});

describe('resolveAttempts', () => {
  it('numbers a lone exam as attempt 1 of 1', () => {
    const info = resolveAttempts([exam('a', 80, '2026-01-01')]).get('a');
    expect(info).toMatchObject({ chainId: 'a', attempt: 1, attempts: 1, passed: true, counts: true });
  });

  it('never counts a failing grade, even with no retake', () => {
    const info = resolveAttempts([exam('a', 40, '2026-01-01')]).get('a');
    expect(info).toMatchObject({ passed: false, counts: false, countedId: null });
  });

  it('counts the passing retake of a failed sitting', () => {
    const rows = [exam('fail', 30, '2026-01-01'), exam('pass', 65, '2026-03-01', 'fail')];
    const info = resolveAttempts(rows);
    expect(info.get('fail')).toMatchObject({ attempt: 1, attempts: 2, counts: false, countedId: 'pass' });
    expect(info.get('pass')).toMatchObject({ attempt: 2, attempts: 2, counts: true });
  });

  it('keeps the better grade when a pass is retaken', () => {
    const better = [exam('first', 60, '2026-01-01'), exam('second', 85, '2026-03-01', 'first')];
    expect(resolveAttempts(better).get('second')?.counts).toBe(true);

    const worse = [exam('first', 85, '2026-01-01'), exam('second', 60, '2026-03-01', 'first')];
    expect(resolveAttempts(worse).get('first')?.counts).toBe(true);
  });

  it('breaks a tie on the earliest attempt', () => {
    const rows = [exam('first', 70, '2026-01-01'), exam('second', 70, '2026-03-01', 'first')];
    expect(resolveAttempts(rows).get('first')?.counts).toBe(true);
    expect(resolveAttempts(rows).get('second')?.counts).toBe(false);
  });

  it('orders a chain by date, not by insertion', () => {
    const rows = [exam('late', 70, '2026-06-01', 'early'), exam('early', 40, '2026-01-01')];
    const info = resolveAttempts(rows);
    expect(info.get('early')?.attempt).toBe(1);
    expect(info.get('late')?.attempt).toBe(2);
  });

  it('treats a dangling retake_of as the start of its own chain', () => {
    const info = resolveAttempts([exam('orphan', 70, '2026-01-01', 'deleted')]).get('orphan');
    expect(info).toMatchObject({ chainId: 'orphan', attempt: 1, attempts: 1, counts: true });
  });

  it('collapses a retake_of cycle into one chain instead of hanging', () => {
    const rows = [exam('a', 70, '2026-01-01', 'b'), exam('b', 60, '2026-02-01', 'a')];
    const info = resolveAttempts(rows);
    expect(info.get('a')?.chainId).toBe(info.get('b')?.chainId);
    expect(info.get('a')?.attempts).toBe(2);
  });
});

describe('countedExams', () => {
  it('returns one row per chain, in date order, dropping failures', () => {
    const rows = [
      exam('m1', 30, '2026-01-01'),
      exam('m2', 75, '2026-05-01', 'm1'),
      exam('solo', 90, '2026-03-01'),
      exam('flunked', 20, '2026-04-01'),
    ];
    expect(countedExams(rows).map((r) => r.id)).toEqual(['solo', 'm2']);
  });

  it('is empty when nothing has passed', () => {
    expect(countedExams([exam('a', 10, '2026-01-01'), exam('b', null, '2026-02-01')])).toEqual([]);
  });
});

describe('descendantsOf', () => {
  const rows = [
    exam('a', 30, '2026-01-01'),
    exam('b', 40, '2026-02-01', 'a'),
    exam('c', 70, '2026-03-01', 'b'),
    exam('unrelated', 70, '2026-03-01'),
  ];

  it('follows retakes transitively', () => {
    expect([...descendantsOf(rows, 'a')].sort()).toEqual(['b', 'c']);
  });

  it('returns nothing for the newest attempt', () => {
    expect(descendantsOf(rows, 'c').size).toBe(0);
  });
});

describe('chainMembers', () => {
  it('lists the other attempts and excludes the exam itself', () => {
    const rows = [exam('a', 30, '2026-01-01'), exam('b', 70, '2026-02-01', 'a')];
    expect(chainMembers(rows, 'a').map((r) => r.id)).toEqual(['b']);
    expect(chainMembers(rows, 'b').map((r) => r.id)).toEqual(['a']);
  });

  it('returns nothing for an unknown exam', () => {
    expect(chainMembers([exam('a', 70, '2026-01-01')], 'nope')).toEqual([]);
  });
});
