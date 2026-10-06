# Pocket features

Pocket is a personal money app for one owner (BDT, Asia/Dhaka): accounts and net worth, income, spending, budgets and reports. It never connects to banks; everything is entered by hand.
Status of what Pocket does today and what could come next.
Keep this file current: move an idea to "Implemented" when it ships.

## Implemented

### Expenses
| Feature | Details | Code |
|---|---|---|
| Add expense | Dialog with amount (BDT, up to 2 decimals), category, date, optional note (max 200 chars). The Add button (header on desktop, floating on mobile) adds an expense in one tap; its menu also adds income or a transfer. | `tracker.tsx` `start()`, `save()`; `POST /api/expenses` |
| Edit expense | Pencil button on any expense row reopens the dialog pre-filled. | `PUT /api/expenses` |
| Delete with undo | Trash button on every expense row (Overview and Transactions). Deletes immediately and shows a toast with Undo for 7 seconds; Undo re-creates the identical expense. If the delete fails, the row comes back with an error toast. | `remove()`, `undo()`; `DELETE`/`POST /api/expenses` |
| Payment method | Optional "Paid with" on each expense (free text up to 30 chars, suggestions: Cash, bKash, Nagad, Card, Bank transfer and past methods). New entries default to the most recently used method. Shown on rows, searchable, filterable (Paid with), in the all-expenses CSV and backups. | `method` column; `lib/expenses.ts` |
| Quick add | The add dialog shows up to 5 chips for your most frequent expenses of the last 60 days (same category, amount and note), most used first. Tapping one fills amount, category, payment method and note; date stays today. Not shown when editing. | `lib/quick.ts` (unit tested) |
| Smart defaults | New entries default to the Groceries category and to today (Asia/Dhaka) when viewing the current month, otherwise the 1st of the viewed month. After saving, the view jumps to the expense's month. | `start()`, `today()` |
| Server validation | Positive amount, at most 2 decimals and 9 digits; real calendar date from 1900 onward; category must exist; note trimmed. Friendly error messages shown in the form. | `lib/expenses.ts` `validateExpense()` |

### Income
| Feature | Details | Code |
|---|---|---|
| Income entries | Add from the Add menu or the "Income & savings" panel; edit and delete (with Undo) from the panel or Transactions. Amount, source (suggestions from defaults and past sources), date, optional account and note. | `app/income.tsx` (`IncomeDialog`, `deleteIncome`); `/api/income` |
| Net savings | Panel shows the month's income, spent, saved or overspent, and savings rate. Monthly table and CSV export add Income and Net rows when any income exists. Included in backups. | `lib/income.ts` |

### Categories
| Feature | Details | Code |
|---|---|---|
| Default categories | 26 categories seeded on first use (Utilities, Food, Rent, Groceries, etc.). | `lib/expenses.ts`, `lib/categories.ts` |
| Add category | Inline "Add category" inside the expense dialog; new category is selected immediately. Case-insensitive duplicates rejected; 1 to 50 chars. | `addCategory()`; `POST /api/categories` |
| Rename category | "Manage categories" dialog; renaming updates every existing expense in that category. | `PUT /api/categories` |
| Colours and icons | In Manage categories, tap a category's swatch to pick one of 12 colours and 20 icons (or reset). Used by the donut, legend and expense rows; unstyled categories get a palette colour by position. Kept on rename; included in backups (restore only styles categories that have none). | `lib/category-style.ts`, `app/category-icon.tsx`, `PUT /api/categories/style` |
| Merge categories | In Manage categories, the merge button on a row picks another category; after confirming, all its expenses and recurring rules move there and the source is deleted in one batch. The target keeps its colour, icon and budget (it takes the source's budget only if it has none). Cannot be undone. | `mergeCategory()`; `POST /api/categories/merge` |
| Delete category | Only allowed when the category has no expenses; confirmation dialog. Shows the expense count per category. | `DELETE /api/categories` |

### Views and insights
| Feature | Details |
|---|---|
| Month navigation | Previous/next buttons and a native month picker. |
| Summary cards | Net worth (own / owe, link to Accounts), money in this month with saved amount and rate, money out this month with % change vs last month and the top category. |
| Overview tab | Donut chart of spending by category with legend, amounts and percentages; 12-month bar chart for the year (click a bar to jump to that month); year total; income & savings, budgets, month comparison; 6 most recent entries of the month across spending, income and transfers. |
| Transactions tab | Spending, income and transfers in one list for the selected month or all time, newest first, with an All / Spending / Income / Transfers switch and in/out totals. Text search also matches sources and account names; category and payment-method filters apply to spending only. Logic in `lib/activity.ts` (unit tested). Expense filters as before: Search by category or note; filter by category, amount range and (all time) date range; live count and total of the results; Clear filters. On mobile the filters collapse behind a Filters button showing how many are active. Logic in `lib/filter.ts` (unit tested). |
| Month-over-month comparison | Total card shows the % change vs the previous month. "Compared with <month>" panel on Overview lists each category's last month → this month and % change ("New" when there was nothing before), biggest changes first, top 6 with Show all. Increases in warm red, decreases in green. Logic in `lib/compare.ts` (unit tested). |
| Reports: monthly table | Categories down, months across, row and column totals for the selected year. Sticky first column, horizontal scroll on mobile. |
| Reports: year in review | Year in review for the selected month's year: total spent with % change vs the previous year, average per month (from the first month with spending to this month, or December for past years), income and saved/overspent when income exists, biggest and quietest month (click to open that month), categories ranked by spend with share bars (top 8, Show all), and the five largest single expenses. Logic in `lib/yearly.ts` (unit tested). `app/yearly.tsx`. |
| Accounts and net worth | Accounts tab: add cash, bank, mobile wallet, DPS, FD, mutual fund, Sanchayapatra, shares, loan given, loan taken, credit card or other accounts, each with a starting balance and note. Shows assets, amount owed and net worth, accounts grouped by kind with group totals. Loans taken and credit cards are debts (shown as amount owed). Tap an account for its balance and full history. Accounts with history cannot be deleted; close them to hide them from lists and pickers. `app/accounts.tsx`, `/api/accounts`, `lib/accounts.ts` (unit tested). |
| Transfers | Move money between any two accounts (e.g. bank to cash, or an EMI from bank to a loan or card). Edit or delete with Undo from the activity list or account history. `/api/accounts/transfers`. |
| Balance updates | Set a new balance or amount owed for interest, profit, fees or a new market value; the difference is stored as a signed adjustment. Deletable with Undo. `/api/accounts/adjustments`. |
| Linked expenses and income | Expenses have an optional "Paid from" account and income an optional "Received in" account; both change that account's balance. New entries default to the most recently used open account. Unlinked entries never affect balances. |
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
- Recurring rules cannot link an account yet, so generated expenses are unlinked until edited.
- Account balances are all-time totals; there is no balance-over-time chart or balance on a past date.
- The all-expenses CSV does not include the account.
- Restore cannot import CSV files from other apps or banks (JSON backups only).
- All expenses are loaded on every page load (no pagination); fine for years of personal data, but unbounded.
- Backups are manual; nothing is backed up automatically.
- Unstyled categories share a 12-colour palette by position, so two can look alike until you pick colours.

## Feature ideas
Proposed, not yet prioritised. Size: S = under an hour, M = a few hours, L = a day or more. Nothing here connects to a bank.

| # | Idea | Why | Size |
|---|---|---|---|
| 16 | **Recurring income and transfers with accounts** (salary into bank, monthly DPS instalment, loan EMI; recurring expenses gain "Paid from") | The biggest monthly movements are regular; today they must be entered by hand | M |
| 17 | **Investment details** on DPS, FD, Sanchayapatra: start date, maturity date, profit rate, instalment; expected maturity value and an "Upcoming maturities" list | Know when money unlocks and what it will be worth | M |
| 18 | **Loan and EMI tracker**: principal, rate, tenure; remaining balance, instalments left, next due date, interest vs principal split | Loans are the largest debts; see the payoff path | M |
| 19 | **Savings goals** (emergency fund, Hajj, laptop) with target, date, linked accounts and progress | Turns savings into plans | M |
| 20 | **Net worth over time** chart, rebuilt from dated history (opening balances, entries, transfers, updates) | See whether you are getting richer month by month | M |
| 21 | **Bills and due dates** (credit card, utilities, school fees) with an upcoming list and reminders | Avoid late fees | M |
| 22 | **Zakat calculator** from cash, savings, investments and gold, minus debts, against the nisab | Yearly obligation, numbers already in the app | S |
| 23 | **Tax-year view** (July to June) with income totals and investment rebate helpers (Sanchayapatra, DPS, life insurance) | Tax return prep | M |
| 24 | **Gold and property** as assets with units (vori/gram, decimal) and a manual price | Common store of value not covered by account types | S |
| 25 | **Income vs spending chart** on Overview (two bars per month) | The current chart shows spending only | S |
| 26 | **Privacy mode**: one tap blurs all amounts | Use the app in public | S |
| 27 | **Cash-flow forecast** for the next 30 days from recurring items and bills | Know if the month will be tight before it is | M |
| 13 | **Receipt photo attachment** stored in R2 | Proof for medical, tax, and business expenses | L |
| 14 | **Installable PWA** with offline entry queued until online | Feels like a native phone app | L |

## Decisions
Record ideas that were rejected or deferred, with the reason, so they are not proposed again.

| Idea | Decision | Reason |
|---|---|---|
| | | |
