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
| Summary cards | Net worth on a banknote-style card (own / owe, link to Accounts), money in this month with saved amount and rate, money out this month with % change vs last month and the top category. |
| Overview tab | Donut chart of spending by category with legend, amounts and percentages; 12-month bar chart for the year, with a money-in bar beside each month's spending once the year has income (click a bar to jump to that month); year total; income & savings, budgets, month comparison; 6 most recent entries of the month across spending, income and transfers. |
| Transactions tab | Spending, income and transfers in one list for the selected month or all time, newest first, with an All / Spending / Income / Transfers switch and in/out totals. Text search also matches sources and account names; category and payment-method filters apply to spending only. Logic in `lib/activity.ts` (unit tested). Expense filters as before: Search by category or note; filter by category, amount range and (all time) date range; live count and total of the results; Clear filters. On mobile the filters collapse behind a Filters button showing how many are active. Logic in `lib/filter.ts` (unit tested). |
| Month-over-month comparison | Total card shows the % change vs the previous month. "Compared with <month>" panel on Overview lists each category's last month → this month and % change ("New" when there was nothing before), biggest changes first, top 6 with Show all. Increases in warm red, decreases in green. Logic in `lib/compare.ts` (unit tested). |
| Payment channel breakdown | "Payment channels" panel on Overview: visual proportional bar and list of spending by payment method (bKash, Nagad, Cash, Card, Bank transfer) with expense count, amount in BDT and percentage share. Logic in `lib/method-breakdown.ts` (unit tested). `app/method-breakdown.tsx`. |
| Reports: monthly table | Categories down, months across, row and column totals for the selected year. Sticky first column, horizontal scroll on mobile. |
| Reports: year in review | Year in review for the selected month's year: total spent with % change vs the previous year, average per month (from the first month with spending to this month, or December for past years), income and saved/overspent when income exists, biggest and quietest month (click to open that month), categories ranked by spend with share bars (top 8, Show all), and the five largest single expenses. Logic in `lib/yearly.ts` (unit tested). `app/yearly.tsx`. |
| Accounts and net worth | Accounts tab: add cash, bank, mobile wallet, DPS, FD, mutual fund, Sanchayapatra, shares, gold, land & property, loan given, loan taken, credit card or other accounts, each with a starting balance and note. Shows assets, amount owed and net worth, accounts grouped by kind with group totals. Loans taken and credit cards are debts (shown as amount owed). Tap an account for its balance and full history. Accounts with history cannot be deleted; close them to hide them from lists and pickers. `app/accounts.tsx`, `/api/accounts`, `lib/accounts.ts` (unit tested). |
| Savings terms and maturities | DPS, FD and Sanchayapatra accounts take optional terms: opened on, matures on, profit rate (% a year) and, for DPS, the monthly instalment. Rows show the rate and maturity date; the account detail shows the terms, time left and an estimated value at maturity (DPS: balance compounding monthly plus remaining instalments; FD: simple interest; Sanchayapatra: principal back plus estimated monthly profit before tax). An "Upcoming maturities" panel on Accounts lists savings soonest first. Estimates are labelled as such. `lib/terms.ts` (unit tested). |
| Loans and EMIs | Loan taken and loan given accounts take optional terms: started on, last instalment date, interest rate and monthly EMI. A "Loans" panel on Accounts shows what is left, the EMI, the next due date (the start date's day each month), a repaid bar against the starting amount and the estimated payoff month. The account detail splits the next instalment into interest and principal, compares the payoff estimate with the schedule and warns when the EMI does not cover the interest. "Make a payment" (or "Record a repayment" for money lent) pre-fills the EMI. `lib/terms.ts` `loanInfo()` (unit tested). |
| Gold and property | "Gold" and "Land & property" account types (group Gold & property) with an optional quantity and unit: vori or gram for gold; katha, decimal, bigha or sq ft for land. Rows show the quantity; the detail shows the implied price per unit. Update balance takes today's price per unit and works out the new value. |
| Zakat calculator | "Zakat" on the Accounts tab. Nisab from silver (52.5 vori) or gold (7.5 vori) at a price per vori you enter (remembered on this device). Counts cash, bank, wallet, savings, investments, gold and money lent by default (tick or untick any account; property is opt-in), optionally subtracts debts due within a year (credit card balance, up to 12 loan EMIs), and shows 2.5% of the net when it reaches the nisab. Labelled as a guide. `app/zakat.tsx`, `lib/zakat.ts` (unit tested). |
| Net worth over time | Accounts tab line chart of net worth at each month end for the last 12 months, rebuilt from dated entries, transfers and balance updates, with the change this month and over the year, hover/focus tooltips (own, owe, net) and a "Show numbers" table. Starting balances count from the beginning. `app/networth.tsx`, `lib/networth.ts` (unit tested). |
| Transfers | Move money between any two accounts (e.g. bank to cash, or an EMI from bank to a loan or card). Edit or delete with Undo from the activity list or account history. `/api/accounts/transfers`. |
| Balance updates | Set a new balance or amount owed for interest, profit, fees or a new market value; the difference is stored as a signed adjustment. Deletable with Undo. `/api/accounts/adjustments`. |
| Linked expenses and income | Expenses have an optional "Paid from" account and income an optional "Received in" account; both change that account's balance. New entries default to the most recently used open account. Unlinked entries never affect balances. |
| Reports: tax year | Bangladesh tax year (1 July to 30 June) with previous/next: total income and income by source, money invested (transfers into DPS, FD, Sanchayapatra, shares and mutual funds from other accounts), tax paid (the "Tax" category) and total spent, plus a CSV download. No tax rules are applied; a note points to the current NBR rules. `app/taxyear.tsx`, `lib/taxyear.ts` (unit tested). |
| CSV export | "Download <year> CSV" in Reports > Monthly table: the category-by-month totals table. |
| Backup and restore | "Backup & restore" dialog: download a full JSON backup (categories, budgets, recurring rules, expenses), export every expense as CSV (including account), and restore from a backup (accounts, transfers, balance updates, goals and bills included). Tracks last backup time on device with overdue reminders (>30 days). Restore only adds what is missing (expenses by ID, categories case-insensitively, budgets for categories without one) and never changes or deletes data. The whole file is validated before anything is written. Tested with 6,000 expenses. `app/backup.tsx`, `/api/backup`. |
| Recurring items | "Recurring" dialog to add, edit and stop monthly rules of three kinds: expenses (category, optional Paid from account), income (source, optional Received in account) and transfers between two accounts (e.g. DPS instalment, loan EMI). Each has an amount, day 1 to 31, note and start month. Due occurrences are added automatically before expenses, income or accounts load, catching up missed months; day 29 to 31 falls on the last day of shorter months. Generated entries show a repeat icon and behave like normal ones; deleting one does not bring it back. Edits apply to months not yet added. Categories and accounts used by a rule cannot be deleted. Included in backups. `app/recurring.tsx`, `/api/recurring`, `lib/rules.ts` (unit tested), `lib/recurring.ts`. |
| Next 30 days | Overview panel listing what is expected in the next 30 days: recurring income, expenses and transfers, unpaid bills (overdue first), loan EMIs and repayments (skipped when a recurring transfer already covers that loan) and savings maturities, with expected money in and out (bills without a usual amount are counted separately). `app/upcoming.tsx`, `lib/forecast.ts` (unit tested). |
| Bills and due dates | "Bills" panel on Overview for monthly bills paid by hand (electricity, gas, credit card): name, category, usual amount or "Varies", due day and usual account. Sorted overdue, due soon (7 days), upcoming, then paid. "Pay" records the expense (amount, date, account) and marks the month paid; "Already recorded" just marks it paid. Bills follow category renames and merges; categories and accounts used by a bill cannot be deleted. Included in backups. `app/bills.tsx`, `/api/bills`, `lib/bills.ts` (unit tested). |
| Savings goals | "Savings goals" panel on Overview: add goals with a target, optional date and the accounts that hold the money (or a manual "saved so far" amount). Each shows progress, amount left, and how much a month is needed to reach the date (rounded up to whole taka); reached and overdue goals are marked. Included in backups. `app/goals.tsx`, `/api/goals`, `lib/goals.ts` (unit tested). |
| Monthly budgets | Optional monthly limit per category (same every month). Overview panel shows spent vs budget with a progress bar, amount left or over, and a count of over-budget categories. Edit all budgets in one dialog; blank removes a budget. Budgets follow category renames and are removed with the category. `app/budgets.tsx`, `/api/budgets`. |

### Platform and quality
| Feature | Details |
|---|---|
| Visual design | Flag green (#006a4e) on cool paper (#f3f6f4), red reserved for debt, overdue and overspending. Bricolage Grotesque for headings and all amounts (tabular figures), Hind Siliguri (Bangla-ready) for text, loaded from Google Fonts. Net worth card styled as a taka note. On phones the tabs become a bottom navigation bar with the Add button above it. Dates in lists show as "6 Oct". |
| Privacy mode | Eye button in the header hides every amount (shown as BDT ••••; the monthly table is blurred) so the app can be used in public. Remembered on this device. `app/privacy.tsx`, `lib/format.ts`. |
| Storage | Cloudflare D1 (SQLite); amounts stored as integer cents. Local dev persists in `.wrangler/state`. |
| Dark mode | Theme switch in the top bar cycles System, Light and Dark (saved per browser). System follows the OS live. Applied before first paint, so no flash. Toasts follow the theme. | `app/theme.tsx`, `app/pocket-dark.css`, `lib/theme-script.ts` |
| Mobile-first layout | Responsive at 1180 / 800 / 600px breakpoints; checked at 390px. |
| Accessibility | Labelled icon buttons, screen-reader status announcements, alert roles for errors, focus outlines. |
| Error handling | Load failure shows a banner with Retry; API failures return friendly messages; buttons disable while saving. |
| Request safety | Cross-origin mutation requests rejected (403); parameterised SQL everywhere. |
| AI tool access | Registers a read-only `read_expenses` tool via WebMCP (`document.modelContext`) so a browser assistant can read the data. |
| Command palette | Global Ctrl+K / Cmd+K command palette and topbar search shortcut: jump to tabs, reports, filter by category, view accounts, or trigger quick entry actions. Powered by cmdk. `app/palette.tsx`. |
| Access | Single owner, protected by the hosting platform's access gate. No in-app accounts. |

## Known limitations
These are the gaps the ideas below address.
- Starting balances have no date, so net worth history before you began tracking shows those balances.
- Restore cannot import CSV files from other apps or banks (JSON backups only).
- All expenses are loaded on every page load (no pagination); fine for years of personal data, but unbounded.
- Backups are manual (prompted with 30-day overdue indicator on device).
- Unstyled categories share a 12-colour palette by position, so two can look alike until you pick colours.

## Feature ideas
Proposed, not yet prioritised. Size: S = under an hour, M = a few hours, L = a day or more. Nothing here connects to a bank.

| # | Idea | Why | Size |
|---|---|---|---|
| 14 | **Installable PWA** with offline entry queued until online | Feels like a native phone app | L |

## Decisions
Record ideas that were rejected or deferred, with the reason, so they are not proposed again.

| Idea | Decision | Reason |
|---|---|---|
| #13 Receipt photos in R2 | Excluded for now (2026-10-06) | Needs file storage and deployment changes the hosting may not support. |
