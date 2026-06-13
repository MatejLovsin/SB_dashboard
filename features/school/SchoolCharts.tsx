'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { AreaTrend, type AreaTrendPoint } from '@/components/charts/AreaTrend';
import { DonutStat, type DonutSlice } from '@/components/charts/DonutStat';
import { BarCluster, type BarPoint } from '@/components/charts/BarCluster';

interface SchoolChartsProps {
  weeklyHours: AreaTrendPoint[];
  hoursBySubject: DonutSlice[];
  hoursPerExam: BarPoint[];
  totalHours: number;
  thisWeekHours: number;
}

export function SchoolCharts({
  weeklyHours,
  hoursBySubject,
  hoursPerExam,
  totalHours,
  thisWeekHours,
}: SchoolChartsProps) {
  return (
    <div className="space-y-4">
      <ChartCard title="Weekly study hours" value={`${thisWeekHours}h this week`}>
        <AreaTrend data={weeklyHours} unit="h" name="Hours" height={200} />
      </ChartCard>

      {hoursBySubject.length > 0 && (
        <ChartCard title="Hours by subject" value={`${totalHours}h total`}>
          <DonutStat
            data={hoursBySubject}
            centerValue={totalHours}
            centerLabel="hours"
            height={180}
          />
        </ChartCard>
      )}

      {hoursPerExam.length > 0 && (
        <ChartCard title="Study hours per exam">
          <BarCluster data={hoursPerExam} unit="h" name="Hours" graded height={180} />
        </ChartCard>
      )}
    </div>
  );
}
