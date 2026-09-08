'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Dumbbell, Settings2 } from 'lucide-react';
import type { ProgrammeItem } from '@/lib/db/types';
import { Card } from '@/components/ui/Card';
import { isoWeekday, weekdayLabel, type ProgrammeDayWithPlan } from '@/lib/queries/programme';

// Heavy / light main-lift chips. Accessories render as plain muted text so the
// four main lifts are the only things that carry color — matching the source
// programme diagram, where only heavy (red) and light (blue) are highlighted.
function ExerciseChip({ item }: { item: ProgrammeItem }) {
  if (!item.emphasis) {
    return (
      <li className="truncate px-1.5 py-[3px] text-[11px] leading-tight text-muted">
        {item.name}
      </li>
    );
  }
  const heavy = item.emphasis === 'heavy';
  return (
    <li
      className="truncate rounded-md border px-1.5 py-[3px] text-[11px] font-medium leading-tight"
      style={{
        color: heavy ? 'var(--load-heavy)' : 'var(--load-light)',
        borderColor: heavy ? 'var(--load-heavy-soft)' : 'var(--load-light-soft)',
        background: heavy ? 'var(--load-heavy-soft)' : 'var(--load-light-soft)',
      }}
      title={heavy ? 'Heavy — near failure' : 'Light — technique / volume'}
    >
      {item.name}
    </li>
  );
}

function DayCard({ day, isToday }: { day: ProgrammeDayWithPlan; isToday: boolean }) {
  const isRest = !day.label;

  const body = (
    <div
      className={`panel-hover press-flash flex h-full flex-col rounded-xl border p-2.5 transition-colors ${
        isToday ? 'border-accent' : 'border-border'
      } ${isRest ? 'bg-background' : 'bg-card-2'}`}
      style={isToday ? { background: 'var(--accent-soft)' } : undefined}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-1">
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest ${
            isToday ? 'text-accent' : 'text-muted'
          }`}
        >
          {weekdayLabel(day.weekday)}
        </span>
        {isToday && (
          <span className="text-[9px] font-semibold uppercase tracking-wider text-accent">
            Today
          </span>
        )}
      </div>

      <div
        className={`mb-2 truncate text-sm font-semibold ${
          isRest ? 'text-muted' : 'text-foreground'
        }`}
      >
        {day.label ?? 'Rest'}
      </div>

      {isRest ? (
        <p className="text-[11px] leading-tight text-muted/70">Recovery day</p>
      ) : (
        <>
          <ul className="-mx-0.5 space-y-0.5">
            {day.items.map((item, i) => (
              <ExerciseChip key={`${item.name}-${i}`} item={item} />
            ))}
          </ul>

          {/* The plan this day actually opens — or a prompt to pick one. */}
          <div className="mt-auto flex items-center gap-1 border-t border-border/60 pt-2 text-[10px]">
            <Dumbbell className="h-3 w-3 shrink-0 text-muted" />
            {day.planName ? (
              <span className="truncate text-muted" title={day.planName}>
                {day.planName}
              </span>
            ) : (
              <span className="truncate text-accent">Link a plan</span>
            )}
          </div>
        </>
      )}
    </div>
  );

  // A training day opens its linked plan; one with no plan yet sends you to the
  // editor to assign one. Rest days aren't destinations.
  if (isRest) {
    return <div className="h-full">{body}</div>;
  }
  return (
    <Link
      href={day.plan_id ? `/fitness/plans/${day.plan_id}` : '/fitness/programme'}
      className="block h-full"
    >
      {body}
    </Link>
  );
}

export function WeekProgramme({ days }: { days: ProgrammeDayWithPlan[] }) {
  // Resolved after mount so "today" uses the user's timezone, not the server's
  // (Vercel runs UTC, which would mis-highlight the day around midnight).
  const [today, setToday] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const weekday = isoWeekday();
    setToday(weekday);

    // Bring today into view on phones without yanking the whole page.
    const el = scrollerRef.current?.querySelector<HTMLElement>(`[data-weekday="${weekday}"]`);
    if (el && scrollerRef.current && scrollerRef.current.scrollWidth > scrollerRef.current.clientWidth) {
      scrollerRef.current.scrollTo({
        left: el.offsetLeft - scrollerRef.current.offsetLeft - 12,
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            This week
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: 'var(--load-heavy)' }}
              />
              Heavy
            </span>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: 'var(--load-light)' }}
              />
              Light
            </span>
          </div>
          <Link
            href="/fitness/programme"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-accent"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Edit
          </Link>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-7 lg:overflow-visible"
      >
        {days.map((day) => (
          <div
            key={day.weekday}
            data-weekday={day.weekday}
            className="shrink-0 basis-[44%] snap-start sm:basis-[26%] lg:basis-auto lg:shrink"
          >
            <DayCard day={day} isToday={today === day.weekday} />
          </div>
        ))}
      </div>
    </Card>
  );
}
