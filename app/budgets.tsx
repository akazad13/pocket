"use client";
import { useEffect, useMemo, useState } from 'react';
import { Target, History, Flame } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { money } from '@/lib/format';
import { buildBudgetHistory } from '@/lib/budget-history';
import type { Expense } from '@/lib/expenses';

type Props = {
  version: number;
  categories: string[];
  spent: Record<string, number>;
  monthLabel: string;
  onNotice: (text: string) => void;
  items?: Expense[];
  month?: string;
  onBudgetsChange?: (budgets: Record<string, number>) => void;
};

export default function Budgets({
  version,
  categories,
  spent,
  monthLabel,
  onNotice,
  items = [],
  month = '',
  onBudgetsChange,
}: Props) {
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const categoriesKey = categories.join('\n');
  useEffect(() => {
    let live = true;
    fetch('/api/budgets')
      .then(async r => {
        const j = (await r.json()) as { budgets: Record<string, number> };
        if (!r.ok) throw Error();
        if (live) {
          setBudgets(j.budgets);
          setFailed(false);
          onBudgetsChange?.(j.budgets);
        }
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [categoriesKey, version, onBudgetsChange]);

  const history = useMemo(() => {
    if (!month || Object.keys(budgets).length === 0) return null;
    return buildBudgetHistory(items, budgets, month, 6);
  }, [items, budgets, month]);

  const rows = categories
    .filter(c => budgets[c])
    .map(c => ({
      name: c,
      budget: budgets[c],
      spent: spent[c] || 0,
      hist: history?.categories.find(h => h.category === c),
    }))
    .map(r => ({ ...r, pct: (r.spent / r.budget) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const over = rows.filter(r => r.spent > r.budget).length;

  function edit() {
    setDraft(Object.fromEntries(categories.map(c => [c, budgets[c] ? String(budgets[c] / 100) : ''])));
    setFormError('');
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const changed = Object.fromEntries(
        Object.entries(draft)
          .map(([c, v]) => [c, v.trim()])
          .filter(([c, v]) => v !== (budgets[c] ? String(budgets[c] / 100) : ''))
      );
      const r = await fetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgets: changed }),
      });
      const result = (await r.json()) as { budgets: Record<string, number>; error: string };
      if (!r.ok) throw Error(result.error);
      setBudgets(result.budgets);
      onBudgetsChange?.(result.budgets);
      setOpen(false);
      onNotice('Budgets saved');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Couldn’t save budgets. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel budgets">
      <div className="section-heading">
        <div>
          <h2>Monthly budgets</h2>
          <p>
            {monthLabel}
            {over ? ` · ${over} over budget` : ''}
            {history && rows.length > 0 ? ` · ${history.overallAdherenceRate}% 6-mo adherence` : ''}
          </p>
        </div>
        <div className="budget-heading-actions">
          {rows.length > 0 && <span className="subtle">{money(totalSpent)} of {money(totalBudget)}</span>}
          {rows.length > 0 && (
            <button
              type="button"
              className="text-button"
              onClick={() => setShowHistory(v => !v)}
              title="Toggle multi-month consistency history"
            >
              <History size={14} /> {showHistory ? 'Current view' : '6-mo trend'}
            </button>
          )}
          <button type="button" className="text-button" disabled={failed} onClick={edit}>
            {rows.length ? 'Edit budgets' : 'Set budgets'}
          </button>
        </div>
      </div>

      {failed ? (
        <p className="quiet-empty">Budgets are temporarily unavailable.</p>
      ) : !rows.length ? (
        <p className="quiet-empty">
          <Target size={14} /> Set a monthly limit for any category to track it here.
        </p>
      ) : showHistory && history ? (
        <div className="budget-history-view">
          <div className="budget-history-summary-bar">
            <span>Overall consistency: <b>{history.overallAdherenceRate}%</b> of budget-months stayed under limit</span>
            <small>{history.windowMonths[0]} to {history.windowMonths[history.windowMonths.length - 1]}</small>
          </div>
          <div className="budget-list">
            {history.categories.map(cat => (
              <div className="budget-history-row" key={cat.category}>
                <div className="budget-history-header">
                  <div>
                    <b>{cat.category}</b>
                    <span className="budget-history-limit">Limit: {money(cat.budgetCents)}/mo</span>
                  </div>
                  <div className="budget-history-badges">
                    {cat.currentStreak > 1 && (
                      <span className="budget-streak-badge">
                        <Flame size={12} /> {cat.currentStreak} mo streak
                      </span>
                    )}
                    <span className={`budget-adherence-badge ${cat.adherenceRate >= 80 ? 'good' : cat.adherenceRate >= 50 ? 'warn' : 'bad'}`}>
                      {cat.adherenceRate}% on track
                    </span>
                  </div>
                </div>

                <div className="budget-history-months">
                  {cat.months.map(m => (
                    <div
                      key={m.month}
                      className={`budget-history-month-cell ${m.status}`}
                      title={`${m.monthShort}: ${money(m.spentCents)} of ${money(m.budgetCents)} (${m.percentUsed}%)`}
                    >
                      <small>{m.monthShort}</small>
                      <b>{m.spentCents > 0 ? money(m.spentCents) : '৳0'}</b>
                      <div className="budget-month-bar">
                        <div
                          className={`budget-month-fill ${m.status}`}
                          style={{ width: `${Math.min(100, m.percentUsed)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="budget-history-footer">
                  <small>6-month average: <b>{money(cat.averageSpentCents)}/mo</b></small>
                  <small>{cat.monthsUnder} of {cat.months.length} months under budget</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="budget-list">
          {rows.map(r => {
            const isOver = r.spent > r.budget;
            return (
              <div className="budget-row" key={r.name}>
                <div className="budget-label">
                  <div className="flex items-center gap-2">
                    <b>{r.name}</b>
                    {r.hist && (
                      <div className="budget-pips" title={`6-month trend: ${r.hist.monthsUnder}/${r.hist.months.length} under budget`}>
                        {r.hist.months.map(m => (
                          <span
                            key={m.month}
                            className={`budget-pip ${m.status}`}
                            title={`${m.monthShort}: ${money(m.spentCents)} of ${money(m.budgetCents)}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <span>
                    {money(r.spent)} of {money(r.budget)}
                  </span>
                </div>
                <div
                  className="budget-bar"
                  role="progressbar"
                  aria-label={`${r.name} budget used`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(r.pct))}
                >
                  <div
                    className={isOver ? 'budget-fill over' : 'budget-fill'}
                    style={{ width: `${Math.min(100, r.pct)}%` }}
                  />
                </div>
                <small className={isOver ? 'budget-status over' : 'budget-status'}>
                  {isOver ? `${money(r.spent - r.budget)} over` : `${money(r.budget - r.spent)} left`}
                </small>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={v => {
          if (!saving) setOpen(v);
        }}
      >
        <DialogContent className="expense-dialog">
          <DialogTitle>Monthly budgets</DialogTitle>
          <DialogDescription>
            Set a monthly limit per category in BDT. Leave blank for no budget.
          </DialogDescription>
          <form onSubmit={save}>
            <div className="category-list">
              {categories.map(c => (
                <label className="budget-input" key={c}>
                  <span>{c}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="999999999"
                    step="0.01"
                    placeholder="No budget"
                    value={draft[c] ?? ''}
                    onChange={e => setDraft(d => ({ ...d, [c]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            {formError && (
              <p role="alert" className="error">
                {formError}
              </p>
            )}
            <button type="submit" className="primary save" disabled={saving}>
              {saving ? 'Saving…' : 'Save budgets'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
