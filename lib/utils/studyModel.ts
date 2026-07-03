export type ModelPoint = { hours: number; difficulty: number; grade: number };

export type GradeModel = {
  intercept: number;
  hoursCoef: number;
  difficultyCoef: number;
  n: number;
  /** Fraction of grade variance the fit explains (0-1) — how much to trust its predictions. */
  r2: number;
};

export const MIN_POINTS_FOR_MODEL = 6;
export const MIN_POINTS_FOR_CALIBRATION = 3;

const DET_EPSILON = 1e-9;
const COEF_EPSILON = 1e-6;

function det3(m: [number, number, number][]): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

// Solves the 3x3 system M x = v via Cramer's rule. Returns null if M is singular.
function solve3x3(
  m: [number, number, number][],
  v: [number, number, number],
): [number, number, number] | null {
  const d = det3(m);
  if (Math.abs(d) < DET_EPSILON) return null;

  const dx = det3([
    [v[0], m[0][1], m[0][2]],
    [v[1], m[1][1], m[1][2]],
    [v[2], m[2][1], m[2][2]],
  ]);
  const dy = det3([
    [m[0][0], v[0], m[0][2]],
    [m[1][0], v[1], m[1][2]],
    [m[2][0], v[2], m[2][2]],
  ]);
  const dz = det3([
    [m[0][0], m[0][1], v[0]],
    [m[1][0], m[1][1], v[1]],
    [m[2][0], m[2][1], v[2]],
  ]);

  return [dx / d, dy / d, dz / d];
}

// Closed-form OLS fit of grade ~ intercept + hoursCoef*hours + difficultyCoef*difficulty,
// solved via the 3x3 normal-equations matrix. Returns null when there isn't enough usable
// data or the system is singular (e.g. difficulty is constant across all points) — we'd
// rather show nothing than a fitted line built on too little/degenerate data.
export function fitGradeModel(points: ModelPoint[]): GradeModel | null {
  const usable = points.filter((p) => p.hours > 0 && p.difficulty > 0);
  if (usable.length < MIN_POINTS_FOR_MODEL) return null;

  let n = 0;
  let sumH = 0;
  let sumD = 0;
  let sumH2 = 0;
  let sumD2 = 0;
  let sumHD = 0;
  let sumG = 0;
  let sumHG = 0;
  let sumDG = 0;

  for (const p of usable) {
    n++;
    sumH += p.hours;
    sumD += p.difficulty;
    sumH2 += p.hours * p.hours;
    sumD2 += p.difficulty * p.difficulty;
    sumHD += p.hours * p.difficulty;
    sumG += p.grade;
    sumHG += p.hours * p.grade;
    sumDG += p.difficulty * p.grade;
  }

  const matrix: [number, number, number][] = [
    [n, sumH, sumD],
    [sumH, sumH2, sumHD],
    [sumD, sumHD, sumD2],
  ];
  const vector: [number, number, number] = [sumG, sumHG, sumDG];

  const solved = solve3x3(matrix, vector);
  if (!solved) return null;

  const [intercept, hoursCoef, difficultyCoef] = solved;
  const meanG = sumG / n;
  let ssRes = 0;
  let ssTot = 0;
  for (const p of usable) {
    const predicted = intercept + hoursCoef * p.hours + difficultyCoef * p.difficulty;
    ssRes += (p.grade - predicted) ** 2;
    ssTot += (p.grade - meanG) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { intercept, hoursCoef, difficultyCoef, n, r2 };
}

export function predictGrade(model: GradeModel, hours: number, difficulty: number): number {
  return model.intercept + model.hoursCoef * hours + model.difficultyCoef * difficulty;
}

export function predictHoursForGrade(
  model: GradeModel,
  targetGrade: number,
  difficulty: number,
): number | null {
  if (Math.abs(model.hoursCoef) < COEF_EPSILON) return null;
  const hours = (targetGrade - model.intercept - model.difficultyCoef * difficulty) / model.hoursCoef;
  return Math.round(Math.max(0, hours) * 10) / 10;
}

export function trendLinePoints(
  model: GradeModel,
  difficulty: number,
  hoursMax: number,
): { hours: number; grade: number }[] {
  return [
    { hours: 0, grade: predictGrade(model, 0, difficulty) },
    { hours: hoursMax, grade: predictGrade(model, hoursMax, difficulty) },
  ];
}

export function computeEfficiency(hours: number, difficulty: number, grade: number): number | null {
  if (hours <= 0 || difficulty <= 0) return null;
  return grade / (hours * difficulty);
}

// z >= threshold ("overrated"): grade came in high relative to hours×difficulty, i.e. the
// exam scored easier than its stated difficulty suggested. z <= -threshold ("underrated"):
// grade came in low despite the effort, i.e. the exam was actually harder than rated.
export function calibrationFlag(
  efficiency: number,
  mean: number,
  stdev: number,
  zThreshold = 1.25,
): 'overrated' | 'underrated' | null {
  if (stdev === 0) return null;
  const z = (efficiency - mean) / stdev;
  if (z >= zThreshold) return 'overrated';
  if (z <= -zThreshold) return 'underrated';
  return null;
}
