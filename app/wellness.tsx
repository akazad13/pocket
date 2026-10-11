'use client';
import { useState } from 'react';
import { calculateWellnessScore, type WellnessReport } from '@/lib/wellness';
import { money } from '@/lib/format';
import type { Expense } from '@/lib/expenses';
import type { Income } from '@/lib/income';
import type { Account, Transfer, Adjustment } from '@/lib/accounts';
import {
  HeartPulse,
  ShieldCheck,
  TrendingUp,
  Landmark,
  PiggyBank,
  Scale,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export type WellnessPanelProps = {
  expenses: Expense[];
  income: Income[];
  accounts: Account[];
  transfers: Transfer[];
  adjustments: Adjustment[];
  budgets: Record<string, number>;
  month: string;
};

export default function WellnessPanel({
  expenses,
  income,
  accounts,
  transfers,
  adjustments,
  budgets,
  month
}: WellnessPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const report: WellnessReport = calculateWellnessScore({
    expenses,
    income,
    accounts,
    transfers,
    adjustments,
    budgets,
    month
  });

  const monthName = new Date(month + '-01T12:00:00').toLocaleDateString('en', {
    month: 'long',
    year: 'numeric'
  });

  // Circular gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (report.score / 100) * circumference;

  const scoreColor =
    report.score >= 85
      ? '#006a4e'
      : report.score >= 70
      ? '#10b981'
      : report.score >= 55
      ? '#f59e0b'
      : report.score >= 40
      ? '#ea580c'
      : '#dc2626';

  return (
    <section className="panel wellness-panel">
      <div className="section-heading">
        <div>
          <div className="wellness-header-title">
            <HeartPulse size={20} className="wellness-heart-icon" />
            <h2>Financial health &amp; wellness</h2>
          </div>
          <p>{monthName} · 5-pillar composite resilience index</p>
        </div>
        <button
          type="button"
          className="text-button wellness-expand-btn"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Hide details <ChevronUp size={15} />
            </>
          ) : (
            <>
              View breakdown <ChevronDown size={15} />
            </>
          )}
        </button>
      </div>

      <div className="wellness-hero-card">
        <div className="wellness-gauge-wrap">
          <svg className="wellness-gauge" viewBox="0 0 100 100" width="104" height="104">
            <circle
              className="wellness-gauge-bg"
              cx="50"
              cy="50"
              r={radius}
              strokeWidth="9"
            />
            <circle
              className="wellness-gauge-fill"
              cx="50"
              cy="50"
              r={radius}
              strokeWidth="9"
              style={{
                stroke: scoreColor,
                strokeDasharray: circumference,
                strokeDashoffset
              }}
            />
          </svg>
          <div className="wellness-score-center">
            <span className="wellness-score-number" style={{ color: scoreColor }}>
              {report.score}
            </span>
            <span className="wellness-score-max">/ 100</span>
          </div>
        </div>

        <div className="wellness-summary-content">
          <div className="wellness-badge-row">
            <span className="wellness-grade-badge" style={{ background: scoreColor + '18', color: scoreColor }}>
              Grade {report.grade}
            </span>
            <span className="wellness-label-badge" style={{ borderColor: scoreColor, color: scoreColor }}>
              {report.label}
            </span>
          </div>

          <p className="wellness-summary-text">{report.summary}</p>

          <div className="wellness-quick-metrics">
            <div className="quick-metric-item">
              <span className="qm-label">Liquid reserves</span>
              <span className="qm-value">{money(report.metrics.liquidAssetsCents)}</span>
            </div>
            <div className="quick-metric-item">
              <span className="qm-label">Emergency buffer</span>
              <span className="qm-value">{report.metrics.runwayMonths} months</span>
            </div>
            <div className="quick-metric-item">
              <span className="qm-label">Savings rate</span>
              <span className="qm-value">{report.metrics.savingsRatePercent}%</span>
            </div>
            <div className="quick-metric-item">
              <span className="qm-label">Debt ratio</span>
              <span className="qm-value">{report.metrics.debtToAssetPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="wellness-breakdown-container">
          <h3 className="wellness-subheading">Pillar Breakdown &amp; Analysis</h3>
          <div className="wellness-pillars-list">
            {report.pillars.map(pillar => {
              const statusClass =
                pillar.status === 'excellent'
                  ? 'pillar-excellent'
                  : pillar.status === 'good'
                  ? 'pillar-good'
                  : pillar.status === 'warning'
                  ? 'pillar-warning'
                  : 'pillar-critical';

              return (
                <div key={pillar.id} className={`wellness-pillar-card ${statusClass}`}>
                  <div className="pillar-top-row">
                    <div className="pillar-name-wrap">
                      {pillar.id === 'savings' && <PiggyBank size={16} />}
                      {pillar.id === 'runway' && <ShieldCheck size={16} />}
                      {pillar.id === 'budget' && <Scale size={16} />}
                      {pillar.id === 'debt' && <Landmark size={16} />}
                      {pillar.id === 'coverage' && <TrendingUp size={16} />}
                      <h4>{pillar.name}</h4>
                    </div>
                    <div className="pillar-score-badge">
                      <strong>{pillar.score}</strong>
                      <small>/ {pillar.maxScore} pts</small>
                    </div>
                  </div>

                  <div className="pillar-progress-track">
                    <div
                      className="pillar-progress-bar"
                      style={{ width: `${pillar.percentage}%` }}
                    />
                  </div>

                  <div className="pillar-detail-row">
                    <p className="pillar-detail-text">{pillar.detail}</p>
                    <span className="pillar-metric-tag">{pillar.metric}</span>
                  </div>

                  {pillar.tip && (
                    <div className="pillar-tip-box">
                      <Sparkles size={13} className="pillar-tip-icon" />
                      <span>{pillar.tip}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {report.recommendations.length > 0 && (
            <div className="wellness-recommendations-card">
              <div className="rec-header">
                <Sparkles size={16} className="rec-sparkle" />
                <h4>Personalized Action Plan</h4>
              </div>
              <ul className="rec-list">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="rec-item">
                    <span className="rec-bullet">{i + 1}</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
