/**
 * Which exam grades actually count.
 *
 * Two rules, and they are the ONLY place either one is expressed — every average,
 * chart and goal metric goes through here so they can never disagree:
 *
 *  1. A failing grade never counts. Not while you are waiting to retake it, not
 *     ever. A failed exam does not sit in a real transcript average either.
 *  2. Exams linked by `retake_of` form a CHAIN, and a chain contributes exactly
 *     one grade: the highest passing attempt in it. That covers both sitting a
 *     fail again and retaking a pass you weren't happy with.
 *
 * Everything else — attempt numbering, "superseded" badges — is derived from the
 * same walk, so the UI and the numbers always tell the same story.
 */

/** Grades are percentages; below this is a fail. */
export const PASS_MARK = 50;

export type ExamAttempt = {
  id: string;
  grade: number | null;
  exam_date: string;
  retake_of: string | null;
};

export type AttemptInfo = {
  /** Id of the first attempt in the chain — stable key for the whole group. */
  chainId: string;
  /** 1-based position of this exam within its chain, in date order. */
  attempt: number;
  /** How many attempts the chain holds. 1 means "not a retake of anything". */
  attempts: number;
  /** Graded at or above {@link PASS_MARK}. */
  passed: boolean;
  /** This exam is the single grade its chain contributes to an average. */
  counts: boolean;
  /** Which attempt does count, if any has passed yet — may be this one. */
  countedId: string | null;
};

/** Depth cap: a malformed `retake_of` cycle must not hang a page render. */
const MAX_CHAIN = 32;

export function isPass(grade: number | null | undefined): boolean {
  return grade != null && grade >= PASS_MARK;
}

/**
 * Walk to the first attempt in a chain. Tolerates a dangling parent (the exam it
 * pointed at was deleted or filtered out of `rows`) and a cycle.
 */
function rootOf(id: string, parent: Map<string, string | null>): string {
  let current = id;
  const seen = new Set([id]);
  for (let hop = 0; hop < MAX_CHAIN; hop++) {
    const next = parent.get(current);
    if (!next || !parent.has(next)) break;
    if (seen.has(next)) {
      // A cycle has no first attempt. Fall back to the lowest id it touches, so
      // that every exam in the loop still agrees on one chain instead of
      // splintering into one chain per starting point.
      return [...seen].sort()[0];
    }
    current = next;
    seen.add(next);
  }
  return current;
}

const byDateThenId = (a: ExamAttempt, b: ExamAttempt) =>
  a.exam_date === b.exam_date ? a.id.localeCompare(b.id) : a.exam_date.localeCompare(b.exam_date);

/** Attempt bookkeeping for every row handed in, keyed by exam id. */
export function resolveAttempts(rows: ExamAttempt[]): Map<string, AttemptInfo> {
  const parent = new Map(rows.map((r) => [r.id, r.retake_of]));
  const chains = new Map<string, ExamAttempt[]>();
  for (const row of rows) {
    const root = rootOf(row.id, parent);
    const chain = chains.get(root);
    if (chain) chain.push(row);
    else chains.set(root, [row]);
  }

  const out = new Map<string, AttemptInfo>();
  for (const [chainId, chain] of chains) {
    chain.sort(byDateThenId);
    // The grade that counts: best pass in the chain, earliest one on a tie.
    let counted: ExamAttempt | null = null;
    for (const row of chain) {
      if (!isPass(row.grade)) continue;
      if (!counted || (row.grade as number) > (counted.grade as number)) counted = row;
    }
    chain.forEach((row, i) => {
      out.set(row.id, {
        chainId,
        attempt: i + 1,
        attempts: chain.length,
        passed: isPass(row.grade),
        counts: counted?.id === row.id,
        countedId: counted?.id ?? null,
      });
    });
  }
  return out;
}

/**
 * The subset of `rows` whose grades belong in an average — one per chain, in
 * date order. This is what every aggregate should be computed over.
 */
export function countedExams<T extends ExamAttempt>(rows: T[]): T[] {
  const info = resolveAttempts(rows);
  return rows.filter((r) => info.get(r.id)?.counts).sort(byDateThenId);
}

/**
 * Ids of every attempt that re-sits `examId`, directly or through another retake.
 * Offering one of these as a retake target would close the chain into a loop, so
 * the exam form filters them out.
 */
export function descendantsOf(rows: ExamAttempt[], examId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.retake_of) continue;
    const list = children.get(row.retake_of);
    if (list) list.push(row.id);
    else children.set(row.retake_of, [row.id]);
  }
  const out = new Set<string>();
  const queue = [examId];
  while (queue.length > 0 && out.size < MAX_CHAIN) {
    for (const child of children.get(queue.pop() as string) ?? []) {
      if (out.has(child)) continue;
      out.add(child);
      queue.push(child);
    }
  }
  return out;
}

/** Ids of the other attempts in this exam's chain, itself excluded. */
export function chainMembers<T extends ExamAttempt>(rows: T[], examId: string): T[] {
  const info = resolveAttempts(rows);
  const chainId = info.get(examId)?.chainId;
  if (!chainId) return [];
  return rows.filter((r) => r.id !== examId && info.get(r.id)?.chainId === chainId).sort(byDateThenId);
}
