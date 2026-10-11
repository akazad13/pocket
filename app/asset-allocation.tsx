"use client";
import React from 'react';
import {ShieldCheck,PieChart,Banknote,Flame,Clock,AlertTriangle,CheckCircle2} from 'lucide-react';
import {money} from '@/lib/format';
import type {Account} from '@/lib/accounts';
import type {Expense} from '@/lib/expenses';
import {calculateAssetAllocation} from '@/lib/asset-allocation';

interface AssetAllocationPanelProps {
  accounts: Account[];
  values: Record<string, number>;
  items: Pick<Expense, 'cents' | 'date'>[];
  currentMonth: string;
}

export default function AssetAllocationPanel({accounts, values, items, currentMonth}: AssetAllocationPanelProps) {
  const report = calculateAssetAllocation(accounts, values, items, currentMonth);

  if (report.totalAssetsCents === 0 && report.totalDebtsCents === 0) {
    return null;
  }

  const {
    totalAssetsCents,
    totalDebtsCents,
    netWorthCents,
    categories,
    debtToAssetRatio,
    liquidCents,
    monthlyBurnCents,
    emergencyRunwayMonths,
    runwayRating
  } = report;

  const runwayBadge = {
    critical: {label: 'Critical (< 1 mo)', colorClass: 'badge-danger', icon: AlertTriangle},
    vulnerable: {label: 'Vulnerable (1–3 mos)', colorClass: 'badge-warning', icon: AlertTriangle},
    healthy: {label: 'Healthy (3–6 mos)', colorClass: 'badge-success', icon: CheckCircle2},
    strong: {label: 'Strong (> 6 mos)', colorClass: 'badge-strong', icon: ShieldCheck}
  }[runwayRating];

  const RunwayIcon = runwayBadge.icon;

  return (
    <section className="panel asset-allocation-panel" aria-label="Asset Allocation & Liquidity">
      <div className="section-heading">
        <div>
          <h2>Asset allocation &amp; financial safety</h2>
          <p>Portfolio diversification across asset classes and emergency liquidity</p>
        </div>
        <span className="allocation-runway-badge">
          <span className={`runway-pill ${runwayBadge.colorClass}`}>
            <RunwayIcon size={12} />
            {emergencyRunwayMonths >= 99 ? '99+ mos' : `${emergencyRunwayMonths} mos`} runway
          </span>
        </span>
      </div>

      <div className="allocation-metrics-grid">
        <div className="allocation-metric-card">
          <span className="metric-label"><Banknote size={13} /> Liquid cash</span>
          <strong className="metric-value">{money(liquidCents)}</strong>
          <small className="metric-hint">Immediate access funds</small>
        </div>
        <div className="allocation-metric-card">
          <span className="metric-label"><Flame size={13} /> Monthly living burn</span>
          <strong className="metric-value">{monthlyBurnCents ? money(monthlyBurnCents) : '—'}</strong>
          <small className="metric-hint">Recent monthly spending avg</small>
        </div>
        <div className="allocation-metric-card">
          <span className="metric-label"><Clock size={13} /> Emergency runway</span>
          <strong className="metric-value">
            {monthlyBurnCents ? (emergencyRunwayMonths >= 99 ? '99+ mos' : `${emergencyRunwayMonths} months`) : 'N/A'}
          </strong>
          <small className="metric-hint">{runwayBadge.label}</small>
        </div>
        <div className="allocation-metric-card">
          <span className="metric-label"><PieChart size={13} /> Debt-to-asset ratio</span>
          <strong className={`metric-value ${debtToAssetRatio > 40 ? 'debt-warn' : ''}`}>
            {debtToAssetRatio}%
          </strong>
          <small className="metric-hint">
            {debtToAssetRatio === 0 ? 'No debts active' : debtToAssetRatio < 25 ? 'Conservative leverage' : debtToAssetRatio < 50 ? 'Moderate leverage' : 'High debt leverage'}
          </small>
        </div>
      </div>

      {totalAssetsCents > 0 && (
        <div className="allocation-bar-wrapper">
          <div className="allocation-segmented-bar" aria-label="Portfolio asset distribution">
            {categories.map(cat => {
              if (cat.percentage <= 0) return null;
              return (
                <div
                  key={cat.category}
                  className="allocation-segment"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color
                  }}
                  title={`${cat.label}: ${money(cat.cents)} (${cat.percentage}%)`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="allocation-categories-grid">
        {categories.map(cat => {
          return (
            <div className={`allocation-card ${cat.cents > 0 ? 'active' : 'empty-class'}`} key={cat.category}>
              <div className="allocation-card-header">
                <span className="cat-dot" style={{backgroundColor: cat.color}} />
                <span className="cat-name">{cat.label}</span>
                <span className="cat-pct">{cat.percentage}%</span>
              </div>
              <div className="allocation-card-amount">{money(cat.cents)}</div>
              <div className="allocation-mini-bar">
                <div
                  className="allocation-mini-fill"
                  style={{width: `${Math.min(100, cat.percentage)}%`, backgroundColor: cat.color}}
                />
              </div>
              <div className="allocation-card-meta">
                <span>{cat.accountCount} {cat.accountCount === 1 ? 'account' : 'accounts'}</span>
                <small>{cat.description}</small>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
