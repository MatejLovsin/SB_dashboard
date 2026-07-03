'use client';

import { useMemo, useState } from 'react';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartReveal } from '@/components/charts/ChartReveal';
import { ScatterTrend, difficultyColor, type ScatterTrendLine, type ScatterTrendPoint } from '@/components/charts/ScatterTrend';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useChartTheme } from '@/lib/utils/chartTheme';
import type { GradedExamPoint } from '@/lib/queries/school';
import {
  MIN_POINTS_FOR_CALIBRATION,
  MIN_POINTS_FOR_MODEL,
  calibrationFlag,
  computeEfficiency,
  fitGradeModel,
  predictHoursForGrade,
  trendLinePoints,
  type ModelPoint,
} from '@/lib/utils/studyModel';

interface GradeInsightsProps {
  points: GradedExamPoint[];
  subjects: { id: string; name: string }[];
}

// Exams need both an hours-studied figure (>0) and a perceived_difficulty rating to
// feed the model — grade alone isn't enough to place them on this chart.
function usable(points: GradedExamPoint[]): (GradedExamPoint & { difficulty: number })[] {
  return points.filter(
    (p): p is GradedExamPoint & { difficulty: number } => p.difficulty != null && p.hoursStudied > 0,
  );
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdev(values: number[], avg: number): number {
  return Math.sqrt(mean(values.map((v) => (v - avg) ** 2)));
}

export function GradeInsights({ points, subjects }: GradeInsightsProps) {
  const theme = useChartTheme();
  const [subjectId, setSubjectId] = useState<string | 'all'>('all');
  const [calcDifficulty, setCalcDifficulty] = useState(3);
  const [calcGrade, setCalcGrade] = useState('85');

  const filtered = useMemo(
    () => (subjectId === 'all' ? points : points.filter((p) => p.subjectId === subjectId)),
    [points, subjectId],
  );
  const withDifficulty = useMemo(() => usable(filtered), [filtered]);

  const model = useMemo(() => {
    const modelPoints: ModelPoint[] = withDifficulty.map((p) => ({
      hours: p.hoursStudied,
      difficulty: p.difficulty,
      grade: p.grade,
    }));
    return fitGradeModel(modelPoints);
  }, [withDifficulty]);

  const scatterData: ScatterTrendPoint[] = useMemo(
    () =>
      withDifficulty.map((p) => ({
        x: p.hoursStudied,
        y: p.grade,
        difficulty: p.difficulty,
        label: p.title?.trim() || p.subjectName,
      })),
    [withDifficulty],
  );

  const trendLines: ScatterTrendLine[] = useMemo(() => {
    if (!model) return [];
    const maxHours = Math.max(1, ...withDifficulty.map((p) => p.hoursStudied));
    const difficulties = [...new Set(withDifficulty.map((p) => p.difficulty))].sort((a, b) => a - b);
    return difficulties.map((difficulty) => ({
      difficulty,
      points: trendLinePoints(model, difficulty, maxHours).map((pt) => ({ x: pt.hours, y: pt.grade })),
    }));
  }, [model, withDifficulty]);

  const flagged = useMemo(() => {
    const withEfficiency = withDifficulty
      .map((p) => ({ ...p, efficiency: computeEfficiency(p.hoursStudied, p.difficulty, p.grade) }))
      .filter((p): p is typeof p & { efficiency: number } => p.efficiency != null);
    if (withEfficiency.length < MIN_POINTS_FOR_CALIBRATION) return null;

    const avg = mean(withEfficiency.map((p) => p.efficiency));
    const sd = stdev(withEfficiency.map((p) => p.efficiency), avg);
    return withEfficiency
      .map((p) => ({ ...p, flag: calibrationFlag(p.efficiency, avg, sd) }))
      .filter((p) => p.flag != null);
  }, [withDifficulty]);

  const targetGrade = Number(calcGrade) || 0;
  const predictedHours = model ? predictHoursForGrade(model, targetGrade, calcDifficulty) : null;

  return (
    <div className="space-y-4">
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSubjectId('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              subjectId === 'all' ? 'bg-accent text-white' : 'border border-border text-muted'
            }`}
          >
            All subjects
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSubjectId(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                subjectId === s.id ? 'bg-accent text-white' : 'border border-border text-muted'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <ChartCard
        title="Grade vs. study time"
        value={model ? `R² ${model.r2.toFixed(2)}` : undefined}
      >
        {scatterData.length === 0 ? (
          <EmptyState
            title="No graded exams with difficulty yet"
            description="Rate difficulty and log study time on an exam, then record its grade to see it here."
          />
        ) : (
          <>
            <ChartReveal height={240}>
              <ScatterTrend
                data={scatterData}
                trendLines={trendLines}
                xLabel="Hours studied"
                yLabel="Grade %"
                height={240}
              />
            </ChartReveal>
            <div className="mt-3 flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((d) => (
                <span key={d} className="flex items-center gap-1.5 text-xs text-muted">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: difficultyColor(theme, d) }}
                  />
                  Difficulty {d}
                </span>
              ))}
            </div>
            {!model && (
              <p className="mt-3 text-xs text-muted">
                Log {MIN_POINTS_FOR_MODEL - withDifficulty.length > 0 ? MIN_POINTS_FOR_MODEL - withDifficulty.length : 0} more
                graded exam{MIN_POINTS_FOR_MODEL - withDifficulty.length === 1 ? '' : 's'} (with difficulty rated) to unlock trend lines.
              </p>
            )}
          </>
        )}
      </ChartCard>

      <ChartCard title="Study efficiency" value={flagged && flagged.length > 0 ? `${flagged.length} flagged` : undefined}>
        {flagged === null ? (
          <EmptyState
            title="Not enough data yet"
            description={`Log at least ${MIN_POINTS_FOR_CALIBRATION} graded exams (with hours and difficulty) to see which difficulty ratings might be off.`}
          />
        ) : flagged.length === 0 ? (
          <EmptyState
            title="Your difficulty ratings look consistent"
            description="No exam stands out as much easier or harder than its rated difficulty suggested."
          />
        ) : (
          <ul className="space-y-2">
            {flagged.map((p) => (
              <li key={p.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{p.title?.trim() || p.subjectName}</span>
                  <span className="text-xs text-muted">{p.grade}% · {p.hoursStudied}h · difficulty {p.difficulty}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {p.flag === 'overrated'
                    ? `Scored well for the effort put in — this may have been easier than a ${p.difficulty} rating suggests.`
                    : `Scored low despite the effort put in — this may have been harder than a ${p.difficulty} rating suggests.`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>

      <ChartCard title="Predict hours needed">
        {!model ? (
          <EmptyState
            title="Not enough data yet"
            description={`Log at least ${MIN_POINTS_FOR_MODEL} graded exams (with hours and difficulty) to unlock predictions. You have ${withDifficulty.length} so far.`}
          />
        ) : (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-sm font-medium">Difficulty</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCalcDifficulty(d)}
                    className={`h-8 w-8 rounded-full text-xs font-semibold transition-colors ${
                      d <= calcDifficulty ? 'bg-accent text-white' : 'border border-border text-muted'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Target grade (%)"
              id="predict-target-grade"
              type="number"
              value={calcGrade}
              onChange={(e) => setCalcGrade(e.target.value)}
            />
            <div className="rounded-xl bg-card-2 p-3">
              <p className="text-2xl font-semibold tracking-tight nums">
                {predictedHours != null ? `~${predictedHours}h` : '—'}
              </p>
              <p className="text-xs text-muted">
                Estimated study time for a {calcGrade || 0}% at difficulty {calcDifficulty}, based on {model.n} past exam
                {model.n === 1 ? '' : 's'}
                {model.r2 < 0.3 ? ' — low-confidence fit, keep logging exams to sharpen this' : ''}.
              </p>
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
