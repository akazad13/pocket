'use client';
import { useMemo, useState } from 'react';
import { Tag, Search, ArrowUpRight } from 'lucide-react';
import type { Expense } from '@/lib/expenses';
import { calculateTagBreakdown } from '@/lib/tags';
import { money } from '@/lib/format';

type Props = {
  items: Expense[];
  onSelectTag: (tag: string) => void;
  currentYear: string;
};

export default function TagsReport({ items, onSelectTag, currentYear }: Props) {
  const [scope, setScope] = useState<'year' | 'all'>('year');
  const [filterQuery, setFilterQuery] = useState('');

  const filteredExpenses = useMemo(() => {
    if (scope === 'year') {
      return items.filter(e => e.date.startsWith(currentYear));
    }
    return items;
  }, [items, scope, currentYear]);

  const totalSpent = useMemo(
    () => filteredExpenses.reduce((s, e) => s + e.cents, 0),
    [filteredExpenses]
  );

  const breakdown = useMemo(
    () => calculateTagBreakdown(filteredExpenses),
    [filteredExpenses]
  );

  const visibleTags = useMemo(() => {
    if (!filterQuery.trim()) return breakdown.items;
    const q = filterQuery.toLowerCase().replace(/^#/, '');
    return breakdown.items.filter(item => item.tag.toLowerCase().includes(q));
  }, [breakdown.items, filterQuery]);

  return (
    <section className="panel tags-report">
      <div className="section-heading">
        <div>
          <h2>Spending by tag</h2>
          <p>
            {scope === 'year' ? `Year ${currentYear}` : 'All time'} ·{' '}
            {breakdown.uniqueTagsCount} {breakdown.uniqueTagsCount === 1 ? 'tag' : 'tags'} recorded
          </p>
        </div>
        <div className="scope-toggle" role="group" aria-label="Tag report scope">
          <button
            aria-pressed={scope === 'year'}
            onClick={() => setScope('year')}
          >
            {currentYear}
          </button>
          <button
            aria-pressed={scope === 'all'}
            onClick={() => setScope('all')}
          >
            All time
          </button>
        </div>
      </div>

      {breakdown.items.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">
            <Tag size={28} />
          </span>
          <h3>No tagged expenses yet</h3>
          <p>
            Add <b>#hashtags</b> into expense notes (e.g. <code>#eid</code>, <code>#trip</code>, <code>#medical</code>)
            to group spending across categories.
          </p>
        </div>
      ) : (
        <>
          <div className="tags-summary-bar">
            <div className="tags-stat">
              <small>Total tagged spend</small>
              <strong>{money(breakdown.totalTaggedCents)}</strong>
              <span>
                {totalSpent > 0
                  ? `${Math.round((breakdown.totalTaggedCents / totalSpent) * 100)}% of total spend`
                  : '—'}
              </span>
            </div>
            <div className="tags-stat">
              <small>Active tags</small>
              <strong>{breakdown.uniqueTagsCount}</strong>
              <span>Distinct projects & events</span>
            </div>
            {breakdown.items[0] && (
              <div className="tags-stat">
                <small>Top tag</small>
                <strong>#{breakdown.items[0].tag}</strong>
                <span>{money(breakdown.items[0].totalCents)} ({breakdown.items[0].count} entries)</span>
              </div>
            )}
          </div>

          <label className="search tags-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search tags…"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
            />
          </label>

          <div className="tags-grid">
            {visibleTags.map(item => {
              const pctOfTagged =
                breakdown.totalTaggedCents > 0
                  ? Math.round((item.totalCents / breakdown.totalTaggedCents) * 100)
                  : 0;

              return (
                <div key={item.tag} className="tag-card">
                  <div className="tag-card-top">
                    <button
                      type="button"
                      className="tag-pill-btn"
                      onClick={() => onSelectTag(item.tag)}
                      title={`Filter transactions by #${item.tag}`}
                    >
                      <Tag size={13} /> #{item.tag}
                    </button>
                    <span className="tag-card-amount">{money(item.totalCents)}</span>
                  </div>

                  <div className="tag-card-bar">
                    <div
                      className="tag-card-bar-fill"
                      style={{ width: `${Math.max(4, pctOfTagged)}%` }}
                    />
                  </div>

                  <div className="tag-card-meta">
                    <span>
                      {item.count} {item.count === 1 ? 'expense' : 'expenses'} ({pctOfTagged}% of tagged)
                    </span>
                    <button
                      type="button"
                      className="tag-view-link"
                      onClick={() => onSelectTag(item.tag)}
                    >
                      View <ArrowUpRight size={13} />
                    </button>
                  </div>

                  {item.categories.length > 0 && (
                    <div className="tag-categories-list">
                      {item.categories.map(cat => (
                        <span key={cat} className="tag-cat-chip">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
