export function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function isWeekend(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Count working days (Mon-Fri) between fromDate and toDate inclusive.
 * If isHalfDay is true and halfDayDate is provided:
 * - When halfDayDate is inside the range, subtract 0.5 from the full-day count.
 * - When halfDayDate is outside the range, add 0.5 to the full-day count.
 */
export function calculateLeaveDays(
  fromDate: Date,
  toDate: Date,
  isHalfDay: boolean,
  halfDayDate?: Date,
): number {
  let count = 0;
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    if (!isWeekend(cursor)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (!isHalfDay || !halfDayDate) return count;

  const halfDay = startOfUtcDay(halfDayDate);
  if (isWeekend(halfDay)) return count;

  const inRange = halfDay >= fromDate && halfDay <= toDate;
  return inRange ? Math.max(0, count - 0.5) : count + 0.5;
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
