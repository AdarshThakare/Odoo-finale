export const PF_RATE = 0.12;

export function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function countWeekdays(from: Date, to: Date) {
  let count = 0;
  const cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);

  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
}

export function lookupProfessionalTax(monthlyGross: number) {
  if (monthlyGross <= 10000) return 0;
  if (monthlyGross <= 15000) return 150;
  return 200;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
