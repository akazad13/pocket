# Pocket Agent Playbook

Standard Operating Procedures (SOP) and behavioral rules for autonomous AI agents working in the Pocket codebase.

---

## 1. Guiding Philosophy for AI Agents

1. **Protect Live Financial Data**: The local database at `.wrangler/state` contains the owner's actual financial records. Any action that resets or corrupts this database is catastrophic.
2. **Preserve Codebase Symmetry & Style**: App code in `app/` and `lib/` is written in a compact, minified-like style. Match the existing style to keep diffs surgical and readable.
3. **Strict Invariant Adherence**: Money is integer cents in BDT. Dates are calendar dates in Asia/Dhaka. Display names cascade across tables. Every color has a dark-mode mirror.
4. **Mandatory Multi-Tier Verification**: No task is complete without passing the verification pipeline: TypeScript compile check, unit tests, and API smoke tests.

---

## 2. The 5-Phase Agent Execution Workflow

Every coding task performed by an agent must follow these five sequential phases:

```
+-------------------------------------------------------------+
| Phase 1: Context Discovery & Scope Assessment               |
| - Inspect docs/FEATURES.md and relevant source modules      |
| - Verify whether DB changes or starter plumbing are involved|
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Phase 2: Safety & Pre-flight Checklist                      |
| - If touching schema or database: BACKUP .wrangler/state    |
| - Confirm Node environment (>= 22.13)                       |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Phase 3: Surgical Implementation                            |
| - Implement pure logic in lib/ (testable without edge DB)   |
| - Implement routes using raw D1 bindings and origin checks  |
| - Implement UI with dual-theme tokens & mobile breakpoints  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Phase 4: Mandatory Verification Pipeline                    |
| 1. npm run typecheck (~10s)                                 |
| 2. npm run test:unit (~1s)                                  |
| 3. npm run smoke (with dev server on :5173)                 |
| 4. Visual / UI review (Desktop + 390px Mobile + Dark Mode)  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Phase 5: Documentation & Feature Tracking                   |
| - Update docs/FEATURES.md (move idea to Implemented)        |
| - Check git status to ensure no temporary artifacts remain  |
+-------------------------------------------------------------+
```

---

## 3. Specific Implementation Recipes

### 3.1 Recipe: Adding Pure Business Logic (`lib/`)
1. Implement pure functions in `lib/<domain>.ts`.
2. Do not import `lib/database.ts` or `cloudflare:workers` in pure modules.
3. Add a companion unit test in `tests/unit/<domain>.test.ts`.
4. Run `npm run test:unit`.

### 3.2 Recipe: Adding or Modifying an API Route (`app/api/`)
1. Create or edit `app/api/<domain>/route.ts`.
2. Follow standard route conventions:
   - Reject cross-origin mutations:
     ```typescript
     const origin = request.headers.get("origin");
     if (origin && new URL(origin).origin !== new URL(request.url).origin) {
       return Response.json({ error: "Forbidden origin" }, { status: 403 });
     }
     ```
   - JSON responses: `Response.json(payload, { status: 200 })` or `201` on create.
   - User-facing error messages: `{ error: "<Friendly complete sentence>" }`.
   - Never destructure variable named `method` in route handler scopes (clashes with HTTP verb parameter `method: 'POST'`).
   - Use raw D1 prepared statements with `?` parameters: `db.prepare(...).bind(...)`.
3. Add API test assertions to [tests/smoke.mjs](file:///d:/Practice/Projects/Financial/pocket/tests/smoke.mjs).
4. Run `npm run smoke` against the running dev server.

### 3.3 Recipe: Adding UI Components & Dialogs (`app/`)
1. Mount dialogs from [app/tracker.tsx](file:///d:/Practice/Projects/Financial/pocket/app/tracker.tsx) if they need to open from any tab.
2. Key dialogs per opening (e.g. `<IncomeDialog key={openId ?? 'new'} ... />`) so internal state resets without complex effects.
3. Use plain CSS classes in [app/pocket.css](file:///d:/Practice/Projects/Financial/pocket/app/pocket.css).
4. **Always add a matching dark-mode override** in [app/pocket-dark.css](file:///d:/Practice/Projects/Financial/pocket/app/pocket-dark.css) under `html[data-theme=dark]`.
5. Check responsive behavior on 390px mobile viewport:
   - On mobile, `.main-tabs` is fixed at the bottom.
   - Content container has 160px bottom padding.
   - Floating Add button sits above the bottom bar.
6. Support Privacy Mode:
   - Format all currency with `money()` from `lib/format.ts`.
   - Any raw unformatted numbers must be protected by an `html[data-private]` blur CSS rule.

### 3.4 Recipe: Modifying Database Schema
Follow the exact protocol in [docs/DATA_MODEL.md](file:///d:/Practice/Projects/Financial/pocket/docs/DATA_MODEL.md):
1. Copy `.wrangler/state` to `../pocket-db-backups/<timestamp>-<reason>/`.
2. Edit [db/schema.ts](file:///d:/Practice/Projects/Financial/pocket/db/schema.ts).
3. Run `npm run db:generate`.
4. Apply locally with Wrangler:
   ```powershell
   npx wrangler d1 execute DB --local --persist-to .wrangler/state --file drizzle/000N_name.sql --config .sites-runtime/local.json
   ```
5. Update SQL statements in `app/api/` and TypeScript types.
6. Run `npm run typecheck` and `npm run smoke`.

---

## 4. Top 10 Agent Traps & Anti-Patterns

| # | Trap / Anti-Pattern | Consequence | Correct Procedure |
|---|---|---|---|
| **1** | Running `npm install` | Overwrites `package-lock.json` and alters starter dependencies | Always use `npm run install:ci` |
| **2** | Deleting `.wrangler/state` | Permanently destroys the user's real financial records | Never touch without backing up to `../pocket-db-backups/` |
| **3** | Storing float currency | Floating-point rounding errors in balances | Store integer cents only; calculate with integer cents |
| **4** | Destructuring `{ method }` in route handler | Shadowing of route parameter `method` leads to subtle runtime bugs | Alias parameter: `{ method: paidWith }` |
| **5** | Adding CSS without dark-mode override | Visual glitch and unreadable text in dark theme | Mirror every new background/color/border in `app/pocket-dark.css` |
| **6** | Editing starter plumbing | Breaks the Vinext / Worker hosting runtime | Never touch `build/`, `scripts/`, `vendor/`, `vite.config.ts` |
| **7** | Full file rewrites of `tracker.tsx` | Blows context and risks losing hundreds of minified handlers | Use targeted search-and-replace for specific sub-components |
| **8** | Writing Python scripts with unescaped regex | Writes literal NUL (`\x00`) bytes into source files | Use raw strings (`r'...'`) in Python scripts |
| **9** | Stale Vite dev cache error | `module does not provide export named X` error | Restart `npm run dev` by terminating the Node process on port 5173 |
| **10** | Using em-dashes (`—`) in copy | Violates project documentation policy | Use regular dashes, hyphens, or colons |

---

## 5. Verification Commands Quick Reference

| Action | Command | Expected Output |
|---|---|---|
| **Typecheck** | `npm run typecheck` | Clean exit (code 0), no output |
| **Unit tests** | `npm run test:unit` | All 65+ tests passing (~1s) |
| **Smoke tests** | `npm run smoke` | 164+ tests `ok`, 0 failures |
| **Lint** | `npm run lint` | Clean (0 errors) |
| **Production Build** | `npm run build` | Compiles Worker + client to `dist/` |
