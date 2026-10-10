'use client';
import { calculateVelocity } from '@/lib/velocity';
import { money } from '@/lib/format';
import { TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export type VelocityPanelProps = {
  month: string;
  todayDate: string;
  spentCents: number;
  previousMonthSpentCents?: number;
  totalBudgetCents?: number;
};

export default function VelocityPanel({
  month,
  todayDate,
  spentCents,
  previousMonthSpentCents,
  totalBudgetCents,
}: VelocityPanelProps) {
  // Only show velocity panel if there's spending or a budget
  if (spentCents <= 0 && (!totalBudgetCents || totalBudgetCents <= 0)) return null;

  const report = calculateVelocity({
    month,
    today: todayDate,
    spentCents,
    previousMonthSpentCents,
    totalBudgetCents,
  });

  const monthName = new Date(month + '-01T12:00:00').toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate visual bar proportions relative to projected or budget
  const maxBenchmark = Math.max(
    report.projectedTotalCents,
    report.spentCents,
    totalBudgetCents || 0,
    previousMonthSpentCents || 0,
    1
  );

  const spentPct = Math.min(100, Math.round((report.spentCents / maxBenchmark) * 100));
  const projectedRemainPct = Math.max(
    0,
    Math.min(100 - spentPct, Math.round(((report.projectedTotalCents - report.spentCents) / maxBenchmark) * 100))
  );

  return (
    <section className="panel velocity-panel">
      <div className="section-heading">
        <div>
          <h2>Spending pace & forecast</h2>
          <p>
            {monthName} ·{' '}
            {report.isCurrentMonth
              ? `Day ${report.daysElapsed} of ${report.totalDays} (${report.monthProgressPct}% elapsed)`
              : report.isPastMonth
                ? `Finished month · ${report.totalDays} days`
                : `Upcoming month · ${report.totalDays} days`}
          </p>
        </div>

        {report.isCurrentMonth && (
          <div className="velocity-header-badge">
            {report.isOnTrackWithBudget === true ? (
              <span className="velocity-badge on-track">
                <CheckCircle2 size={13} /> On budget pace
              </span>
            ) : report.isOnTrackWithBudget === false ? (
              <span className="velocity-badge over-pace">
                <AlertTriangle size={13} /> Over budget pace
              </span>
            ) : report.projectedVsPreviousPct !== null ? (
              report.projectedVsPreviousPct <= 0 ? (
                <span className="velocity-badge on-track">
                  <TrendingDown size={13} /> Pacing below last month
                </span>
              ) : (
                <span className="velocity-badge over-pace">
                  <TrendingUp size={13} /> Pacing +{report.projectedVsPreviousPct}% vs last month
                </span>
              )
            ) : (
              <span className="velocity-badge neutral">
                <Clock size={13} /> {report.daysRemaining} days left
              </span>
            )}
          </div>
        )}
      </div>

      <div className="velocity-stats-grid">
        <div className="velocity-stat-box primary">
          <small>{report.isCurrentMonth ? 'Daily burn rate' : 'Average daily spend'}</small>
          <strong>{money(report.dailyRateCents)}</strong>
          <span>
            {report.isCurrentMonth
              ? `Averaged across ${report.daysElapsed} days`
              : `Over ${report.totalDays} days`}
          </span>
        </div>

        <div className="velocity-stat-box">
          <small>{report.isCurrentMonth ? 'Projected month end' : 'Month total spent'}</small>
          <strong>{money(report.projectedTotalCents)}</strong>
          <span>
            {report.projectedVsPreviousPct !== null
              ? `${report.projectedVsPreviousPct > 0 ? '+' : ''}${report.projectedVsPreviousPct}% vs last month (${money(previousMonthSpentCents ?? 0)})`
              : `${money(report.spentCents)} recorded so far`}
          </span>
        </div>

        <div className="velocity-stat-box highlight">
          {report.safeDailyAllowanceCents !== null ? (
            <>
              <small>Safe daily allowance</small>
              <strong>{money(report.safeDailyAllowanceCents)}</strong>
              <span>
                To stay under {money(totalBudgetCents ?? 0)} budget for next {report.daysRemaining} days
              </span>
            </>
          ) : (
            <>
              <small>Month countdown</small>
              <strong>
                {report.isCurrentMonth
                  ? `${report.daysRemaining} days left`
                  : report.isPastMonth
                    ? '100% complete'
                    : 'Not started'}
              </strong>
              <span>
                {report.isCurrentMonth
                  ? `${report.daysElapsed} days completed`
                  : `${report.totalDays} days in ${monthName.split(' ')[0]}`}
              </span>
            </>
          )}
        </div>
      </div>

      {report.isCurrentMonth && report.projectedTotalCents > 0 && (
        <div className="velocity-progress-container">
          <div className="velocity-bar-header">
            <span>
              Spent so far: <b>{money(report.spentCents)}</b>
            </span>
            <span>
              Projected end: <b>{money(report.projectedTotalCents)}</b>
            </span>
          </div>

          <div className="velocity-bar-track">
            <div
              className="velocity-bar-fill actual"
              style={{ width: `${spentPct}%` }}
              title={`Spent: ${money(report.spentCents)}`}
            />
            {projectedRemainPct > 0 && (
              <div
                className="velocity-bar-fill projected"
                style={{ width: `${projectedRemainPct}%` }}
                title={`Projected remaining: ${money(report.projectedTotalCents - report.spentCents)}`}
              />
            )}
          </div>

          <div className="velocity-insights">
            {report.isOnTrackWithBudget === true && report.projectedVsBudgetCents !== null && (
              <p>
                ✓ At your current pace, you are projected to finish{' '}
                <b>{money(Math.abs(report.projectedVsBudgetCents))} under budget</b>.
              </p>
            )}
            {report.isOnTrackWithBudget === false && report.projectedVsBudgetCents !== null && (
              <p className="warn">
                ⚠ At your current pace, you are projected to exceed your budget by{' '}
                <b>{money(report.projectedVsBudgetCents)}</b>. Consider limiting spending to{' '}
                <b>{money(report.safeDailyAllowanceCents ?? 0)}/day</b>.
              </p>
            )}
            {report.isOnTrackWithBudget === null && report.projectedVsPreviousCents !== null && (
              <p>
                At your pace of <b>{money(report.dailyRateCents)}/day</b>, you are projected to spend{' '}
                <b>{money(report.projectedTotalCents)}</b> this month ({Math.abs(report.projectedVsPreviousPct ?? 0)}%{' '}
                {(report.projectedVsPreviousPct ?? 0) >= 0 ? 'more than' : 'less than'} last month).
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
