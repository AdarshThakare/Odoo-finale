export function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function isWeekend(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Count working days (Mon–Fri) between fromDate and toDate inclusive.
 * Returns 0.5 for a half-day request.
 */
export function calculateLeaveDays(fromDate: Date, toDate: Date, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5;

  let count = 0;
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    if (!isWeekend(cursor)) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/**
 * Return all working days (Mon–Fri) in [fromDate, toDate] inclusive.
 */
export function enumerateWorkdays(fromDate: Date, toDate: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    if (!isWeekend(cursor)) dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
