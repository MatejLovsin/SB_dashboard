'use client';

import { AreaTrend, type AreaTrendPoint } from '@/components/charts/AreaTrend';

interface Props {
  data: AreaTrendPoint[];
}

export function SubjectHoursChart({ data }: Props) {
  return <AreaTrend data={data} unit="h" name="Hours" height={180} />;
}
