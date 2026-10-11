"use client";
import React, {useState} from 'react';
import {Zap,ChevronDown,ChevronUp,ArrowRight,Flame} from 'lucide-react';
import {money, shortDate} from '@/lib/format';
import type {Expense} from '@/lib/expenses';
import {detectSpendingAnomalies, type SpendingAnomaly} from '@/lib/anomaly';

interface AnomalyBannerProps {
  items: Expense[];
  month: string;
  monthName: string;
  onFilterAnomaly?: (expenseId: string, category: string) => void;
}

export default function AnomalyBanner({
  items,
  month,
  monthName,
  onFilterAnomaly
}: AnomalyBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const report = detectSpendingAnomalies(items, month);

  if (report.anomalies.length === 0) {
    return null;
  }

  const {anomalies, totalAnomalyCents, percentageOfMonthlySpend} = report;

  return (
    <section className="anomaly-panel panel" aria-label="Spending Spike Detector">
      <div className="anomaly-header" onClick={() => setExpanded(v => !v)}>
        <div className="anomaly-icon-badge">
          <Zap size={18} />
        </div>
        <div className="anomaly-title-area">
          <h3>
            {anomalies.length} spending {anomalies.length === 1 ? 'spike' : 'spikes'} detected in {monthName.split(' ')[0]}
          </h3>
          <p>
            {money(totalAnomalyCents)} in non-routine expenses ({percentageOfMonthlySpend}% of this month’s spend)
          </p>
        </div>
        <button
          type="button"
          className="text-button anomaly-toggle-btn"
          aria-expanded={expanded}
          onClick={e => {
            e.stopPropagation();
            setExpanded(v => !v);
          }}
        >
          {expanded ? 'Hide details' : `Review ${anomalies.length} ${anomalies.length === 1 ? 'spike' : 'spikes'}`}
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {expanded && (
        <div className="anomaly-list">
          {anomalies.map(a => {
            const severityClass = `spike-${a.severity}`;
            return (
              <div className="anomaly-item" key={a.id}>
                <div className="anomaly-item-main">
                  <div className="anomaly-item-title">
                    <b>{a.category}</b>
                    <span className={`spike-badge ${severityClass}`}>
                      <Flame size={11} />
                      {a.multiplier}× typical
                    </span>
                  </div>
                  <p className="anomaly-item-sub">
                    {shortDate(a.date)}
                    {a.method ? ` · ${a.method}` : ''}
                    {a.note ? ` · ${a.note}` : ''}
                  </p>
                  <span className="anomaly-baseline-note">
                    Category median is {money(a.categoryMedianCents)} (+{money(a.excessCents)} higher than typical)
                  </span>
                </div>

                <div className="anomaly-item-end">
                  <strong className="anomaly-amount">{money(a.cents)}</strong>
                  {onFilterAnomaly && (
                    <button
                      type="button"
                      className="text-button anomaly-jump-btn"
                      onClick={() => onFilterAnomaly(a.id, a.category)}
                      title="Filter in Transactions"
                    >
                      Filter <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
