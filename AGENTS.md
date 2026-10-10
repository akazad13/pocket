# AGENTS.md - Instructions for Autonomous AI Agents

> **Project**: Pocket Expense Tracker & Personal Finance System  
> **Environment**: Windows, Node.js `>=22.13` (Node `v22.13.1` installed)  
> **Currency**: Bangladeshi Taka (BDT) | **Timezone**: `Asia/Dhaka`  
> **Runtime**: Next.js 16 App Router on Vinext (Vite) / Cloudflare Worker / D1 SQLite  

---

## 1. Prime Directives & Ironclad Safety Guardrails

1. **LIVE USER DATABASE IN DEV**:
   - The local database at [`.wrangler/state`](file:///d:/Practice/Projects/Financial/pocket/.wrangler/state) contains the owner's **real personal financial data** (the application is not deployed).
   - **NEVER** run destructive SQL, reset, or delete `.wrangler/state`.
   - **MANDATORY BACKUP BEFORE SCHEMA MIGRATIONS**: Copy `.wrangler/state` to `../pocket-db-backups/<timestamp>-<reason>/` before running D1 migrations or batch scripts.
2. **DEPENDENCY INSTALLATION**:
   - **NEVER** run plain `npm install` (it rewrites `package-lock.json`).
   - **ALWAYS** run `npm run install:ci` (executes `scripts/install-ci.mjs` safely).
3. **CURRENCY INVARIANTS**:
   - Store and compute all money as **integer cents**. Never use floating point numbers for currency.
   - Format with `money()` from [lib/format.ts](file:///d:/Practice/Projects/Financial/pocket/lib/format.ts).
4. **STYLING & DARK THEME SYNCHRONIZATION**:
   - Styling uses plain classes in [app/pocket.css](file:///d:/Practice/Projects/Financial/pocket/app/pocket.css).
   - **Every single new class** with a background, color, or border **MUST** have an equivalent dark mode rule in [app/pocket-dark.css](file:///d:/Practice/Projects/Financial/pocket/app/pocket-dark.css) under `html[data-theme=dark]`.
5. **CODE STYLE CONSERVATION**:
   - Code in `app/` and `lib/` uses a **dense, compact style**. Preserve local formatting. Do not reformat entire files.
   - Files in `build/`, `scripts/`, `vendor/`, `components/ui/`, and `vite.config.ts` are **starter plumbing: DO NOT TOUCH**.

---

## 2. Agent Documentation Suite

For detailed engineering deep-dives, consult these companion guides:

- [docs/ARCHITECTURE.md](file:///d:/Practice/Projects/Financial/pocket/docs/ARCHITECTURE.md): Runtime stack, request lifecycle, component boundaries, and security model.
- [docs/DATA_MODEL.md](file:///d:/Practice/Projects/Financial/pocket/docs/DATA_MODEL.md): Complete schema for all 9 tables, invariants, computed balances, and migration steps.
- [docs/AGENT_PLAYBOOK.md](file:///d:/Practice/Projects/Financial/pocket/docs/AGENT_PLAYBOOK.md): Step-by-step SOPs, 10 deadly agent traps, and implementation recipes.
- [docs/TESTING.md](file:///d:/Practice/Projects/Financial/pocket/docs/TESTING.md): Typecheck, unit test suites, API smoke tests, and UI verification.
- [docs/FEATURES.md](file:///d:/Practice/Projects/Financial/pocket/docs/FEATURES.md): Full feature status and roadmap backlog.

---

## 3. Standard Verification Commands

Execute these commands from `d:\Practice\Projects\Financial\pocket`:

| Task | Command | Description / Notes |
|---|---|---|
| **Install** | `npm run install:ci` | Deterministic clean install. Never run `npm install`. |
| **Dev Server** | `npm run dev` | Starts Vite dev server on `http://127.0.0.1:5173/`. |
| **Typecheck** | `npm run typecheck` | Primary static verification (~10s). Must exit with code 0. |
| **Unit Tests** | `npm run test:unit` | Pure logic tests in `tests/unit/*.test.ts` (~1s, 65+ assertions). |
| **Smoke Tests** | `npm run smoke` | 164 API checks against running dev server. Run after any API change. |
| **Lint** | `npm run lint` | ESLint check (~60s). Keep clean with 0 errors. |
| **Build** | `npm run build` | Produces production Worker & client build in `dist/`. |
| **Migrations** | `npm run db:generate` | Generates Drizzle SQL migrations after editing `db/schema.ts`. |

---

## 4. Codebase Navigation (What to Touch)

### 4.1 UI Components (`app/`)
- [app/tracker.tsx](file:///d:/Practice/Projects/Financial/pocket/app/tracker.tsx): Root state container, primary tabs, and global action dialogs.
- [app/accounts.tsx](file:///d:/Practice/Projects/Financial/pocket/app/accounts.tsx): Accounts list, net worth, transfer dialog, balance adjustment.
- [app/activity.tsx](file:///d:/Practice/Projects/Financial/pocket/app/activity.tsx): Unified spending, income, and transfers list (Transactions tab).
- [app/bills.tsx](file:///d:/Practice/Projects/Financial/pocket/app/bills.tsx): Monthly bills panel and payment actions.
- [app/budgets.tsx](file:///d:/Practice/Projects/Financial/pocket/app/budgets.tsx): Monthly category budgets and progress.
- [app/goals.tsx](file:///d:/Practice/Projects/Financial/pocket/app/goals.tsx): Savings goals panel and progress tracking.
- [app/income.tsx](file:///d:/Practice/Projects/Financial/pocket/app/income.tsx): Income panel and entry dialogs.
- [app/networth.tsx](file:///d:/Practice/Projects/Financial/pocket/app/networth.tsx): 12-month net worth line chart (SVG) and data table.
- [app/recurring.tsx](file:///d:/Practice/Projects/Financial/pocket/app/recurring.tsx): Recurring rules management (expenses, income, transfers).
- [app/taxyear.tsx](file:///d:/Practice/Projects/Financial/pocket/app/taxyear.tsx): Bangladesh tax year (July-June) reports and CSV export.
- [app/upcoming.tsx](file:///d:/Practice/Projects/Financial/pocket/app/upcoming.tsx): Next 30 days financial projection panel.
- [app/zakat.tsx](file:///d:/Practice/Projects/Financial/pocket/app/zakat.tsx): Zakat calculation modal.
- [app/pocket.css](file:///d:/Practice/Projects/Financial/pocket/app/pocket.css): Base styles and light mode tokens.
- [app/pocket-dark.css](file:///d:/Practice/Projects/Financial/pocket/app/pocket-dark.css): Dark theme mirrors (`html[data-theme=dark]`).

### 4.2 API Routes (`app/api/`)
- `app/api/expenses/route.ts`: Expense CRUD.
- `app/api/income/route.ts`: Income CRUD.
- `app/api/categories/route.ts`: Category list, add, rename cascade, delete.
- `app/api/categories/merge/route.ts`: Atomic category merge.
- `app/api/accounts/route.ts`: Account CRUD and balance retrieval.
- `app/api/accounts/transfers/route.ts`: Transfer operations.
- `app/api/accounts/adjustments/route.ts`: Signed balance adjustments.
- `app/api/bills/route.ts`: Bills tracking and payments.
- `app/api/goals/route.ts`: Savings goals management.
- `app/api/recurring/route.ts`: Recurring transaction rules.
- `app/api/backup/route.ts`: JSON export and merge-only restore.

### 4.3 Pure Logic Modules (`lib/`)
- [lib/accounts.ts](file:///d:/Practice/Projects/Financial/pocket/lib/accounts.ts): Account calculations, `values()` vs `shown()`.
- [lib/format.ts](file:///d:/Practice/Projects/Financial/pocket/lib/format.ts): BDT currency formatting and privacy masking.
- [lib/rules.ts](file:///d:/Practice/Projects/Financial/pocket/lib/rules.ts): Recurring generation calendar calculations.
- [lib/terms.ts](file:///d:/Practice/Projects/Financial/pocket/lib/terms.ts): DPS compounding, FD interest, loan EMI calculations.
- [lib/activity.ts](file:///d:/Practice/Projects/Financial/pocket/lib/activity.ts): Merged activity ledger sorting and filtering.
- [lib/forecast.ts](file:///d:/Practice/Projects/Financial/pocket/lib/forecast.ts): 30-day projection engine.
- [lib/zakat.ts](file:///d:/Practice/Projects/Financial/pocket/lib/zakat.ts): Zakat net asset and nisab math.

### 4.4 Server-Only Modules (Edge Runtime)
- [lib/database.ts](file:///d:/Practice/Projects/Financial/pocket/lib/database.ts): D1 database accessor (`database()`) and chunked inserts.
- [lib/account-db.ts](file:///d:/Practice/Projects/Financial/pocket/lib/account-db.ts): Server-only SQL helpers for accounts.
- [lib/recurring.ts](file:///d:/Practice/Projects/Financial/pocket/lib/recurring.ts): Lazy recurring occurrence generator (`applyRecurring()`).

---

## 5. Agent Verification Checklist

Before finishing any task, the agent must check off:
- [ ] `npm run typecheck` passed cleanly.
- [ ] `npm run test:unit` passed with 100% test success.
- [ ] If API or database queries were modified: `npm run smoke` passed against dev server.
- [ ] If CSS or layout was altered: verified in light mode AND dark mode, desktop AND 390px mobile viewport.
- [ ] If a feature was implemented: updated [docs/FEATURES.md](file:///d:/Practice/Projects/Financial/pocket/docs/FEATURES.md).
- [ ] No temporary files or test artifacts left in `.wrangler/` or repository.
