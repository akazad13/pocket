# Pocket Expense Tracker & Personal Finance System

> A mobile-first, privacy-respecting personal finance manager in Bangladeshi Taka (BDT, `Asia/Dhaka`). Built with Next.js 16 (App Router), React 19, Tailwind CSS, and Cloudflare Workers with Cloudflare D1 (SQLite).

[![GitHub](https://img.shields.io/badge/GitHub-akazad13%2Fpocket-006a4e?style=flat&logo=github)](https://github.com/akazad13/pocket)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.13-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Runtime-Cloudflare%20Workers-F38020?style=flat&logo=cloudflare)](https://workers.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1%20SQLite-F38020?style=flat&logo=sqlite)](https://developers.cloudflare.com/d1/)

---

## Highlights & Features

- **Multi-User Authentication & Tenant Data Isolation**: Secure PBKDF2 SHA-256 password hashing with random cryptographic salts, session cookies (`POCKET_AUTH_SECRET`), user registration, and per-user isolated data tenancy.
- **Transactions & Virtualized Ledger**: Unified feed of expenses, income, and transfers. Windowed DOM virtualization with CSS `content-visibility: auto` ensures effortless 60fps scrolling and instant filtering across 10,000+ entries.
- **Split Expenses**: Break single receipts or bills across multiple categories with live remainder calculations and one-click atomic undo.
- **Spending Velocity & Burn-Rate Forecast**: Live daily burn rate, projected month-end spend vs. last month & budgets, and safe daily allowance indicators.
- **Financial Health & Wellness Score**: Composite 0–100 index evaluating savings rate, emergency runway, budget adherence, and debt ratio with an interactive gauge and recommendations.
- **Accounts & Dynamic Net Worth**: Cash, banks, mobile wallets, DPS, FD, mutual funds, Sanchayapatra, shares, gold, property, and loans. Dynamic on-the-fly balance computation and 12-month net worth progression chart.
- **Stock Portfolio Tracker**: Track equity holdings, average cost, current price, and unrealized gains/losses with quick-fill suggestions for DSE bluechips (GP, SQURPHARMA, BATBC, BRACBANK, etc.).
- **Bills & Due Dates**: Track recurring bills (electricity, gas, internet, cards) sorted by overdue, due soon (7 days), upcoming, and paid status.
- **Deterministic Recurring Transactions**: Lazy auto-generation of expenses, income, and transfers catching up missed months with deterministic IDs.
- **Savings Goals & Budgets**: Target amounts with target dates, linked accounts, progress indicators, and 6-month budget adherence trend analytics.
- **Hashtags & Tag Breakdown**: Automatic `#hashtag` extraction from notes (English and Bangla script) with instant filtering and tagged spending distribution reports.
- **Remittance & Incentive Helper**: Convert foreign currency payouts (USD, EUR, GBP, SAR, AED) to BDT with Bangladesh Government 2.5% cash incentive calculations.
- **Bangladesh Tax Year & Zakat**: July–June tax reports with CSV export, plus Zakat calculator supporting silver and gold nisab thresholds.
- **Privacy Mode & Dark Theme**: Privacy mask (`BDT ••••`) for public usage and system/light/dark themes with zero-flicker pre-render script.
- **Installable PWA**: Web App Manifest (`standalone`) and Service Worker caching static shell assets for native app experience.

---

## Quick Start (Run Locally)

### Prerequisites
- Node.js `>=22.13.0` (tested on `v22.13.1`).
- Windows, macOS, or Linux.

### Installation & Development
```bash
# 1. Clone repository
git clone https://github.com/akazad13/pocket.git
cd pocket

# 2. Install dependencies (deterministic clean install)
npm run install:ci

# 3. Start local development server
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) in your browser.

> [!NOTE]
> Local development persists SQLite data inside `.wrangler/state`.

---

## Production Deployment

Pocket deploys directly to **Cloudflare Workers** with **Cloudflare D1**:

1. **Create D1 Database**:
   ```bash
   npx wrangler d1 create pocket-db
   ```
2. **Apply Schema**:
   ```bash
   npx wrangler d1 execute pocket-db --remote --file drizzle/schema.sql
   ```
3. **Configure `wrangler.json`**:
   Add your `database_id` to [wrangler.json](wrangler.json).
4. **Set Production Secrets**:
   ```bash
   npx wrangler secret put POCKET_AUTH_SECRET
   npx wrangler secret put POCKET_USERNAME
   npx wrangler secret put POCKET_PASSWORD
   ```
5. **Build and Deploy**:
   ```bash
   npm run build
   npx wrangler deploy
   ```

For detailed instructions, custom domain setup, and migration workflows, see the **[Production Deployment Guide](docs/DEPLOYMENT.md)**.

---

## Verification & Testing

| Command | Description |
|---|---|
| `npm run typecheck` | Static TypeScript check (`tsc --noEmit`). |
| `npm run test:unit` | 135+ unit tests using Node.js native test runner (`node:test`). |
| `npm run smoke` | 164-step API smoke test suite against running dev server. |
| `npm run smoke:multi-user` | Multi-user isolation & registration smoke test. |
| `npm run lint` | ESLint static analysis. |
| `npm run build` | Compiles Worker and client static assets to `dist/`. |

---

## Documentation Suite

Pocket includes comprehensive documentation for human developers and autonomous AI agents:

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Complete Cloudflare Workers & D1 production deployment guide.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Architecture, runtime stack, component boundaries, and security model.
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — SQLite schema, computed balance logic, and migration runbook.
- [docs/AGENT_PLAYBOOK.md](docs/AGENT_PLAYBOOK.md) — Step-by-step SOPs, recipes, and agent anti-patterns.
- [docs/FEATURES.md](docs/FEATURES.md) — Feature catalog and roadmap backlog.
- [docs/TESTING.md](docs/TESTING.md) — Testing strategy, unit tests, and smoke test instructions.
- [AGENTS.md](AGENTS.md) — Primary autonomous agent guidelines and safety directives.
- [GEMINI.md](GEMINI.md) — Google Antigravity & Gemini runtime directives.
- [CLAUDE.md](CLAUDE.md) — Claude Code commands and project patterns.

---

## License

Private and personal finance management system.
