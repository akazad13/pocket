# CLAUDE.md

Pocket: a single-user, mobile-first personal money app (accounts and net worth, income, spending, budgets, reports; currency BDT, timezone Asia/Dhaka). No bank connections; everything is entered by hand.
Next.js 16 App Router code, run by **vinext** (Vite-based Next runtime) on a **Cloudflare Worker** with a **D1** (SQLite) database.
The project was scaffolded by the OpenAI "Sites" starter (`site-creator-vinext-starter`); most of the tooling outside `app/`, `lib/`, `db/` and `drizzle/` is that starter's plumbing.

## Commands (Windows, Node >= 22.13; v22.13.1 installed)

| Task | Command | Notes |
|---|---|---|
| Install | `npm run install:ci` | Runs `npm ci` via `scripts/install-ci.mjs`. Never plain `npm install` (rewrites lockfile). |
| Dev server | `npm run dev` | http://127.0.0.1:5173/ . Long-running: start with `run_in_background`. Uses local D1 in `.wrangler/state`. |
| Typecheck | `npm run typecheck` | ~10s. Passes clean. **Primary verification step.** |
| Unit tests | `npm run test:unit` | ~1s. `node:test` on TypeScript via `--experimental-strip-types`; files `tests/unit/*.test.ts`. For pure logic in `lib/` (no `cloudflare:workers` imports). Test files import with `.ts` extensions; `tests/unit/register.mjs` resolves extensionless imports inside `lib/`. |
| Smoke test | `npm run smoke` | Needs `npm run dev` running. 146 API checks (CRUD, validation, rename cascade, origin check). Uses unique `Smoke ...` names and cleans up. Run after any change to `app/api/` or `lib/`. |
| Lint | `npm run lint` | ~60s. Clean (0 errors); keep it that way. The React Compiler rule forbids synchronous setState inside effects: set state only after an `await`. |
| Build | `npm run build` | Outputs `dist/` (Worker + client). |
| Run built app | `npm start` | wrangler dev against `dist/server/wrangler.json`. |
| New migration | `npm run db:generate` | drizzle-kit, after editing `db/schema.ts`. |

Verify changes with typecheck, `npm run test:unit` for pure logic, `npm run smoke` for API changes, and Playwright MCP against :5173 for UI changes. Extend `tests/smoke.mjs` when adding or changing API behaviour.

**The local D1 database (`.wrangler/state`) holds the owner's real expense data** (the app is not deployed). Never reset, delete, or run destructive SQL against it without explicit permission. Back it up before applying migrations: copy `.wrangler/state` to `../pocket-db-backups/<timestamp>-<reason>/` (outside the repo).

Git: `main` branch, LF line endings enforced by `.gitattributes`. The folder is owned by another Windows account, so it is listed in the global `safe.directory`. Commit only when asked.

## Where things are (the only files you normally touch)

```
app/tracker.tsx            Main UI: one "use client" component (~80 very long lines). All state and fetches, summary cards, the Add split button/menu, tabs (Overview, Transactions, Accounts, Reports), expense dialog, and the top-level income and transfer dialogs.
app/budgets.tsx            Budgets panel + edit dialog (self-contained, fetches /api/budgets).
app/recurring.tsx          Recurring rules dialog (list/add/edit/stop) for expense, income and transfer rules.
app/income.tsx             IncomePanel (Overview), IncomeDialog (keyed per opening), IncomeRow, deleteIncome(); income state lives in tracker.
app/category-icon.tsx      Icon key → lucide component (fallback ReceiptText).
app/comparison.tsx         "Compared with last month" panel; changeText()/ChangeIcon reused by the total card.
app/yearly.tsx             "Year" tab: year-in-review panels built from lib/yearly.ts.
app/accounts.tsx           "Accounts" tab: net worth, account list/detail/history, account and update-balance dialogs. Exports AccountPicker, TransferDialog (keyed per opening), TransferRow, deleteTransfer() used by the tracker.
app/networth.tsx           Net worth over time chart (Accounts tab): SVG line + HTML dots, tooltip, numbers table. Line colours #13805a / #2fa872 (dark) pass the dataviz palette validator; the brand #256a53 is too grey for chart marks.
app/zakat.tsx              Zakat calculator dialog (Accounts tab); nisab basis/price in localStorage 'pocket-zakat'.
app/backup.tsx             Backup & restore dialog (JSON download, all-expenses CSV, restore upload).
app/page.tsx               Re-exports tracker.
app/layout.tsx             Metadata, imports globals.css + pocket.css.
app/pocket-dark.css        Dark theme overrides (html[data-theme=dark]); shadcn tokens + every hardcoded app colour.
app/theme.tsx              ThemeToggle + useTheme() (useSyncExternalStore over localStorage 'pocket-theme').
app/privacy.tsx            PrivacyToggle + usePrivacy() ('pocket-private'); masks money() output and sets html[data-private] for CSS blurs.
app/pocket.css             All app styling (minified-style, plain class names, 3 breakpoints: 1180/800/600px).
app/globals.css            Tailwind v4 + shadcn theme tokens. pocket.css overrides tokens in :root.
app/api/expenses/route.ts  GET list, POST create, PUT update, DELETE {id}.
app/api/categories/route.ts GET {categories, styles}, POST add, PUT rename {name, previous}, DELETE {name}.
app/api/categories/style/route.ts PUT {name, color, icon} ('' clears).
app/api/categories/merge/route.ts POST {from, into}: moves expenses, rules and budget (if target has none), deletes from, in one batch.
app/api/budgets/route.ts   GET {budgets:{name:cents}}, PUT {budgets:{name:amount|''}} bulk set/remove in one batch.
app/api/backup/route.ts    GET full JSON backup (attachment); POST merge-only restore.
app/api/income/route.ts    GET, POST, PUT, DELETE {id}; same pattern as expenses (no category).
app/api/recurring/route.ts GET rules, POST create, PUT edit (not start month), DELETE {id}. Checks accounts exist.
app/api/accounts/route.ts  GET {accounts, transfers, adjustments}, POST, PUT (edit/close), DELETE {id} (409 if it has history).
app/api/accounts/transfers/route.ts POST, PUT, DELETE {id}.
app/api/accounts/adjustments/route.ts POST {amount: signed value change}, DELETE {id}.
lib/expenses.ts            Default 26 category names, Expense type, validateExpense(), shared isAmount()/isDate() validators.
lib/categories.ts          getCategories() (lazy-seeds defaults once), categoryName() validator.
lib/budgets.ts             getBudgets(), budgetCents() validator.
lib/format.ts              money() BDT formatter shared by components; masked while privacy mode is on. New plain-number displays need an html[data-private] blur rule.
lib/csv.ts                 toCsv() (formula-injection safe) and download() helpers.
lib/backup.ts              Backup type, prepareImport() validation/category mapping.
lib/recurring.ts           Server-only: RULE_SELECT, applyRecurring() (inserts due rows into expenses, income, transfers), dhakaToday().
lib/rules.ts               Pure: Rule type, dueMonths(), dueRows(), validateRule(), ruleTitle(). Client-safe, unit tested.
lib/income.ts              Income type, defaultSources, validateIncome().
lib/compare.ts             Pure month-over-month comparison (totals and per category).
lib/yearly.ts              Pure year-in-review numbers (totals, average, ranked categories/months, largest).
lib/accounts.ts            Pure: account types/groups, validators, values() balances, totals(), adjustmentFor(). Client-safe.
lib/terms.ts               Pure: SAVING_TYPES/LOAN_TYPES, monthsBetween(), maturity() estimates, upcomingMaturities(), loanInfo() (interest split, payoff, next due), ratePct().
lib/networth.ts            Pure: lastMonths(), netWorthSeries() (totals at each month end from dated history).
lib/zakat.ts               Pure: nisab, default counted types, debts due within a year, zakat() total.
lib/activity.ts            Pure: merges expenses, income and transfers into one filtered list (Transactions tab, Recent activity); flows() totals.
lib/account-db.ts          Server-only: SELECT strings, toAccount(), missingAccount() existence check.
lib/theme-script.ts        Inline <head> script that sets data-theme before paint (kept out of the client module so the server layout gets the string).
lib/category-style.ts      PALETTE, ICONS, validateStyle(), colorFor() fallback colour by position.
lib/quick.ts               Pure quick-add suggestions (frequent recent expenses).
lib/filter.ts              Pure expense filtering (text, category, date range, amount range).
lib/months.ts              Pure month helpers (nextMonth, occurrenceDate) safe for client and server.
lib/database.ts            database(): returns raw env.DB (D1Database); jsonChunks() for bulk json_each inserts.
db/schema.ts               Drizzle table definitions (source of truth for migrations only).
drizzle/*.sql              Generated migrations 0000..0011.
docs/FEATURES.md           Implemented features, known limitations, feature ideas backlog. Read before planning new work; update when a feature ships.
tests/smoke.mjs            API smoke test (plain Node fetch, no dependencies).
tests/unit/*.test.ts       Unit tests for pure lib/ modules.
.claude/settings.json      Pre-approved safe commands for Claude Code.
```

Starter plumbing, **do not edit** unless the task is specifically about it: `build/`, `scripts/`, `vendor/`, `lib/connector*`, `app/chatgpt-auth.ts` (unused), `db/index.ts` (`getDb()` Drizzle client, unused), `examples/`, `components/ui/*` (vendored shadcn, regenerate rather than hand-edit), `.openai/hosting.json` (keep `project_id`), `vite.config.ts`.
Generated/ignored, never edit or search: `dist/`, `.next/`, `.vinext/`, `.wrangler/`, `.sites-runtime/`, `node_modules/`, `package-lock.json`.

## Data model and invariants

Tables (SQLite/D1):
- `expenses(id text pk, category text, cents integer, date text 'YYYY-MM-DD', note text default '', method text default '', account text default '')`: `method` is the optional payment method ('' = not recorded); `account` is an optional account id ('' = not linked).
- `custom_categories(key text pk = lower(name), name text, color text default '', icon text default '')`: color/icon must be from `PALETTE`/`ICONS` in `lib/category-style.ts`
- `app_state(key text pk)`: flag row `categories_initialized` marks that default categories were seeded.
- `budgets(category text pk, cents integer)`: monthly budget per category display name.
- `income(id text pk, source text, cents integer, date text, note text, account text default '')`: money in; independent of categories; optional account id.
- `accounts(id text pk, name, type, opening integer, note, closed integer 0/1, start_date, maturity_date, rate integer basis points, instalment integer cents, quantity integer, unit)`: terms are optional ('' / 0) and used by savings (maturity) and loans (end date, EMI). `quantity integer` (thousandths) and `unit` ('vori'|'gram'|'katha'|'decimal'|'bigha'|'sqft', from `UNITS`) record holdings for gold and property. `type` from `ACCOUNT_TYPES` in `lib/accounts.ts`. `opening` is the starting balance, or the amount owed for debt types (`loan_taken`, `credit_card`). Names unique case-insensitively (checked in the route).
- `transfers(id text pk, from_account, to_account, cents > 0, date, note)` and `adjustments(id text pk, account, cents signed, date, note)`.
- Balances are computed, never stored: value = ±opening + income − expenses + transfers in − out + adjustments, with debts negative (`values()`); the UI shows debts as a positive amount owed (`shown()`). Adjustment cents are the signed change in net-worth value. Accounts with any linked row cannot be deleted (409), only closed.
- `recurring(id text pk, kind 'expense'|'income'|'transfer', category, source, account, to_account, cents, day 1-31, note, start_month 'YYYY-MM', last_month nullable)`: monthly rules. Expense rules use `category` (+ optional `account` paid from); income rules use `source` (+ optional `account` received in); transfer rules use `account` → `to_account`. Unused fields are ''. `last_month` is the last month generated.

Rules to preserve:
- **Money is integer cents.** API accepts `amount` as a string (`^\d{1,9}(\.\d{1,2})?$`, > 0); server converts with `Math.round(amount*100)`. UI formats with `money()` (Intl `en-BD`, BDT). Never store floats.
- `expenses.category`, `budgets.category` and `recurring.category` store the category **display name**, not the key. Renaming a category must update every table that references it in one `db.batch` (see PUT in categories route); deleting a category removes its budget and is blocked while expenses or recurring rules use it.
- Category uniqueness is case-insensitive via `key = name.toLowerCase()`.
- A category with expenses cannot be deleted (409).
- Expense IDs are client-generated `crypto.randomUUID()`; server validates `^[a-zA-Z0-9-]{1,64}$`.
- Dates: validated as real calendar dates >= 1900-01-01. "Today" is computed in Asia/Dhaka in the client.
- Recurring generation is lazy: `GET /api/expenses`, `/api/income` and `/api/accounts` each call `applyRecurring()` first (concurrent calls are safe). Generated IDs are `rec-<ruleId>-<YYYY-MM>` in the expenses, income or transfers table (idempotent via ON CONFLICT); `last_month` advancing is what stops deleted occurrences from returning. Lib code imported by client components must not import `lib/database.ts` (it pulls in `cloudflare:workers`); put shared pure logic in files like `lib/months.ts` and use `import type` for server types.
- Seeding is lazy: `getCategories()` inserts defaults on first call if `categories_initialized` is absent. Deleting all categories will not re-seed.

Bulk writes: D1 limits queries per request (50 on the free plan) and bound parameters per query (100), so insert many rows with one `json_each(?)` statement per ~500KB chunk (see `/api/backup` POST), not one statement per row.

Data access uses **raw D1 prepared statements** (`database().prepare(...).bind(...)`) with `?` placeholders, not the Drizzle query builder. Follow that pattern; always bind parameters, never interpolate.

### Schema changes
1. Edit `db/schema.ts`.
2. `npm run db:generate` (writes `drizzle/000N_*.sql` + meta).
3. Apply locally: `npx wrangler d1 execute DB --local --persist-to .wrangler/state --file drizzle/000N_name.sql --config .sites-runtime/local.json`
   (`.sites-runtime/local.json` binds `DB` to `site-creator-d1`, id `00000000-0000-4000-8000-000000000000`).
4. Update the raw SQL in routes and the `Expense` type to match.

## API conventions (copy these when adding routes)

- JSON in, JSON out via `Response.json(...)`. Errors are `{error: "<user-facing sentence>"}`.
- Mutations first reject cross-origin: if `Origin` header is present and differs from the request origin, return 403.
- Status codes: 400 validation, 403 origin, 404 gone ("Please refresh"), 409 conflict, 503 for DB failures (`console.error(e)` then generic message). 201 on create.
- GET responses set `Cache-Control: no-store`.
- Validation errors are thrown as `Error(message)` from `lib/` validators and the message is returned to the user verbatim, so write them as friendly sentences.
- No per-user auth: the app relies on the hosting access gate and is single-owner. Do not add features that assume multiple users without adding authorization.

## UI conventions

- Everything lives in `app/tracker.tsx` as one component with many `useState`s. Dialogs that must open from any tab (expense, income, transfer) are rendered by the tracker; income and transfer dialogs are mounted with a fresh `key` per opening so their form state initialises from props without effects. Items in the Add menu run their action from `onCloseAutoFocus` (via the `afterMenu` ref) so the dialog gets focus after the menu closes. State is updated optimistically from API responses (no refetch after mutations).
- Styling is hand-written CSS classes in `app/pocket.css`, not Tailwind utility classes. **Every new class with a colour, background or border needs a matching `html[data-theme=dark]` rule in `app/pocket-dark.css`**; check both themes in screenshots. Tailwind v4 borders default to currentColor, so shadcn borders (e.g. table rows) may need an explicit colour. Palette: primary `#256a53`, background `#f8f9f6`, text `#22382e`. Mobile layout rules live in `@media(max-width:600px)`; check 390px width after UI changes.
- Icons from `lucide-react`; dialogs/selects/tabs/tables from `@/components/ui/*` (shadcn on Radix).
- Flex rows like `.category-row>div{flex:1}` also match new child divs; give full-width children a more specific `flex:0 0 100%` rule.
- `recharts` is installed but unused; the donut is a CSS `conic-gradient` and the bar chart is plain divs.
- The second `useEffect` registers a `read_expenses` tool on `document.modelContext` (WebMCP). Keep it in sync if the Expense shape changes.
- Transient feedback uses `sonner` toasts (`toast()` from 'sonner', `<Toaster>` mounted once in tracker with `mobileOffset` to clear the floating Add button). Form/dialog errors stay inline.
- Accessibility patterns in use: `aria-label` on icon buttons, `role="status"` sr-only notice, `role="alert"` errors. Keep them.

## Code style

- App code (`app/`, `lib/`, `db/schema.ts`) is written in a **dense, minified-like style**: single quotes, no spaces around operators, many statements per line, one-letter vars (`r`, `p`, `e`, `c`). When making small edits, match the surrounding style so the diff stays local. Do not reformat a whole file unless asked.
- Starter files (`scripts/`, `build/`, `vite.config.ts`, `components/ui/`) use normal Prettier-style formatting.
- Imports use the `@/` alias for the project root.
- TypeScript `strict` is on.

## Known quirks / gotchas

- Initial state hardcodes `month='2026-10'` and `date='2026-10-03'`; the mount effect replaces them with today's Dhaka date.
- `tracker.tsx` lines are thousands of characters long. Read it in full (it is only ~50 lines) and use precise `Edit` old_strings; grep with `-o` to locate fragments.
- README's local-setup note says a fresh checkout needs a local Wrangler config; that is `.sites-runtime/local.json`, which is gitignored.
- Deployment: registered as a private OpenAI Site but never published. Production needs the D1 migrations applied.
- Inside `.expense-dialog`, the generic `input` rule overrides `sr-only`; hidden inputs there need a more specific rule (see `.backup-option input[type=file]`).
- A Vite `Failed to load url ./x.css ... Does the file exist?` after adding an import means the import landed before the file; `touch` the importing file.
- If the browser reports `module ... does not provide an export named X` after a file was rewritten, the Vite dev cache is stale: restart `npm run dev` (stop the Node process listening on 5173, not just the shell task).
- Route handlers are written as `mutate(request,method)` where `method` is the HTTP verb. Never destructure a field named `method` (the expense payment method) in that scope; alias it (`method:paidWith`).
- When scripting edits with Python, use raw strings (or a quoted heredoc) for regex text; `"\x00"` in a normal string writes a real NUL byte into the source.
- In UI tests, wait for a row of your seeded data (not just a panel) before interacting: Overview panels render before `load()` finishes.
- Playwright MCP's `run_code` sandbox has no `require` or `Buffer`; read downloads with `download.createReadStream()` and upload files by path from `.playwright-mcp/`.
- Org policy: do not use em-dashes in written text.
