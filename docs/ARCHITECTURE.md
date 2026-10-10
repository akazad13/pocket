# Pocket Architecture

System architecture and topology documentation for Pocket, designed for human developers and autonomous AI agents.

---

## 1. System Overview

Pocket is a single-user, mobile-first personal financial management application designed for Bangladesh (BDT currency, `Asia/Dhaka` timezone). It does not connect to external bank APIs; all financial entries, accounts, and budgets are entered manually or generated via deterministic recurring rules.

```
+-----------------------------------------------------------------------+
|                             Client Layer                              |
|   React 19 (App Router) + Radix UI / shadcn + Sonner + Lucide Icons   |
|   Single State Root (`tracker.tsx`) + Optimistic Mutation Updates     |
|   CSS Design Tokens (`pocket.css`) + Dark Mode (`pocket-dark.css`)    |
+-----------------------------------------------------------------------+
                                   |
                   JSON API Requests (/api/*) [with Origin Check]
                                   v
+-----------------------------------------------------------------------+
|                          Server Runtime Layer                         |
|   Vinext (Vite-based Next runtime) on Cloudflare Workers              |
|   Edge API Route Handlers (`app/api/*/route.ts`)                      |
+-----------------------------------------------------------------------+
                                   |
            Raw Prepared Statements (`lib/database.ts`) with ? binds
                                   v
+-----------------------------------------------------------------------+
|                           Persistence Layer                           |
|   Cloudflare D1 (SQLite)                                              |
|   Local Dev: Persisted SQLite in `.wrangler/state`                    |
|   Schema Migrations: Drizzle ORM (`db/schema.ts`, `drizzle/*.sql`)     |
+-----------------------------------------------------------------------+
```

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose / Notes |
|---|---|---|---|
| **Runtime** | Node.js | `>=22.13` (tested on v22.13.1) | Required for `--experimental-strip-types` and package compat |
| **Framework** | Next.js (App Router) | `16.3.4` | App routing & React 19 SSR |
| **Dev / Build Engine** | Vinext + Vite | `1.0.0-beta.5` / `8.0.13` | Vite-based Next runtime compiling to Cloudflare Worker |
| **Hosting Target** | Cloudflare Workers | Edge runtime | Private site deployment (see [docs/AGENT_PLAYBOOK.md](file:///d:/Practice/Projects/Financial/pocket/docs/AGENT_PLAYBOOK.md)) |
| **Database** | Cloudflare D1 (SQLite) | Edge SQLite | Local development persists to `.wrangler/state` |
| **ORM / Migration** | Drizzle ORM + Drizzle Kit | `0.45.2` / `0.31.10` | Schema definitions (`db/schema.ts`) and migration generation |
| **UI Components** | Radix UI / shadcn | React 19 compatible | Headless primitives with custom classes in `components/ui` |
| **CSS & Design System** | Tailwind v4 + Custom CSS | `@tailwindcss/postcss 4.2.1` | Design tokens in `pocket.css` & `pocket-dark.css` (plain classes) |
| **Testing** | Node test runner (`node:test`) | Native Node | Pure unit tests in `tests/unit/*.test.ts` (~1s) |
| **API Verification** | Custom Node Fetch Script | `tests/smoke.mjs` | Comprehensive 164-step API smoke test suite |

---

## 3. Directory Structure & Module Boundaries

The project strictly separates **application logic** (safe for agents to edit) from **starter plumbing** (do not edit).

### 3.1 Application Code (Safe to Edit)

Agents may read and modify these files to implement features or fix bugs:

```
pocket/
├── app/
│   ├── page.tsx               # Re-exports tracker
│   ├── layout.tsx             # Root HTML layout, metadata, styles
│   ├── tracker.tsx            # Main state container, tabs, modals, quick-actions
│   ├── accounts.tsx           # Accounts tab: list, net worth, detail dialogs
│   ├── activity.tsx           # Transactions tab: unified spending, income & transfers
│   ├── backup.tsx             # Backup & restore dialog (JSON / CSV)
│   ├── bills.tsx              # Monthly recurring bills panel
│   ├── budgets.tsx            # Budgets panel & category limits
│   ├── category-icon.tsx      # Lucide icon mapping for categories
│   ├── comparison.tsx         # Month-over-month comparison card & panel
│   ├── goals.tsx              # Savings goals panel and progress
│   ├── income.tsx             # Income panel and entry dialog
│   ├── networth.tsx           # Net worth over time SVG chart and table
│   ├── privacy.tsx            # Privacy masking toggle (`pocket-private`)
│   ├── recurring.tsx          # Monthly recurring rules dialog (expense/income/transfer)
│   ├── taxyear.tsx            # Bangladesh tax year (July-June) reports
│   ├── theme.tsx              # Dark/light theme toggle
│   ├── upcoming.tsx           # Next 30 days financial forecast panel
│   ├── yearly.tsx             # Year-in-review summary panels
│   ├── zakat.tsx              # Zakat calculation dialog (nisab, gold/silver)
│   ├── pocket.css             # Main styling, responsive breakpoints, light tokens
│   ├── pocket-dark.css        # Complete dark mode CSS overrides
│   └── api/                   # Edge route handlers (GET, POST, PUT, DELETE)
│       ├── accounts/          # Account CRUD, transfers, and balance adjustments
│       ├── backup/            # Full JSON backup & merge-restore
│       ├── bills/             # Bills tracking and payments
│       ├── budgets/           # Monthly category budgets
│       ├── categories/        # Category management, styles, and merging
│       ├── expenses/          # Expense CRUD
│       ├── goals/             # Savings goals CRUD
│       ├── income/            # Income CRUD
│       └── recurring/         # Recurring rules CRUD
├── lib/                       # Business logic and server helpers
│   ├── database.ts            # Server-only: raw D1 database access (`database()`)
│   ├── account-db.ts          # Server-only: Account SQL queries & existence checks
│   ├── recurring.ts           # Server-only: Recurring generator (`applyRecurring()`)
│   ├── format.ts              # BDT currency formatter (`money()`) with privacy masking
│   ├── expenses.ts            # Pure validation, types, default categories
│   ├── accounts.ts            # Pure: balance calculations (`values()`, `shown()`)
│   ├── activity.ts            # Pure: merge & sort expenses, income, transfers
│   ├── bills.ts               # Pure: bill status & sorting
│   ├── compare.ts             # Pure: month-over-month calculation
│   ├── forecast.ts            # Pure: 30-day projection
│   ├── goals.ts               # Pure: goal progress against linked accounts
│   ├── months.ts              # Pure: month rolling and date clamping
│   ├── networth.ts            # Pure: historical net worth time-series
│   ├── quick.ts               # Pure: quick-add suggestions by frequency
│   ├── rules.ts               # Pure: recurring rules scheduling logic
│   ├── taxyear.ts             # Pure: Bangladesh tax year calculations
│   ├── terms.ts               # Pure: DPS/FD/Sanchayapatra maturity, EMI splits
│   └── zakat.ts               # Pure: Zakat calculator logic
├── db/
│   └── schema.ts              # Drizzle ORM table definitions (source of truth for migrations)
├── drizzle/                   # Generated SQL migrations (0000_*.sql, meta)
├── tests/
│   ├── smoke.mjs              # 164-test API smoke suite against running dev server
│   └── unit/                  # Node unit tests for pure lib/ modules
└── docs/                      # Architectural, feature, data, and agent docs
```

### 3.2 Starter Plumbing (DO NOT TOUCH)

Agents **MUST NOT** edit these files unless specifically instructed:
- `build/`
- `scripts/` (except when reviewing environment setup)
- `vendor/`
- `lib/connector*`
- `app/chatgpt-auth.ts` (unused scaffold)
- `db/index.ts` (unused Drizzle client scaffold)
- `examples/`
- `components/ui/*` (vendored shadcn primitives; re-generate if needed)
- `.openai/hosting.json` (contains private project ID)
- `vite.config.ts`

### 3.3 Generated & Transient Directories (NEVER EDIT OR SEARCH)

- `dist/`
- `.next/`
- `.vinext/`
- `.wrangler/`
- `.sites-runtime/`
- `node_modules/`
- `package-lock.json`

---

## 4. Key Architectural Patterns

### 4.1 Client-Safe vs Server-Only Isolation

- **Server-Only Modules**: `lib/database.ts`, `lib/account-db.ts`, and `lib/recurring.ts` import from `cloudflare:workers` or access `env.DB`. They must never be imported into client components (`"use client"`).
- **Client-Safe Modules**: Pure helpers in `lib/*.ts` (such as `lib/months.ts`, `lib/format.ts`, `lib/accounts.ts`) must remain dependency-free so they can be bundled into client components and executed in Node unit tests.
- **Rule**: If a client component needs types from a server module, use `import type { ... }` exclusively.

### 4.2 Data Access: Raw D1 Prepared Statements

Pocket does **not** use Drizzle's runtime query builder. It uses Drizzle solely for schema definitions (`db/schema.ts`) and migration generation (`drizzle-kit generate`).

At runtime, all database queries use raw D1 prepared statements:
```typescript
const db = database();
const stmt = db.prepare('SELECT id, category, cents, date, note FROM expenses WHERE date LIKE ? ORDER BY date DESC').bind(`${month}-%`);
const { results } = await stmt.all<ExpenseRow>();
```
- **Invariants**:
  1. Always use `?` placeholders with `.bind(...)`. Never interpolate strings into SQL.
  2. For bulk inserts, use `json_each(?)` with chunks of ~500KB to stay within D1's 100-parameter and 50-query execution limits.

### 4.3 State Management & Optimistic Updates

1. **Central State Container**: `app/tracker.tsx` maintains state for all active tabs, current viewed month, active filters, and open dialogs.
2. **Dialog Mounting Keys**: Dialogs such as `IncomeDialog` and `TransferDialog` are remounted with a fresh `key` whenever opened (`key={editId ?? 'new'}`). This allows form inputs to initialize cleanly from props without synchronization `useEffect`s.
3. **Optimistic Updates**: API responses return the modified/created entity. The client updates local React state immediately using the API response rather than refetching the entire dataset.

### 4.4 Styling and Design Tokens

Pocket uses a tailored design system:
- **Plain CSS Classes**: Styling is organized in `app/pocket.css` rather than inline utility classes.
- **Dark Mode Mirroring**: Every new class that introduces a `background`, `color`, or `border` must have a corresponding rule inside `app/pocket-dark.css` targeting `html[data-theme=dark]`.
- **CSS Variables (2026 Refresh Layer)**:
  - `--ink`, `--ink-2`, `--ink-3`: Text hierarchy.
  - `--paper`, `--card`: Backgrounds.
  - `--line`: Borders and dividers.
  - `--green` (`#006a4e`), `--green-deep`, `--mint`: Positive flows and brand identity.
  - `--red` (`#d63a44`): Overdue bills and debts only.
  - `--display`: Bricolage Grotesque (headings, card titles, monetary numbers).
  - `--text`: Hind Siliguri (body copy).
- **Tabular Numerics**: All monetary displays use `font-family: var(--display); font-variant-numeric: tabular-nums;`.

### 4.5 Privacy Mode Architecture

Pocket includes a privacy shield for public spaces:
- Managed via `app/privacy.tsx` (`usePrivacy()` hook backed by `localStorage.getItem('pocket-private')`).
- Masks all outputs from `money()` in `lib/format.ts` with asterisks (`***`).
- Sets `html[data-private]` attribute on the root element.
- Any unformatted numeric elements must be styled with CSS blur under `html[data-private]`.

---

## 5. Security & Isolation Invariants

1. **Single-Owner Trust Boundary**: Pocket is designed for a single user behind a hosting access gate. There is no multi-tenant isolation or per-user authentication. Do not add multi-tenant features without adding proper auth middleware.
2. **Cross-Origin Request Forgery Protection**: Every mutation route handler (`POST`, `PUT`, `DELETE`) verifies the `Origin` header. If the origin does not match the request URL, the server responds immediately with `403 Forbidden`.
3. **Database Protection**: Local development uses `.wrangler/state`. Because this database contains the owner's live personal financial records, destructive resets are strictly prohibited without an external backup.
