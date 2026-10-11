"use client";
import React, {useState} from 'react';
import {
  CalendarDays,
  CalendarCheck,
  TrendingDown,
  TrendingUp,
  Flame,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Clock,
  ArrowRight,
  Repeat
} from 'lucide-react';
import {money, shortDate} from '@/lib/format';
import type {Expense} from '@/lib/expenses';
import type {Income} from '@/lib/income';
import type {Bill} from '@/lib/bills';
import type {Rule} from '@/lib/rules';
import {buildMonthCalendar, WEEKDAYS, type CalendarDay} from '@/lib/calendar-schedule';

interface CalendarScheduleProps {
  items: Expense[];
  income: Income[];
  bills: Bill[];
  rules: Rule[];
  month: string;
  today: string;
  onSelectDate?: (dateStr: string) => void;
  onMoveMonth?: (delta: number) => void;
}

export default function CalendarSchedule({
  items,
  income,
  bills,
  rules,
  month,
  today,
  onSelectDate,
  onMoveMonth
}: CalendarScheduleProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    if (today.startsWith(month)) {
      return parseInt(today.slice(8, 10), 10);
    }
    return 1;
  });

  const data = buildMonthCalendar(month, items, income, bills, rules, today);
  const activeDay = selectedDay !== null ? data.days.find(d => d.day === selectedDay) : null;

  return (
    <div className="calendar-schedule-container">
      {/* Month Stats Bar */}
      <div className="cal-stats-bar">
        <div className="cal-stat-card">
          <small><TrendingDown size={12} /> Total spent</small>
          <strong>{money(data.totalSpentCents)}</strong>
          <span>{data.spendingDaysCount} active spending {data.spendingDaysCount === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="cal-stat-card">
          <small><TrendingUp size={12} /> Total income</small>
          <strong className="income-amount">{money(data.totalIncomeCents)}</strong>
          <span>Net {data.netMonthCents >= 0 ? '+' : '−'}{money(Math.abs(data.netMonthCents))}</span>
        </div>
        <div className="cal-stat-card">
          <small><Clock size={12} /> Daily spend pace</small>
          <strong>{money(data.avgDailySpentCents)}</strong>
          <span>Average per elapsed day</span>
        </div>
        <div className="cal-stat-card">
          <small><Flame size={12} /> Highest spend day</small>
          <strong>{data.highestSpendDay ? money(data.highestSpendDay.spentCents) : '—'}</strong>
          <span>{data.highestSpendDay ? `Day ${data.highestSpendDay.day} (${shortDate(data.highestSpendDay.date)})` : 'No spend'}</span>
        </div>
      </div>

      <div className="cal-main-layout">
        {/* Calendar Grid View */}
        <div className="cal-grid-panel">
          <div className="cal-grid-header">
            <div className="cal-title-row">
              <h3>{data.monthName} {data.year}</h3>
              {onMoveMonth && (
                <div className="cal-nav-buttons">
                  <button type="button" onClick={() => onMoveMonth(-1)} aria-label="Previous month" title="Previous month">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" onClick={() => onMoveMonth(1)} aria-label="Next month" title="Next month">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="cal-legend-row">
              <span className="cal-legend-item"><span className="legend-dot spend-low" /> Light</span>
              <span className="cal-legend-item"><span className="legend-dot spend-med" /> Moderate</span>
              <span className="cal-legend-item"><span className="legend-dot spend-high" /> High</span>
              <span className="cal-legend-item"><span className="legend-dot inc-dot" /> Income</span>
              <span className="cal-legend-item"><span className="legend-dot bill-dot" /> Due Bill</span>
            </div>
          </div>

          <div className="cal-weekdays-row">
            {WEEKDAYS.map(w => (
              <div key={w} className="cal-weekday-label">{w}</div>
            ))}
          </div>

          <div className="cal-days-grid">
            {/* Blank leading cells */}
            {Array.from({length: data.startWeekday}).map((_, i) => (
              <div key={`blank-${i}`} className="cal-cell blank" />
            ))}

            {/* Days in Month */}
            {data.days.map(d => {
              const isSelected = selectedDay === d.day;
              const hasBills = d.bills.length > 0;
              const hasRules = d.recurring.length > 0;
              const hasIncome = d.incomeCents > 0;

              return (
                <button
                  type="button"
                  key={d.date}
                  className={`cal-cell day ${d.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${d.isFuture ? 'future' : ''} intensity-${d.intensity}`}
                  onClick={() => setSelectedDay(d.day)}
                  aria-label={`${d.date}: spent ${money(d.spentCents)}, income ${money(d.incomeCents)}`}
                >
                  <div className="cal-cell-top">
                    <span className="cal-day-number">{d.day}</span>
                    {d.isToday && <span className="today-badge">Today</span>}
                  </div>

                  <div className="cal-cell-body">
                    {d.spentCents > 0 && (
                      <span className="cell-spend-val">৳{Math.round(d.spentCents / 100).toLocaleString('en')}</span>
                    )}
                  </div>

                  <div className="cal-cell-indicators">
                    {hasIncome && <span className="cell-dot income" title={`Income: ${money(d.incomeCents)}`} />}
                    {hasBills && <span className="cell-dot bill" title={`${d.bills.length} bill(s) due`} />}
                    {hasRules && <span className="cell-dot recurring" title={`${d.recurring.length} recurring item(s)`} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Inspector */}
        <div className="cal-inspector-panel">
          {activeDay ? (
            <div className="cal-inspector-content">
              <div className="inspector-header">
                <div>
                  <h4>{new Date(activeDay.date + 'T12:00:00').toLocaleDateString('en', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</h4>
                  <p>{activeDay.isToday ? 'Today’s activity' : activeDay.isFuture ? 'Future scheduled date' : 'Day summary'}</p>
                </div>
                {onSelectDate && (activeDay.expenses.length > 0 || activeDay.income.length > 0) && (
                  <button
                    type="button"
                    className="text-button filter-date-btn"
                    onClick={() => onSelectDate(activeDay.date)}
                    title="Filter this day in Transactions list"
                  >
                    View in Transactions <ArrowRight size={13} />
                  </button>
                )}
              </div>

              <div className="inspector-totals">
                <div className="inspector-total-box">
                  <small>Money out</small>
                  <strong className={activeDay.spentCents > 0 ? 'text-spent' : ''}>{money(activeDay.spentCents)}</strong>
                </div>
                <div className="inspector-total-box">
                  <small>Money in</small>
                  <strong className={activeDay.incomeCents > 0 ? 'text-income' : ''}>{money(activeDay.incomeCents)}</strong>
                </div>
              </div>

              {/* Day Bills & Due Schedule */}
              {activeDay.bills.length > 0 && (
                <div className="inspector-section">
                  <h5><CalendarCheck size={13} /> Bills Due Today ({activeDay.bills.length})</h5>
                  <div className="inspector-list">
                    {activeDay.bills.map(b => (
                      <div className="inspector-row bill" key={b.id}>
                        <div>
                          <b>{b.name}</b>
                          <small>{b.category}{b.paidMonth >= month ? ' · Paid' : ' · Due'}</small>
                        </div>
                        <strong>{b.cents ? money(b.cents) : 'Varies'}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recurring Rules */}
              {activeDay.recurring.length > 0 && (
                <div className="inspector-section">
                  <h5><Repeat size={13} /> Recurring Schedule ({activeDay.recurring.length})</h5>
                  <div className="inspector-list">
                    {activeDay.recurring.map(r => (
                      <div className="inspector-row recurring" key={r.id}>
                        <div>
                          <b>{r.kind === 'income' ? r.source : r.category}</b>
                          <small>{r.kind} rule · {r.note || 'Monthly occurrence'}</small>
                        </div>
                        <strong>{money(r.cents)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses List */}
              <div className="inspector-section">
                <h5><ReceiptText size={13} /> Expenses ({activeDay.expenses.length})</h5>
                {activeDay.expenses.length === 0 ? (
                  <p className="inspector-empty">No expenses recorded on this day.</p>
                ) : (
                  <div className="inspector-list">
                    {activeDay.expenses.map(e => (
                      <div className="inspector-row" key={e.id}>
                        <div>
                          <b>{e.category}</b>
                          <small>{e.method ? `${e.method} · ` : ''}{e.note || 'No note'}</small>
                        </div>
                        <strong>{money(e.cents)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Income List */}
              {activeDay.income.length > 0 && (
                <div className="inspector-section">
                  <h5><TrendingUp size={13} /> Income Received ({activeDay.income.length})</h5>
                  <div className="inspector-list">
                    {activeDay.income.map(i => (
                      <div className="inspector-row income" key={i.id}>
                        <div>
                          <b>{i.source}</b>
                          <small>{i.note || 'Income deposit'}</small>
                        </div>
                        <strong className="text-income">{money(i.cents)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="inspector-empty-placeholder">
              <CalendarDays size={32} />
              <p>Select any day on the calendar to view transactions, due bills and cash flow.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
