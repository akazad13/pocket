"use client";
import {money} from '@/lib/format';
import type {MethodSpend} from '@/lib/method-breakdown';

type Props = {
  data: MethodSpend[];
  monthLabel: string;
};

export default function MethodBreakdownPanel({data, monthLabel}: Props) {
  if (!data.length) return null;
  return (
    <section className="panel method-panel">
      <div className="section-heading">
        <div>
          <h2>Payment channels</h2>
          <p>Spending by payment method · {monthLabel}</p>
        </div>
        <span className="subtle">{data.length} {data.length === 1 ? 'method' : 'methods'}</span>
      </div>
      <div className="method-bar-container">
        <div className="method-bar-track">
          {data.map((m, i) => (
            <div
              key={m.method}
              className={`method-bar-seg seg-${i % 6}`}
              style={{width: `${Math.max(m.pct, 2)}%`}}
              title={`${m.method}: ${money(m.cents)} (${m.pct}%)`}
            />
          ))}
        </div>
      </div>
      <div className="method-list">
        {data.map((m, i) => (
          <div className="method-row" key={m.method}>
            <span className={`method-dot dot-${i % 6}`} />
            <b className="method-name">{m.method}</b>
            <span className="method-count subtle">{m.count} {m.count === 1 ? 'expense' : 'expenses'}</span>
            <strong className="method-cents">{money(m.cents)}</strong>
            <small className="method-pct">{m.pct}%</small>
          </div>
        ))}
      </div>
    </section>
  );
}
