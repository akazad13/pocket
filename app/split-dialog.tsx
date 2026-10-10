'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Split, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { AccountPicker } from './accounts';
import CategoryIcon from './category-icon';
import type { Account } from '@/lib/accounts';
import type { Expense } from '@/lib/expenses';
import { calculateSplitProgress, type SplitItemInput } from '@/lib/splits';
import { money } from '@/lib/format';

export type SplitDialogProps = {
  open: boolean;
  onClose: () => void;
  categories: string[];
  accounts: Account[];
  methods: string[];
  styles?: Record<string, { color?: string; icon?: string }>;
  todayDate: string;
  originalExpense?: Expense | null;
  onSaved: (expenses: Expense[], originalId?: string) => void;
};

export function SplitExpenseDialog({
  open,
  onClose,
  categories,
  accounts,
  methods,
  styles = {},
  todayDate,
  originalExpense,
  onSaved,
}: SplitDialogProps) {
  const [date, setDate] = useState(() => originalExpense?.date || todayDate);
  const [method, setMethod] = useState(() => originalExpense?.method || '');
  const [account, setAccount] = useState(() => originalExpense?.account || '');
  const [memo, setMemo] = useState(() => originalExpense?.note || '');
  const [targetTotal, setTargetTotal] = useState(() =>
    originalExpense ? (originalExpense.cents / 100).toFixed(2) : ''
  );

  const defaultCat1 = originalExpense?.category || (categories.includes('Groceries') ? 'Groceries' : categories[0] || '');
  const defaultCat2 = categories.find((c) => c !== defaultCat1) || categories[0] || '';

  const [splits, setSplits] = useState<SplitItemInput[]>(() => {
    if (originalExpense) {
      const half1 = Math.floor(originalExpense.cents / 2);
      const half2 = originalExpense.cents - half1;
      return [
        { category: defaultCat1, amount: (half1 / 100).toFixed(2), note: '' },
        { category: defaultCat2, amount: (half2 / 100).toFixed(2), note: '' },
      ];
    }
    return [
      { category: defaultCat1, amount: '', note: '' },
      { category: defaultCat2, amount: '', note: '' },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const progress = calculateSplitProgress(targetTotal, splits);

  function updateSplit(index: number, patch: Partial<SplitItemInput>) {
    setSplits((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSplit() {
    const nextCat = categories.find((c) => !splits.some((s) => s.category === c)) || categories[0] || '';
    setSplits((prev) => [...prev, { category: nextCat, amount: '', note: '' }]);
  }

  function removeSplit(index: number) {
    if (splits.length <= 2) return;
    setSplits((prev) => prev.filter((_, i) => i !== index));
  }

  function fillRemaining() {
    if (progress.remainingCents <= 0) return;
    const remainingAmt = (progress.remainingCents / 100).toFixed(2);
    // If the last split has empty amount, fill it
    const lastIdx = splits.length - 1;
    if (splits[lastIdx] && (!splits[lastIdx].amount || Number(splits[lastIdx].amount) === 0)) {
      updateSplit(lastIdx, { amount: remainingAmt });
    } else {
      const nextCat = categories.find((c) => !splits.some((s) => s.category === c)) || categories[0] || '';
      setSplits((prev) => [...prev, { category: nextCat, amount: remainingAmt, note: '' }]);
    }
  }

  function splitEvenly() {
    if (progress.targetCents === null || progress.targetCents <= 0 || splits.length < 2) return;
    const count = splits.length;
    const baseCents = Math.floor(progress.targetCents / count);
    let remainder = progress.targetCents - baseCents * count;

    setSplits((prev) =>
      prev.map((s) => {
        const itemCents = baseCents + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        return {
          ...s,
          amount: (itemCents / 100).toFixed(2),
        };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (splits.length < 2) {
      setError('Add at least two split categories.');
      return;
    }

    if (progress.targetCents !== null && !progress.isMatch) {
      setError(
        `Split sum (${money(progress.allocatedCents)}) must equal receipt total (${money(progress.targetCents)}).`
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/expenses/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalId: originalExpense?.id,
          date,
          method,
          account,
          memo,
          targetTotal: targetTotal.trim() ? targetTotal.trim() : undefined,
          splits: splits.map((s) => ({
            category: s.category,
            amount: s.amount.trim(),
            note: s.note?.trim() || '',
          })),
        }),
      });

      const data = (await res.json()) as { ok: boolean; expenses: Expense[]; originalId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to save split expenses.');

      onSaved(data.expenses, data.originalId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save split expenses. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && !v && onClose()}>
      <DialogContent className="expense-dialog split-dialog">
        <DialogTitle className="split-dialog-title">
          <Split size={20} className="split-title-icon" />
          {originalExpense ? 'Split existing expense' : 'Split expense into categories'}
        </DialogTitle>
        <DialogDescription>
          Record a receipt or bill across multiple categories while sharing date, payment method, and account.
        </DialogDescription>

        {originalExpense && (
          <div className="split-banner">
            <span>
              Splitting original expense: <b>{money(originalExpense.cents)}</b> on <i>{originalExpense.date}</i> (
              {originalExpense.category})
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="split-form">
          {/* Receipt header metadata */}
          <div className="split-receipt-grid">
            <label>
              Receipt total <span className="subtle">(optional target)</span>
              <div className="amount-input">
                <span>৳</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 3500.00"
                  value={targetTotal}
                  onChange={(e) => setTargetTotal(e.target.value)}
                />
              </div>
            </label>

            <label>
              Date
              <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>

            <label>
              Store / Receipt memo <span className="subtle">(optional prefix)</span>
              <input
                maxLength={100}
                placeholder="e.g. Shwapno, Agora, Dinner"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </label>

            <label>
              Paid with <span className="subtle">(optional)</span>
              <input
                maxLength={30}
                list="split-payment-methods"
                placeholder="e.g. Cash, Card, bKash"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              />
              <datalist id="split-payment-methods">
                {methods.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
          </div>

          {accounts.length > 0 && (
            <label className="split-account-label">
              Paid from <span className="subtle">(optional)</span>
              <AccountPicker accounts={accounts} value={account} onChange={setAccount} label="Paid from account" />
            </label>
          )}

          {/* Allocation & Progress Indicator */}
          <div className="split-progress-box">
            <div className="split-progress-info">
              <div>
                <span className="split-meta-label">Total Allocated:</span>
                <b className="split-allocated-amt">{money(progress.allocatedCents)}</b>
                {progress.targetCents !== null && (
                  <span className="split-target-ref"> of {money(progress.targetCents)}</span>
                )}
              </div>

              {progress.targetCents !== null && (
                <div className="split-progress-helpers">
                  {progress.isMatch ? (
                    <span className="split-badge match">
                      <CheckCircle2 size={13} /> Exact match
                    </span>
                  ) : progress.remainingCents > 0 ? (
                    <div className="split-unallocated">
                      <span className="split-badge remaining">
                        Remaining: {money(progress.remainingCents)}
                      </span>
                      <button type="button" className="text-button fill-btn" onClick={fillRemaining}>
                        Fill remaining
                      </button>
                    </div>
                  ) : (
                    <span className="split-badge over">
                      <AlertCircle size={13} /> Over by {money(-progress.remainingCents)}
                    </span>
                  )}

                  {splits.length >= 2 && progress.targetCents > 0 && (
                    <button type="button" className="text-button split-even-btn" onClick={splitEvenly}>
                      <Sparkles size={13} /> Split evenly
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Split Items */}
          <div className="split-items-container">
            <div className="split-items-header">
              <h3>Split breakdown ({splits.length} parts)</h3>
              <button type="button" className="text-button add-split-btn" onClick={addSplit}>
                <Plus size={14} /> Add category
              </button>
            </div>

            <div className="split-items-list">
              {splits.map((s, index) => {
                const style = styles[s.category];
                return (
                  <div key={index} className="split-card">
                    <div className="split-card-header">
                      <span className="split-num-badge">#{index + 1}</span>
                      <div className="split-category-select">
                        <Select
                          value={s.category}
                          onValueChange={(val) => updateSplit(index, { category: val })}
                        >
                          <SelectTrigger className="form-select split-select">
                            <SelectValue>
                              <div className="split-select-val">
                                {style?.icon && <CategoryIcon icon={style.icon} size={14} />}
                                <span>{s.category}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c} value={c}>
                                <div className="split-select-item">
                                  {styles[c]?.icon && <CategoryIcon icon={styles[c].icon} size={14} />}
                                  <span>{c}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {splits.length > 2 && (
                        <button
                          type="button"
                          className="icon-button delete split-remove"
                          aria-label={`Remove split #${index + 1}`}
                          onClick={() => removeSplit(index)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="split-card-inputs">
                      <label className="split-input-amt">
                        <span className="sr-only">Amount</span>
                        <div className="amount-input">
                          <span>৳</span>
                          <input
                            required
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={s.amount}
                            onChange={(e) => updateSplit(index, { amount: e.target.value })}
                          />
                        </div>
                      </label>

                      <label className="split-input-note">
                        <span className="sr-only">Note</span>
                        <input
                          maxLength={150}
                          placeholder="Item note e.g. Vegetables, Snacks"
                          value={s.note || ''}
                          onChange={(e) => updateSplit(index, { note: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}

          <div className="split-footer-actions">
            <button type="button" className="text-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary save"
              disabled={saving || !progress.canSave}
            >
              {saving ? 'Saving splits…' : `Save ${splits.length} split expenses (${money(progress.allocatedCents)})`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
