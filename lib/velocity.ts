export type VelocityParams = {
  month: string; // YYYY-MM
  today: string; // YYYY-MM-DD
  spentCents: number;
  previousMonthSpentCents?: number;
  totalBudgetCents?: number;
};

export type VelocityReport = {
  isCurrentMonth: boolean;
  isPastMonth: boolean;
  isFutureMonth: boolean;
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  monthProgressPct: number;
  spentCents: number;
  dailyRateCents: number;
  projectedTotalCents: number;
  projectedVsPreviousCents: number | null;
  projectedVsPreviousPct: number | null;
  projectedVsBudgetCents: number | null;
  safeDailyAllowanceCents: number | null;
  isOnTrackWithBudget: boolean | null;
};

export function getDaysInMonth(year: number, month1Indexed: number): number {
  return new Date(Date.UTC(year, month1Indexed, 0)).getUTCDate();
}

export function calculateVelocity({
  month,
  today,
  spentCents,
  previousMonthSpentCents,
  totalBudgetCents,
}: VelocityParams): VelocityReport {
  const [mYearStr, mMonthStr] = month.split('-');
  const mYear = parseInt(mYearStr, 10);
  const mMonth = parseInt(mMonthStr, 10);
  const totalDays = getDaysInMonth(mYear, mMonth);

  const currentMonthPrefix = today.slice(0, 7);
  const isCurrentMonth = month === currentMonthPrefix;
  const isPastMonth = month < currentMonthPrefix;
  const isFutureMonth = month > currentMonthPrefix;

  let daysElapsed = 0;
  let daysRemaining = totalDays;

  if (isPastMonth) {
    daysElapsed = totalDays;
    daysRemaining = 0;
  } else if (isCurrentMonth) {
    const todayDay = parseInt(today.slice(8, 10), 10);
    daysElapsed = Math.min(totalDays, Math.max(1, todayDay));
    daysRemaining = Math.max(0, totalDays - daysElapsed);
  } else {
    // Future month
    daysElapsed = 0;
    daysRemaining = totalDays;
  }

  const monthProgressPct = Math.round((daysElapsed / totalDays) * 100);

  const dailyRateCents =
    daysElapsed > 0 ? Math.round(spentCents / daysElapsed) : 0;

  const projectedTotalCents = isPastMonth
    ? spentCents
    : isCurrentMonth
      ? Math.round(dailyRateCents * totalDays)
      : 0;

  let projectedVsPreviousCents: number | null = null;
  let projectedVsPreviousPct: number | null = null;
  if (
    previousMonthSpentCents !== undefined &&
    previousMonthSpentCents > 0 &&
    (isCurrentMonth || isPastMonth)
  ) {
    projectedVsPreviousCents = projectedTotalCents - previousMonthSpentCents;
    projectedVsPreviousPct = Math.round(
      ((projectedTotalCents - previousMonthSpentCents) / previousMonthSpentCents) * 100
    );
  }

  let projectedVsBudgetCents: number | null = null;
  let safeDailyAllowanceCents: number | null = null;
  let isOnTrackWithBudget: boolean | null = null;

  if (totalBudgetCents !== undefined && totalBudgetCents > 0) {
    projectedVsBudgetCents = projectedTotalCents - totalBudgetCents;
    isOnTrackWithBudget = projectedTotalCents <= totalBudgetCents;

    if (isCurrentMonth && daysRemaining > 0) {
      const budgetRemaining = totalBudgetCents - spentCents;
      safeDailyAllowanceCents =
        budgetRemaining > 0 ? Math.floor(budgetRemaining / daysRemaining) : 0;
    }
  }

  return {
    isCurrentMonth,
    isPastMonth,
    isFutureMonth,
    totalDays,
    daysElapsed,
    daysRemaining,
    monthProgressPct,
    spentCents,
    dailyRateCents,
    projectedTotalCents,
    projectedVsPreviousCents,
    projectedVsPreviousPct,
    projectedVsBudgetCents,
    safeDailyAllowanceCents,
    isOnTrackWithBudget,
  };
}
