export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - today.getTime()) / 86_400_000);
}
