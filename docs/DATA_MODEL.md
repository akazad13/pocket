# Pocket Data Model & Persistence Guide

Comprehensive database schema documentation, data invariants, and migration protocols for Pocket.

---

## 1. Storage Engine & Technology

Pocket uses **Cloudflare D1** (serverless SQLite at the edge) in production and the Cloudflare Wrangler emulator (`.wrangler/state`) in local development.

- **Primary Schema Definition**: [db/schema.ts](file:///d:/Practice/Projects/Financial/pocket/db/schema.ts) (Drizzle ORM syntax used for migration generation).
- **Runtime Access**: Raw prepared statements via `database()` in [lib/database.ts](file:///d:/Practice/Projects/Financial/pocket/lib/database.ts).
- **Migration Files**: [drizzle/](file:///d:/Practice/Projects/Financial/pocket/drizzle/) containing versioned SQL scripts `0000_*.sql` through `0013_*.sql`.

---

## 2. Relational Schema & Tables

### 2.1 Core Transactions & Spending

#### `expenses`
Stores individual expense records.
```sql
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,           -- Client-generated UUID (^[a-zA-Z0-9-]{1,64}$)
  category TEXT NOT NULL,        -- Category display name (matches custom_categories.name)
  cents INTEGER NOT NULL,        -- Amount in integer cents (BDT)
  date TEXT NOT NULL,            -- Calendar date 'YYYY-MM-DD' (>= 1900-01-01)
  note TEXT NOT NULL DEFAULT '', -- Optional note (trimmed, max 200 chars)
  method TEXT NOT NULL DEFAULT '',-- Payment method ('Cash', 'bKash', 'Card', etc.)
  account TEXT NOT NULL DEFAULT ''-- Optional linked account id ('' = unlinked)
);
```

#### `income`
Stores money coming in. Operates independently of expense categories.
```sql
CREATE TABLE income (
  id TEXT PRIMARY KEY,           -- Client-generated UUID
  source TEXT NOT NULL,          -- Income source (e.g. 'Salary', 'Dividend')
  cents INTEGER NOT NULL,        -- Amount in integer cents (> 0)
  date TEXT NOT NULL,            -- Calendar date 'YYYY-MM-DD'
  note TEXT NOT NULL DEFAULT '', -- Optional note
  account TEXT NOT NULL DEFAULT ''-- Optional linked account id ('' = unlinked)
);
```

### 2.2 Classification & Budgets

#### `custom_categories`
Stores category configuration, custom swatch colors, and icon choices.
```sql
CREATE TABLE custom_categories (
  key TEXT PRIMARY KEY,          -- Lowercase unique name: lower(name)
  name TEXT NOT NULL,            -- Display name (1-50 characters)
  color TEXT NOT NULL DEFAULT '',-- Hex code from PALETTE in lib/category-style.ts
  icon TEXT NOT NULL DEFAULT ''  -- Lucide icon name from ICONS in lib/category-style.ts
);
```

#### `budgets`
Stores monthly budget allocations per category.
```sql
CREATE TABLE budgets (
  category TEXT PRIMARY KEY,     -- Category display name
  cents INTEGER NOT NULL         -- Monthly target in integer cents
);
```

#### `app_state`
Flag table for one-time initialization triggers.
```sql
CREATE TABLE app_state (
  key TEXT PRIMARY KEY           -- e.g. 'categories_initialized'
);
```

### 2.3 Accounts, Net Worth & Transfers

#### `accounts`
Stores financial accounts, savings instruments, debts, and physical assets.
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,           -- Unique identifier (UUID)
  name TEXT NOT NULL,            -- Account display name (case-insensitively unique)
  type TEXT NOT NULL,            -- Member of ACCOUNT_TYPES in lib/accounts.ts
  opening INTEGER NOT NULL,      -- Starting balance in cents (or initial debt amount)
  note TEXT NOT NULL DEFAULT '', -- Account description or memo
  closed INTEGER NOT NULL DEFAULT 0, -- 1 = closed (hidden from pickers), 0 = active
  start_date TEXT NOT NULL DEFAULT '',-- Optional opening date 'YYYY-MM-DD'
  maturity_date TEXT NOT NULL DEFAULT '',-- Optional maturity date 'YYYY-MM-DD'
  rate INTEGER NOT NULL DEFAULT 0,   -- Annual interest rate in basis points (e.g. 850 = 8.50%)
  instalment INTEGER NOT NULL DEFAULT 0,-- Monthly payment/instalment in cents
  quantity INTEGER NOT NULL DEFAULT 0,  -- Quantity in thousandths (e.g. 1500 = 1.500)
  unit TEXT NOT NULL DEFAULT ''      -- Unit of measure ('vori', 'gram', 'katha', 'decimal', etc.)
);
```

*Supported `type` values:*
- **Liquid Assets**: `cash`, `bank`, `wallet`
- **Savings & Fixed Income**: `dps`, `fd`, `sanchayapatra`
- **Investments**: `shares`, `mutual_fund`
- **Physical Assets**: `gold`, `property`
- **Lending**: `loan_given`
- **Debts / Liabilities**: `loan_taken`, `credit_card`
- **Other**: `other`

#### `transfers`
Represents movement of funds between two accounts (e.g. Bank to Cash, Bank to DPS).
```sql
CREATE TABLE transfers (
  id TEXT PRIMARY KEY,
  from_account TEXT NOT NULL,    -- Source account ID
  to_account TEXT NOT NULL,      -- Destination account ID
  cents INTEGER NOT NULL,        -- Amount moved (> 0)
  date TEXT NOT NULL,            -- Date 'YYYY-MM-DD'
  note TEXT NOT NULL DEFAULT ''
);
```

#### `adjustments`
Signed balance updates to account for market gains, interest, profit, or fee adjustments.
```sql
CREATE TABLE adjustments (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,         -- Target account ID
  cents INTEGER NOT NULL,        -- Signed value difference (positive or negative)
  date TEXT NOT NULL,            -- Date 'YYYY-MM-DD'
  note TEXT NOT NULL DEFAULT ''
);
```

### 2.4 Planning, Automation & Obligations

#### `bills`
Monthly recurring bills paid manually (utilities, credit card dues, internet).
```sql
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,            -- Bill name (e.g. 'DESCO Electricity')
  category TEXT NOT NULL,        -- Associated category display name
  cents INTEGER NOT NULL DEFAULT 0,-- Usual amount in cents (0 = "Varies")
  day INTEGER NOT NULL,          -- Due day of the month (1-31)
  account TEXT NOT NULL DEFAULT '',-- Default account to pay from
  note TEXT NOT NULL DEFAULT '',
  paid_month TEXT NOT NULL DEFAULT ''-- 'YYYY-MM' of last payment (or '')
);
```

#### `goals`
Target savings goals with progress tracking against linked accounts.
```sql
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target INTEGER NOT NULL,       -- Target amount in cents (> 0)
  target_date TEXT NOT NULL DEFAULT '',-- Optional completion deadline 'YYYY-MM-DD'
  accounts TEXT NOT NULL DEFAULT '[]',-- JSON array of linked account IDs
  saved INTEGER NOT NULL DEFAULT 0,  -- Manual saved amount if no accounts linked
  note TEXT NOT NULL DEFAULT ''
);
```

#### `recurring`
Automated monthly rules that generate transactions on schedule.
```sql
CREATE TABLE recurring (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,            -- 'expense' | 'income' | 'transfer'
  category TEXT NOT NULL DEFAULT '',-- Category for expense rules
  source TEXT NOT NULL DEFAULT '',  -- Source for income rules
  account TEXT NOT NULL DEFAULT '', -- Linked account / from_account
  to_account TEXT NOT NULL DEFAULT '',-- Destination account for transfers
  cents INTEGER NOT NULL,        -- Amount in cents (> 0)
  day INTEGER NOT NULL,          -- Day of month (1-31)
  note TEXT NOT NULL DEFAULT '',
  start_month TEXT NOT NULL,     -- Starting month 'YYYY-MM'
  last_month TEXT                -- Last month generated 'YYYY-MM' (nullable)
);
```

---

## 3. Data Integrity & Business Invariants

### 3.1 Integer Cents (Never Floating Point)
All monetary values are strictly represented as **integer cents**:
- User input (e.g. `"150.50"`) is validated via regex `^\d{1,9}(\.\d{1,2})?$` and converted: `Math.round(amount * 100)`.
- UI formatting uses `money(cents)` via `Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' })`.
- Floating point calculations are prohibited in storage and business logic to prevent rounding drift.

### 3.2 Category Display Name Cascades
The system stores category **display names** (not synthetic IDs or keys) across `expenses`, `budgets`, `bills`, and `recurring`.
- When a category is renamed: Every occurrence across all 4 tables must be updated in a single atomic `db.batch(...)` statement.
- When two categories are merged: All expenses and rules are updated to the target category, and the source is deleted in a single batch.
- Category deletion rule: A category that contains expenses or is referenced by a recurring rule **cannot be deleted** (returns HTTP 409 Conflict).

### 3.3 Dynamic Balance Calculation (`values()` vs `shown()`)
Account balances are **computed on the fly**, never stored as static balance columns:
$$\text{Balance} = \pm \text{opening} + \text{income} - \text{expenses} + \text{transfers}_{\text{in}} - \text{transfers}_{\text{out}} + \text{adjustments}$$

- **`values(accounts, income, expenses, transfers, adjustments)`**: Internal calculation for net worth. Debts (`loan_taken`, `credit_card`) are computed as negative numbers.
- **`shown(type, balance)`**: User-facing balance. Debts are inverted and displayed as a positive "Amount Owed".
- **Delete Protection**: Accounts with any linked historical transaction cannot be deleted (returns HTTP 409 Conflict). They can only be closed via `closed = 1`.

### 3.4 Deterministic Lazy Recurring Generation
Recurring rule execution is lazy and non-blocking:
1. `GET /api/expenses`, `GET /api/income`, and `GET /api/accounts` call `applyRecurring()` before fetching data.
2. Missing months between `start_month` and today (in `Asia/Dhaka`) are computed.
3. Generated records have deterministic IDs: `rec-<ruleId>-<YYYY-MM>`.
4. Inserting uses `ON CONFLICT DO NOTHING` to guarantee idempotency.
5. `recurring.last_month` is advanced. If a user deletes a generated transaction, it is not recreated because `last_month` already includes that period.

---

## 4. D1 Execution Constraints & Bulk Writes

Cloudflare D1 enforces strict resource limits:
- **Parameter Bound Limit**: Maximum 100 bound parameters per query.
- **Query Execution Limit**: Maximum 50 queries per request on free tier.

**Pattern for Bulk Inserts (e.g. Database Restore)**:
Do not execute 5,000 separate `INSERT` statements. Use `json_each(?)` with JSON payload chunks:
```typescript
const stmt = db.prepare(`
  INSERT INTO expenses (id, category, cents, date, note, method, account)
  SELECT value->>'id', value->>'category', CAST(value->>'cents' AS INTEGER),
         value->>'date', value->>'note', value->>'method', value->>'account'
  FROM json_each(?)
`);
```
See [lib/database.ts](file:///d:/Practice/Projects/Financial/pocket/lib/database.ts) `jsonChunks()` for implementation.

---

## 5. Safe Schema Migration Playbook

> [!CAUTION]
> **CRITICAL DATABASE SAFETY DIRECTIVE**:
> The local `.wrangler/state` SQLite file holds the developer's live financial data. Never wipe, drop, or run unverified destructive statements against it.

Follow this exact 5-step sequence whenever changing the database schema:

### Step 1: Create an External Backup
Always copy the entire state directory to `pocket-db-backups/` outside the repository:
```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "..\pocket-db-backups\$timestamp-before-schema-change"
New-Item -ItemType Directory -Path $backupDir -Force
Copy-Item -Path ".wrangler\state" -Destination $backupDir -Recurse
```

### Step 2: Edit Schema Definition
Modify table schemas in [db/schema.ts](file:///d:/Practice/Projects/Financial/pocket/db/schema.ts).

### Step 3: Generate Migration SQL
Run Drizzle Kit to create the next migration script:
```powershell
npm run db:generate
```
This produces `drizzle/000N_<name>.sql` and updates `drizzle/meta/`.

### Step 4: Apply Migration Locally
Execute the migration against the local D1 emulator using the local runtime configuration:
```powershell
npx wrangler d1 execute DB --local --persist-to .wrangler/state --file drizzle/000N_<name>.sql --config .sites-runtime/local.json
```

### Step 5: Update Raw Queries and Types
1. Update raw SQL strings in route handlers (`app/api/*/route.ts`) and server helpers (`lib/account-db.ts`).
2. Update TypeScript interfaces and validation functions in `lib/`.
3. Verify with `npm run typecheck` and `npm run test:unit`.
