"use client";
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  StockHolding,
  POPULAR_STOCKS,
  calculatePortfolio,
  validateHolding,
} from '@/lib/portfolio';
import { money } from '@/lib/format';
import type { Account } from '@/lib/accounts';
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Landmark,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'pocket_stock_portfolio';

const DEFAULT_HOLDINGS: StockHolding[] = [
  {
    id: 'h-1',
    symbol: 'GP',
    name: 'Grameenphone Ltd.',
    shares: 200,
    buyPrice: 280.0,
    currentPrice: 315.0,
    notes: 'DSE Bluechip',
  },
  {
    id: 'h-2',
    symbol: 'SQURPHARMA',
    name: 'Square Pharmaceuticals',
    shares: 150,
    buyPrice: 215.5,
    currentPrice: 228.0,
    notes: 'Pharma core',
  },
  {
    id: 'h-3',
    symbol: 'BATBC',
    name: 'British American Tobacco BD',
    shares: 100,
    buyPrice: 420.0,
    currentPrice: 395.0,
    notes: 'High dividend yield',
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  onSyncAccount?: (accountId: string, newTotalCents: number) => Promise<void>;
};

export function StockPortfolioDialog({
  open,
  onClose,
  accounts,
  onSyncAccount,
}: Props) {
  const [holdings, setHoldings] = useState<StockHolding[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_HOLDINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_HOLDINGS;
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    symbol: '',
    name: '',
    shares: '',
    buyPrice: '',
    currentPrice: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [syncAccount, setSyncAccount] = useState<string>(() => {
    const sharesAcc = accounts.find(a => a.type === 'shares' && !a.closed);
    return sharesAcc?.id || '';
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    } catch {}
  }, [holdings]);

  const summary = calculatePortfolio(holdings);
  const sharesAccounts = accounts.filter(a => a.type === 'shares' && !a.closed);

  const startAdd = () => {
    setEditingId(null);
    setForm({
      symbol: '',
      name: '',
      shares: '',
      buyPrice: '',
      currentPrice: '',
      notes: '',
    });
    setFormError('');
    setIsAdding(true);
  };

  const startEdit = (h: StockHolding) => {
    setEditingId(h.id);
    setForm({
      symbol: h.symbol,
      name: h.name,
      shares: String(h.shares),
      buyPrice: String(h.buyPrice),
      currentPrice: String(h.currentPrice),
      notes: h.notes,
    });
    setFormError('');
    setIsAdding(true);
  };

  const saveHolding = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const validated = validateHolding({
        id: editingId || undefined,
        ...form,
      });

      if (editingId) {
        setHoldings(old => old.map(h => (h.id === editingId ? validated : h)));
        toast.success(`Updated ${validated.symbol}`);
      } else {
        setHoldings(old => [...old, validated]);
        toast.success(`Added ${validated.symbol} to portfolio`);
      }
      setIsAdding(false);
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid holding details');
    }
  };

  const deleteHolding = (id: string, symbol: string) => {
    setHoldings(old => old.filter(h => h.id !== id));
    toast.info(`Removed ${symbol} from portfolio`);
  };

  const handleSync = async () => {
    if (!syncAccount || !onSyncAccount || summary.totalValueCents <= 0) return;
    setSyncing(true);
    try {
      await onSyncAccount(syncAccount, summary.totalValueCents);
      toast.success('Synced portfolio market value to account balance');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sync account');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="expense-dialog portfolio-dialog">
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Stock Portfolio</span>
            <span className="portfolio-badge">{holdings.length} holdings</span>
          </div>
          {!isAdding && (
            <button type="button" className="text-button" onClick={startAdd}>
              <Plus size={14} /> Add stock
            </button>
          )}
        </DialogTitle>
        <DialogDescription>
          Track Dhaka Stock Exchange / BO account equity holdings, purchase costs, and market gains.
        </DialogDescription>

        <div className="portfolio-content">
          {/* Portfolio Metric Overview */}
          <div className="portfolio-stats-grid">
            <div className="portfolio-stat-box primary">
              <small>Total Market Value</small>
              <strong>{money(summary.totalValueCents)}</strong>
              <span>{summary.totalSharesCount.toLocaleString('en')} shares total</span>
            </div>
            <div className="portfolio-stat-box">
              <small>Total Invested Cost</small>
              <strong>{money(summary.totalInvestedCents)}</strong>
              <span>Avg cost basis</span>
            </div>
            <div className={`portfolio-stat-box ${summary.totalGainLossCents >= 0 ? 'gain' : 'loss'}`}>
              <small>Unrealized Profit / Loss</small>
              <strong>
                {summary.totalGainLossCents >= 0 ? '+' : '−'}
                {money(Math.abs(summary.totalGainLossCents))}
              </strong>
              <span className="flex items-center gap-1 font-semibold">
                {summary.totalGainLossCents >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {summary.totalGainLossPct >= 0 ? `+${summary.totalGainLossPct}%` : `${summary.totalGainLossPct}%`}
              </span>
            </div>
          </div>

          {/* Sync with Shares Account */}
          {sharesAccounts.length > 0 && summary.totalValueCents > 0 && onSyncAccount && (
            <div className="portfolio-sync-card">
              <div className="flex items-center gap-2 text-xs">
                <Landmark size={14} className="text-emerald-700" />
                <span>Sync with Shares Account:</span>
                <select
                  aria-label="Select Shares Account to sync"
                  value={syncAccount}
                  onChange={e => setSyncAccount(e.target.value)}
                  className="portfolio-account-select"
                >
                  {sharesAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="text-button flex items-center gap-1"
                disabled={syncing || !syncAccount}
                onClick={handleSync}
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync balance'}
              </button>
            </div>
          )}

          {/* Add / Edit Form */}
          {isAdding ? (
            <form onSubmit={saveHolding} className="portfolio-form">
              <h3>{editingId ? 'Edit holding' : 'Add stock holding'}</h3>
              <div className="portfolio-inputs-grid">
                <label>
                  Symbol (Ticker)
                  <input
                    required
                    maxLength={20}
                    placeholder="e.g. GP, SQURPHARMA"
                    list="stock-suggestions"
                    value={form.symbol}
                    onChange={e => {
                      const sym = e.target.value.toUpperCase();
                      const match = POPULAR_STOCKS.find(s => s.symbol === sym);
                      setForm(f => ({
                        ...f,
                        symbol: sym,
                        name: f.name || match?.name || '',
                      }));
                    }}
                  />
                  <datalist id="stock-suggestions">
                    {POPULAR_STOCKS.map(s => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.name}
                      </option>
                    ))}
                  </datalist>
                </label>
                <label>
                  Company Name <span className="subtle">(optional)</span>
                  <input
                    maxLength={80}
                    placeholder="e.g. Grameenphone Ltd."
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </label>
              </div>

              <div className="portfolio-inputs-grid three">
                <label>
                  Number of shares
                  <input
                    required
                    type="number"
                    min="0.001"
                    step="any"
                    placeholder="e.g. 500"
                    value={form.shares}
                    onChange={e => setForm({ ...form, shares: e.target.value })}
                  />
                </label>
                <label>
                  Avg buy price (৳)
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 280.00"
                    value={form.buyPrice}
                    onChange={e => setForm({ ...form, buyPrice: e.target.value })}
                  />
                </label>
                <label>
                  Current market price (৳)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 315.00"
                    value={form.currentPrice}
                    onChange={e => setForm({ ...form, currentPrice: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Notes <span className="subtle">(optional)</span>
                <input
                  maxLength={200}
                  placeholder="e.g. BO Account at EBL Securities"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </label>

              {formError && <p className="error" role="alert">{formError}</p>}

              <div className="portfolio-form-actions">
                <button type="submit" className="primary save">
                  {editingId ? 'Save holding' : 'Add to portfolio'}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Holdings List */
            <div className="portfolio-holdings-list">
              {!summary.holdings.length ? (
                <div className="empty">
                  <h3>No stocks in portfolio yet</h3>
                  <p>Add your shares from Dhaka Stock Exchange or global markets to track market values and returns.</p>
                  <button type="button" className="primary" onClick={startAdd}>
                    <Plus size={16} /> Add your first stock
                  </button>
                </div>
              ) : (
                summary.holdings.map(({ holding: h, currentValueCents, investedCents, gainLossCents, gainLossPct, portfolioWeightPct }) => {
                  const isGain = gainLossCents >= 0;
                  return (
                    <div className="portfolio-holding-card" key={h.id}>
                      <div className="portfolio-card-header">
                        <div>
                          <div className="flex items-center gap-2">
                            <b>{h.symbol}</b>
                            <span className="portfolio-weight-badge">{portfolioWeightPct}% of portfolio</span>
                          </div>
                          <small>{h.name || h.symbol}{h.notes ? ` · ${h.notes}` : ''}</small>
                        </div>
                        <div className="text-right">
                          <strong className="portfolio-holding-value">{money(currentValueCents)}</strong>
                          <span className={`portfolio-gain-badge ${isGain ? 'gain' : 'loss'}`}>
                            {isGain ? '+' : '−'}{money(Math.abs(gainLossCents))} ({isGain ? `+${gainLossPct}%` : `${gainLossPct}%`})
                          </span>
                        </div>
                      </div>

                      <div className="portfolio-card-details">
                        <div>
                          <small>Shares</small>
                          <b>{h.shares.toLocaleString('en')}</b>
                        </div>
                        <div>
                          <small>Avg Cost</small>
                          <b>৳{h.buyPrice.toFixed(2)}</b>
                        </div>
                        <div>
                          <small>Market Price</small>
                          <b>৳{h.currentPrice.toFixed(2)}</b>
                        </div>
                        <div>
                          <small>Invested</small>
                          <b>{money(investedCents)}</b>
                        </div>
                        <div className="portfolio-card-actions">
                          <button
                            type="button"
                            className="icon-button"
                            title={`Edit ${h.symbol}`}
                            aria-label={`Edit ${h.symbol}`}
                            onClick={() => startEdit(h)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-button delete"
                            title={`Delete ${h.symbol}`}
                            aria-label={`Delete ${h.symbol}`}
                            onClick={() => deleteHolding(h.id, h.symbol)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
