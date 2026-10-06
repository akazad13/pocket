# Pocket features

Status of what Pocket does today and what could come next.
Keep this file current: move an idea to "Implemented" when it ships.

## Implemented

### Expenses
| Feature | Details | Code |
|---|---|---|
| Add expense | Dialog with amount (BDT, up to 2 decimals), category, date, optional note (max 200 chars). Desktop button in header, floating button on mobile. | `tracker.tsx` `start()`, `save()`; `POST /api/expenses` |
| Edit expense | Pencil button on any expense row reopens the dialog pre-filled. | `PUT /api/expenses` |
| Delete with undo | Trash button on every expense row (Overview and Expenses). Deletes immediately and shows a toast with Undo for 7 seconds; Undo re-creates the identical expense. If the delete fails, the row comes back with an error toast. | `remove()`, `undo()`; `DELETE`/`POST /api/expenses` |
| Payment method | Optional "Paid with" on each expense (free text up to 30 chars, suggestions: Cash, bKash, Nagad, Card, Bank transfer and past methods). New entries default to the most recently used method. Shown on rows, searchable, filterable (Paid with), in the all-expenses CSV and backups. | `method` column; `lib/expenses.ts` |
| Quick add | The add dialog shows up to 5 chips for your most frequent expenses of the last 60 days (same category, amount and note), most used first. Tapping one fills amount, category, payment method and note; date stays today. Not shown when editing. | `lib/quick.ts` (unit tested) |
| Smart defaults | New entries default to the Groceries category and to today (Asia/Dhaka) when viewing the current month, otherwise the 1st of the viewed month. After saving, the view jumps to the expense's month. | `start()`, `today()` |
| Server validation | Positive amount, at most 2 decimals and 9 digits; real calendar date from 1900 onward; category must exist; note trimmed. Friendly error messages shown in the form. | `lib/expenses.ts` `validateExpense()` |

### Income
| Feature | Details | Code |
|---|---|---|
| Income entries | "Income & savings" panel on Overview: add, edit and delete (with Undo) income with amount, source (suggestions from defaults and past sources), date and note. | `app/income.tsx`; `/api/income` |
| Net savings | Panel shows the month's income, spent, saved or overspent, and savings rate. Monthly table and CSV export add Income and Net rows when any income exists. Included in backups. | `lib/income.ts` |

### Categories
| Feature | Details | Code |
|---|---|---|
| Default categories | 26 categories seeded on first use (Utilities, Food, Rent, Groceries, etc.). | `lib/expenses.ts`, `lib/categories.ts` |
| Add category | Inline "Add category" inside the expense dialog; new category is selected immediately. Case-insensitive duplicates rejected; 1 to 50 chars. | `addCategory()`; `POST /api/categories` |
| Rename category | "Manage categories" dialog; renaming updates every existing expense in that category. | `PUT /api/categories` |
| Colours and icons | In Manage categories, tap a category's swatch to pick one of 12 colours and 20 icons (or reset). Used by the donut, legend and expense rows; unstyled categories get a palette colour by position. Kept on rename; included in backups (restore only styles categories that have none). | `lib/category-style.ts`, `app/category-icon.tsx`, `PUT /api/categories/style` |
| Delete category | Only allowed when the category has no expenses; confirmation dialog. Shows the expense count per category. | `DELETE /api/categories` |

### Views and insights
| Feature | Details |
|---|---|
| Month navigation | Previous/next buttons and a native month picker. |
| Summary cards | Total spent this month with entry count, active categories (used / total), largest category with its amount. |
| Overview tab | Donut chart of spending by category with legend, amounts and percentages; 12-month bar chart for the year (click a bar to jump to that month); year total; 5 most recent expenses of the month. |
| Expenses tab | List for the selected month or all time, newest first. Search by category or note; filter by category, amount range and (all time) date range; live count and total of the results; Clear filters. On mobile the filters collapse behind a Filters button showing how many are active. Logic in `lib/filter.ts` (unit tested). |
| Month-over-month comparison | Total card shows the % change vs the previous month. "Compared with <month>" panel on Overview lists each category's last month → this month and % change ("New" when there was nothing before), biggest changes first, top 6 with Show all. Increases in warm red, decreases in green. Logic in `lib/compare.ts` (unit tested). |
| Monthly table tab | Categories down, months across, row and column totals for the selected year. Sticky first column, horizontal scroll on mobile. |
| Year tab | Year in review for the selected month's year: total spent with % change vs the previous year, average per month (from the first month with spending to this month, or December for past years), income and saved/overspent when income exists, biggest and quietest month (click to open that month), categories ranked by spend with share bars (top 8, Show all), and the five largest single expenses. Logic in `lib/yearly.ts` (unit tested). `app/yearly.tsx`. |
| CSV export | Downloads `pocket-<year>.csv` with the category-by-month totals table. |
| Backup and restore | "Backup & restore" dialog: download a full JSON backup (categories, budgets, recurring rules, expenses), export every expense as CSV, and restore from a backup. Restore only adds what is missing (expenses by ID, categories case-insensitively, budgets for categories without one) and never changes or deletes data. The whole file is validated before anything is written. Tested with 6,000 expenses. `app/backup.tsx`, `/api/backup`. |
| Recurring expenses | "Recurring" dialog to add, edit and stop monthly rules (category, amount, day 1 to 31, note, start month). Due occurrences are added automatically when expenses load, catching up missed months; day 29 to 31 falls on the last day of shorter months. Generated expenses show a repeat icon and behave like normal expenses; deleting one does not bring it back. Edits apply to months not yet added. Categories used by a rule cannot be deleted. Included in backups. `app/recurring.tsx`, `/api/recurring`, `lib/recurring.ts`. |
| Monthly budgets | Optional monthly limit per category (same every month). Overview panel shows spent vs budget with a progress bar, amount left or over, and a count of over-budget categories. Edit all budgets in one dialog; blank removes a budget. Budgets follow category renames and are removed with the category. `app/budgets.tsx`, `/api/budgets`. |

### Platform and quality
| Feature | Details |
|---|---|
| Storage | Cloudflare D1 (SQLite); amounts stored as integer cents. Local dev persists in `.wrangler/state`. |
| Dark mode | Theme switch in the top bar cycles System, Light and Dark (saved per browser). System follows the OS live. Applied before first paint, so no flash. Toasts follow the theme. | `app/theme.tsx`, `app/pocket-dark.css`, `lib/theme-script.ts` |
| Mobile-first layout | Responsive at 1180 / 800 / 600px breakpoints; checked at 390px. |
| Accessibility | Labelled icon buttons, screen-reader status announcements, alert roles for errors, focus outlines. |
| Error handling | Load failure shows a banner with Retry; API failures return friendly messages; buttons disable while saving. |
| Request safety | Cross-origin mutation requests rejected (403); parameterised SQL everywhere. |
| AI tool access | Registers a read-only `read_expenses` tool via WebMCP (`document.modelContext`) so a browser assistant can read the data. |
| Access | Single owner, protected by the hosting platform's access gate. No in-app accounts. |

## Known limitations
These are the gaps the ideas below address.
- No account balances (cash in hand, bank) yet; income and expenses are tracked as flows only.
- Restore cannot import CSV files from other apps or banks (JSON backups only).
- All expenses are loaded on every page load (no pagination); fine for years of personal data, but unbounded.
- Backups are manual; nothing is backed up automatically.
- Unstyled categories share a 12-colour palette by position, so two can look alike until you pick colours.

## Feature ideas
Proposed, not yet prioritised. Size: S = under an hour, M = a few hours, L = a day or more.

| # | Idea | Why | Size |
|---|---|---|---|
| 13 | **Receipt photo attachment** stored in R2 | Proof for medical, tax, and business expenses | L |
| 14 | **Installable PWA** with offline entry queued until online | Feels like a native phone app | L |
| 15 | **Merge categories** (move all expenses from A into B, then delete A) | Today deleting a used category requires editing each expense | S |

## Decisions
Record ideas that were rejected or deferred, with the reason, so they are not proposed again.

| Idea | Decision | Reason |
|---|---|---|
| | | |
