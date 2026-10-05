# Pocket features

Status of what Pocket does today and what could come next.
Keep this file current: move an idea to "Implemented" when it ships.

## Implemented

### Expenses
| Feature | Details | Code |
|---|---|---|
| Add expense | Dialog with amount (BDT, up to 2 decimals), category, date, optional note (max 200 chars). Desktop button in header, floating button on mobile. | `tracker.tsx` `start()`, `save()`; `POST /api/expenses` |
| Edit expense | Pencil button on any expense row reopens the dialog pre-filled. | `PUT /api/expenses` |
| Delete expense | Trash button (Expenses tab only) with a confirmation dialog showing category, amount and date. | `remove()`; `DELETE /api/expenses` |
| Smart defaults | New entries default to the Groceries category and to today (Asia/Dhaka) when viewing the current month, otherwise the 1st of the viewed month. After saving, the view jumps to the expense's month. | `start()`, `today()` |
| Server validation | Positive amount, at most 2 decimals and 9 digits; real calendar date from 1900 onward; category must exist; note trimmed. Friendly error messages shown in the form. | `lib/expenses.ts` `validateExpense()` |

### Categories
| Feature | Details | Code |
|---|---|---|
| Default categories | 26 categories seeded on first use (Utilities, Food, Rent, Groceries, etc.). | `lib/expenses.ts`, `lib/categories.ts` |
| Add category | Inline "Add category" inside the expense dialog; new category is selected immediately. Case-insensitive duplicates rejected; 1 to 50 chars. | `addCategory()`; `POST /api/categories` |
| Rename category | "Manage categories" dialog; renaming updates every existing expense in that category. | `PUT /api/categories` |
| Delete category | Only allowed when the category has no expenses; confirmation dialog. Shows the expense count per category. | `DELETE /api/categories` |

### Views and insights
| Feature | Details |
|---|---|
| Month navigation | Previous/next buttons and a native month picker. |
| Summary cards | Total spent this month with entry count, active categories (used / total), largest category with its amount. |
| Overview tab | Donut chart of spending by category with legend, amounts and percentages; 12-month bar chart for the year (click a bar to jump to that month); year total; 5 most recent expenses of the month. |
| Expenses tab | Full list for the selected month, newest first, with search by category or note. |
| Monthly table tab | Categories down, months across, row and column totals for the selected year. Sticky first column, horizontal scroll on mobile. |
| CSV export | Downloads `pocket-<year>.csv` with the category-by-month totals table. |

### Platform and quality
| Feature | Details |
|---|---|
| Storage | Cloudflare D1 (SQLite); amounts stored as integer cents. Local dev persists in `.wrangler/state`. |
| Mobile-first layout | Responsive at 1180 / 800 / 600px breakpoints; checked at 390px. |
| Accessibility | Labelled icon buttons, screen-reader status announcements, alert roles for errors, focus outlines. |
| Error handling | Load failure shows a banner with Retry; API failures return friendly messages; buttons disable while saving. |
| Request safety | Cross-origin mutation requests rejected (403); parameterised SQL everywhere. |
| AI tool access | Registers a read-only `read_expenses` tool via WebMCP (`document.modelContext`) so a browser assistant can read the data. |
| Access | Single owner, protected by the hosting platform's access gate. No in-app accounts. |

## Known limitations
These are the gaps the ideas below address.
- Expenses only; no income, budgets, or balances.
- Search covers the selected month only.
- CSV export contains yearly totals, not individual entries; there is no import.
- All expenses are loaded on every page load (no pagination); fine for years of personal data, but unbounded.
- A failed delete shows the page-level error banner, which also hides totals until Retry.
- Delete is only available from the Expenses tab, not from Recent expenses on Overview.
- No backup or restore; the local database is the only copy.
- Donut uses 6 colours that repeat beyond 6 categories.
- No dark mode.

## Feature ideas
Proposed, not yet prioritised. Size: S = under an hour, M = a few hours, L = a day or more.

| # | Idea | Why | Size |
|---|---|---|---|
| 1 | **Monthly budgets per category** with progress bars and over-budget highlight | Turns tracking into control; most-requested feature in expense apps | M |
| 2 | **Full data export and import** (all entries as CSV/JSON) | Backup safety; the local DB is currently the only copy | M |
| 3 | **Recurring expenses** (rent, internet, mobile) auto-added each month | Removes repetitive entry for fixed costs | M |
| 4 | **Search and filter across all time** (date range, category, amount range) | Find "when did I last pay X" | S |
| 5 | **Month-over-month comparison** (this month vs last, per category, with % change) | Shows trends at a glance | S |
| 6 | **Undo delete** via a toast instead of (or after) the confirm dialog | Faster and safer than confirm-only | S |
| 7 | **Income tracking** and net savings per month | Complete picture of cash flow | L |
| 8 | **Payment method / account** field (cash, bKash, card, bank) | Matches the Credit Card Fee / Bank Fee categories; reconcile by account | M |
| 9 | **Quick add**: repeat last expense, or favourite presets | One tap for frequent entries like Milk or Transport | S |
| 10 | **Dark mode** | Comfort at night; tokens already exist in `globals.css` | S |
| 11 | **Category colours and icons** chosen by the user | Readable donut beyond 6 categories | M |
| 12 | **Yearly report view** (top categories, biggest months, average per month) | Year-end review and tax prep (there is a Tax category) | M |
| 13 | **Receipt photo attachment** stored in R2 | Proof for medical, tax, and business expenses | L |
| 14 | **Installable PWA** with offline entry queued until online | Feels like a native phone app | L |
| 15 | **Merge categories** (move all expenses from A into B, then delete A) | Today deleting a used category requires editing each expense | S |

## Decisions
Record ideas that were rejected or deferred, with the reason, so they are not proposed again.

| Idea | Decision | Reason |
|---|---|---|
| | | |
