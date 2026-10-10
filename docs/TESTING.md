# Pocket Testing & Verification Guide

Comprehensive guide to testing, regression prevention, and validation gates in Pocket.

---

## 1. Testing Philosophy & Verification Pyramid

Pocket employs a multi-tiered verification strategy designed for rapid agent feedback and zero regressions:

```
                  +--------------------------------+
                  |     Browser / Visual UI        |
                  |  Playwright MCP / 390px Mobile |
                  |  Theme & Privacy Mode Check    |
                  +--------------------------------+
                                  |
                  +--------------------------------+
                  |       API Smoke Tests          |
                  |   tests/smoke.mjs (164 tests)  |
                  |   CRUD, cascade, origin, HTTP  |
                  +--------------------------------+
                                  |
                  +--------------------------------+
                  |       Pure Unit Tests          |
                  |    tests/unit/*.test.ts        |
                  |    node:test (~1 second)       |
                  +--------------------------------+
                                  |
                  +--------------------------------+
                  |      Static Typecheck          |
                  |    tsc --noEmit (~10s)         |
                  +--------------------------------+
```

---

## 2. Tier 1: Static Typecheck (`npm run typecheck`)

- **Command**: `npm run typecheck`
- **Underlying tool**: TypeScript 5.9 with `strict: true` and `--noEmit --incremental false`.
- **Duration**: ~10 seconds.
- **Rule**: Must exit with code 0. Any type warning or error must be resolved before proceeding.

---

## 3. Tier 2: Pure Unit Tests (`npm run test:unit`)

### 3.1 Overview
- **Command**: `npm run test:unit`
- **Runner**: Native Node.js test runner (`node:test`) using `--experimental-strip-types`.
- **Location**: [tests/unit/](file:///d:/Practice/Projects/Financial/pocket/tests/unit/)
- **Duration**: ~1 second for 65+ tests across 16 suites.
- **Scope**: Pure logic in [lib/](file:///d:/Practice/Projects/Financial/pocket/lib/) that does not import Cloudflare-specific edge modules.

### 3.2 Test Files Inventory

| Test Suite | Module Under Test | Key Assertions Covered |
|---|---|---|
| `accounts.test.ts` | `lib/accounts.ts` | Balance calculation, debt polarity, net worth totals |
| `activity.test.ts` | `lib/activity.ts` | Merging and sorting expenses, income, and transfers |
| `bills.test.ts` | `lib/bills.ts` | Overdue vs due soon status, payment markers |
| `compare.test.ts` | `lib/compare.ts` | Month-over-month differences and category shifts |
| `filter.test.ts` | `lib/filter.ts` | Filtering by category, text, date range, amount range |
| `forecast.test.ts` | `lib/forecast.ts` | 30-day projection from rules, bills, and maturities |
| `goals.test.ts` | `lib/goals.ts` | Savings progress against linked account balances |
| `months.test.ts` | `lib/months.ts` | Month rolls and date clamping (e.g. Feb 28/29) |
| `networth.test.ts` | `lib/networth.ts` | Historical monthly net worth time-series |
| `quick.test.ts` | `lib/quick.ts` | Frequency and recency ranking for quick-add chips |
| `rules.test.ts` | `lib/rules.ts` | Recurring rules schedules, due months, due rows |
| `taxyear.test.ts` | `lib/taxyear.ts` | Bangladesh tax year (1 July to 30 June) ranges & sums |
| `terms.test.ts` | `lib/terms.ts` | DPS compound math, FD simple interest, EMI schedules |
| `yearly.test.ts` | `lib/yearly.ts` | Year-in-review averages, rankings, top expenses |
| `zakat.test.ts` | `lib/zakat.ts` | Nisab calculations, asset filtering, 2.5% computation |

### 3.3 Writing a New Unit Test
All unit tests import with explicit `.ts` extensions:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { myFunction } from '@/lib/my-module.ts';

test('myFunction performs expected transformation', () => {
  const result = myFunction(100);
  assert.equal(result, 200);
});
```

---

## 4. Tier 3: API Smoke Test Suite (`npm run smoke`)

### 4.1 Overview
- **Command**: `npm run smoke`
- **Target**: Running local development server (`http://127.0.0.1:5173` or `$env:SMOKE_BASE_URL`).
- **File**: [tests/smoke.mjs](file:///d:/Practice/Projects/Financial/pocket/tests/smoke.mjs) (~40KB).
- **Assertions**: 164 end-to-end API checks verifying:
  - CRUD on expenses, income, transfers, accounts, bills, goals, recurring rules.
  - Category rename cascades across expenses, budgets, bills, and recurring rules.
  - Category merge batches.
  - Deletion rejection when expenses exist (409 Conflict).
  - Cross-origin rejection (403 Forbidden).
  - Negative amount rejection (400 Bad Request).
  - Backup generation and merge-restore validation.

### 4.2 Safe Test Data Management
The smoke test runs against the local database (`.wrangler/state`). To prevent corrupting real user records:
1. Every run generates a unique prefix: `const tag = "Smoke " + Date.now().toString(36)`.
2. All test entities use this prefix for names and IDs.
3. Every test cleans up its generated rows in a `finally` block or tear-down phase.
4. **Agent Requirement**: When adding new checks to `smoke.mjs`, always use the dynamic prefix and ensure complete tear-down.

### 4.3 Extending the Smoke Suite
When introducing a new API endpoint:
```javascript
// Example addition to tests/smoke.mjs:
let r = await call("POST", "/api/new-feature", { name: `${tag} feature` });
check("POST /api/new-feature creates item", r.status === 201 && r.json?.id, r);

// Test validation rejection:
r = await call("POST", "/api/new-feature", { name: "" });
check("POST /api/new-feature rejects empty name", r.status === 400 && r.json?.error, r);
```

---

## 5. Tier 4: Visual & UI Verification Checklist

For all frontend or visual changes, agents should verify:

- [ ] **Desktop Viewport**: Ensure layouts at `>=1180px` display cards, navigation, and tables properly without overflow.
- [ ] **Mobile Viewport (390px)**:
  - Verify bottom navigation bar (`.main-tabs`) does not obscure page content.
  - Verify floating Add button maintains proper clearance (`mobileOffset`).
  - Verify horizontal tables (e.g. Reports > Monthly table) scroll smoothly.
- [ ] **Dual-Theme Verification**:
  - Test Light Mode: default tokens in `pocket.css`.
  - Test Dark Mode: `html[data-theme=dark]` tokens in `pocket-dark.css`. Ensure no unstyled white flashes or unreadable contrast.
- [ ] **Privacy Mode Masking**:
  - Toggle privacy mode: Ensure all amounts render as `***`.
  - Ensure unformatted numbers are blurred via `html[data-private]` rules.
- [ ] **Console Hygiene**: Open browser developer console and confirm zero errors or hydration mismatches.
