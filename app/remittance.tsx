"use client";
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  POPULAR_CURRENCIES,
  calculateRemittance,
} from '@/lib/remittance';
import { money } from '@/lib/format';
import { Copy, Check, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
  onApply?: (result: { amount: string; note: string }) => void;
  initialAmount?: string;
};

export function RemittanceDialog({
  open,
  onClose,
  onApply,
  initialAmount = '',
}: Props) {
  const [currency, setCurrency] = useState('USD');
  const [foreignAmount, setForeignAmount] = useState(initialAmount || '');
  const [exchangeRate, setExchangeRate] = useState('122.50');
  const [hasIncentive, setHasIncentive] = useState(true);
  const [incentivePct, setIncentivePct] = useState('2.5');
  const [feeBdt, setFeeBdt] = useState('');
  const [copied, setCopied] = useState(false);

  const res = calculateRemittance({
    foreignAmount: Number(foreignAmount) || 0,
    exchangeRate: Number(exchangeRate) || 0,
    currency,
    incentivePercent: hasIncentive ? Number(incentivePct) || 0 : 0,
    feeBdt: Number(feeBdt) || 0,
  });

  const handleCopy = async () => {
    if (res.netBdtCents <= 0) return;
    try {
      await navigator.clipboard.writeText(res.netBdtFormatted);
      setCopied(true);
      toast.success(`Copied ৳${res.netBdtFormatted} to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleApply = () => {
    if (res.netBdtCents <= 0) return;
    onApply?.({
      amount: res.netBdtFormatted,
      note: res.summaryNote,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="expense-dialog remittance-dialog">
        <DialogTitle className="flex items-center gap-2">
          <span>Remittance &amp; FX Converter</span>
          <span className="remittance-badge">BDT helper</span>
        </DialogTitle>
        <DialogDescription>
          Convert freelance payouts or overseas remittances to BDT with official 2.5% cash incentive.
        </DialogDescription>

        <div className="remittance-content">
          <div className="remittance-currencies">
            {POPULAR_CURRENCIES.slice(0, 6).map(c => (
              <button
                key={c.code}
                type="button"
                className={`remittance-currency-btn ${currency === c.code ? 'active' : ''}`}
                onClick={() => setCurrency(c.code)}
              >
                <b>{c.code}</b>
                <small>{c.symbol}</small>
              </button>
            ))}
          </div>

          <div className="remittance-form-grid">
            <label>
              Amount in {currency}
              <div className="amount-input">
                <span>{POPULAR_CURRENCIES.find(c => c.code === currency)?.symbol || '$'}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={foreignAmount}
                  onChange={e => setForeignAmount(e.target.value)}
                />
              </div>
            </label>

            <label>
              Exchange rate (BDT per 1 {currency})
              <div className="amount-input">
                <span>৳</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="122.50"
                  value={exchangeRate}
                  onChange={e => setExchangeRate(e.target.value)}
                />
              </div>
            </label>
          </div>

          <div className="remittance-incentive-box">
            <label className="remittance-checkbox-label">
              <input
                type="checkbox"
                checked={hasIncentive}
                onChange={e => setHasIncentive(e.target.checked)}
              />
              <div>
                <strong>Include BD Government 2.5% Cash Incentive</strong>
                <small>Official incentive on legal wage earner remittances</small>
              </div>
            </label>
            {hasIncentive && (
              <div className="remittance-rate-input">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  value={incentivePct}
                  onChange={e => setIncentivePct(e.target.value)}
                />
                <span>%</span>
              </div>
            )}
          </div>

          <label>
            Bank or deduction fee in BDT <span className="subtle">(optional)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              placeholder="e.g. 150 for wire / handling fee"
              value={feeBdt}
              onChange={e => setFeeBdt(e.target.value)}
            />
          </label>

          {res.netBdtCents > 0 && (
            <div className="remittance-result-card">
              <div className="remittance-breakdown">
                <div className="remittance-row">
                  <span>Gross conversion</span>
                  <strong>{money(res.grossBdtCents)}</strong>
                </div>
                {res.incentiveBdtCents > 0 && (
                  <div className="remittance-row incentive">
                    <span>
                      <Sparkles size={12} className="inline mr-1" />
                      +{incentivePct}% Govt incentive
                    </span>
                    <strong>+{money(res.incentiveBdtCents)}</strong>
                  </div>
                )}
                {res.feeBdtCents > 0 && (
                  <div className="remittance-row fee">
                    <span>Deduction / fee</span>
                    <strong>-{money(res.feeBdtCents)}</strong>
                  </div>
                )}
              </div>

              <div className="remittance-total">
                <div>
                  <small>Total BDT received</small>
                  <strong>{money(res.netBdtCents)}</strong>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  title="Copy BDT"
                  aria-label="Copy BDT amount"
                  onClick={handleCopy}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              {res.summaryNote && (
                <div className="remittance-note-preview">
                  <small>Generated note:</small>
                  <code>{res.summaryNote}</code>
                </div>
              )}
            </div>
          )}

          <div className="remittance-actions">
            {onApply && (
              <button
                type="button"
                className="primary save"
                disabled={res.netBdtCents <= 0}
                onClick={handleApply}
              >
                <ArrowRight size={16} /> Use in Income entry
              </button>
            )}
            <button
              type="button"
              className="text-button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
