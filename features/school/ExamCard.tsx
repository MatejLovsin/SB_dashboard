import type { ExamWithSubject } from '@/lib/queries/school';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pencil, Trash2 } from 'lucide-react';
import { daysUntil } from '@/lib/utils/dates';

interface Props {
  exam: ExamWithSubject;
  studySeconds?: number;
  onEdit: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  isDeleting?: boolean;
}

export function ExamCard({ exam, studySeconds = 0, onEdit, onDelete, onOpen, isDeleting }: Props) {
  const days = daysUntil(exam.exam_date);
  const isUpcoming = days >= 0;
  const progress = exam.target_study_hours
    ? Math.min(100, (studySeconds / (exam.target_study_hours * 3600)) * 100)
    : null;

  return (
    <Card
      className="space-y-2 p-4 cursor-pointer transition-colors hover:border-accent/30"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.();
        }
      }}
    >
      <div className="flex items-start gap-2">
        {exam.subject?.color && (
          <span
            className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: exam.subject.color }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {exam.title ?? exam.subject?.name ?? 'Exam'}
          </p>
          {exam.subject && (
            <p className="mt-0.5 text-xs text-muted">{exam.subject.name}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={isDeleting}
            aria-label="Delete"
            className="text-red-500 hover:text-red-600 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {new Date(exam.exam_date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </span>
        {isUpcoming ? (
          <span className={days <= 7 ? 'font-medium text-amber-500' : ''}>
            {days === 0 ? 'Today!' : `${days}d left`}
          </span>
        ) : (
          exam.grade != null
            ? <span className="font-medium">{exam.grade}%</span>
            : <span className="italic">no grade</span>
        )}
      </div>

      {exam.perceived_difficulty != null && (
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map((d) => (
            <span
              key={d}
              className={`h-2 w-2 rounded-full ${d <= exam.perceived_difficulty! ? 'bg-accent' : 'bg-border'}`}
            />
          ))}
        </div>
      )}

      {progress !== null && isUpcoming && (
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs text-muted">
            <span>Study progress</span>
            <span>{(studySeconds / 3600).toFixed(1)}h / {exam.target_study_hours}h</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </Card>
  );
}
