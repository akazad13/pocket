# GEMINI.md - Pocket Development Guidelines

Instructions and behavioral guardrails for Google Antigravity & Gemini agents working on Pocket.

---

## 1. Context & Architecture

Pocket is a single-user, mobile-first personal financial manager in BDT (`Asia/Dhaka`).
- **Framework**: Next.js 16 (App Router) with React 19.
- **Runtime**: Vinext on Cloudflare Workers edge runtime.
- **Database**: Cloudflare D1 (SQLite) with local persistence in `.wrangler/state`.
- **CSS**: Tailwind v4 + custom tokens in `app/pocket.css` and `app/pocket-dark.css`.

---

## 2. Critical Safety Directives

1. **Protect Local Database**: `.wrangler/state` holds the user's real financial records. Never delete or wipe this folder. Before any schema migration or batch operation, backup `.wrangler/state` to `../pocket-db-backups/<timestamp>-<reason>/`.
2. **Deterministic Installation**: Always run `npm run install:ci`. Never execute `npm install` (which overwrites `package-lock.json`).
3. **No Float Currency**: All amounts are stored and computed in integer cents. Format with `money()` from [lib/format.ts](file:///d:/Practice/Projects/Financial/pocket/lib/format.ts).
4. **Dark Mode Sync**: Every new CSS class with colors or borders in `app/pocket.css` must have an equivalent dark mode override in `app/pocket-dark.css`.
5. **Preserve Code Style**: Code in `app/` and `lib/` uses a compact style. Match local formatting and avoid full-file rewrites. Never touch starter plumbing files (`build/`, `scripts/`, `vendor/`, `vite.config.ts`).

---

## 3. Essential Reference Documents

- [docs/DEPLOYMENT.md](file:///d:/Projects/Github/akazad13/pocket/pocket/docs/DEPLOYMENT.md): Production deployment guide for Cloudflare Workers & D1.
- [docs/ARCHITECTURE.md](file:///d:/Projects/Github/akazad13/pocket/pocket/docs/ARCHITECTURE.md): System architecture, runtime details, and module boundaries.
- [docs/DATA_MODEL.md](file:///d:/Projects/Github/akazad13/pocket/pocket/docs/DATA_MODEL.md): Full database schema, computed balances, and migration steps.
- [docs/AGENT_PLAYBOOK.md](file:///d:/Projects/Github/akazad13/pocket/pocket/docs/AGENT_PLAYBOOK.md): Operational SOPs, 10 agent pitfalls, and implementation recipes.
- [docs/TESTING.md](file:///d:/Projects/Github/akazad13/pocket/pocket/docs/TESTING.md): Verification pipeline: Typecheck, unit tests, and smoke tests.
- [docs/FEATURES.md](file:///d:/Projects/Github/akazad13/pocket/pocket/docs/FEATURES.md): Current features and backlog.

---

## 4. Required Verification Gates

Every modification must satisfy:
1. `npm run typecheck` (Passes cleanly with code 0).
2. `npm run test:unit` (All 65+ unit tests pass).
3. `npm run smoke` (If API or data structures changed; run against local dev server).
4. Visual layout review: Check 390px mobile viewport, dark mode contrast, and privacy masking.
