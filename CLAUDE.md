# CLAUDE.md

Pocket: a single-user, mobile-first personal expense tracker (currency BDT, timezone Asia/Dhaka).
Next.js 16 App Router code, run by **vinext** (Vite-based Next runtime) on a **Cloudflare Worker** with a **D1** (SQLite) database.
The project was scaffolded by the OpenAI "Sites" starter (`site-creator-vinext-starter`); most of the tooling outside `app/`, `lib/`, `db/` and `drizzle/` is that starter's plumbing.

## Commands (Windows, Node >= 22.13; v22.13.1 installed)

| Task | Command | Notes |
|---|---|---|
| Install | `npm run install:ci` | Runs `npm ci` via `scripts/install-ci.mjs`. Never plain `npm install` (rewrites lockfile). |
| Dev server | `npm run dev` | http://127.0.0.1:5173/ . Long-running: start with `run_in_background`. Uses local D1 in `.wrangler/state`. |
| Typecheck | `npm run typecheck` | ~10s. Passes clean. **Primary verification step.** |
| Smoke test | `npm run smoke` | Needs `npm run dev` running. 22 API checks (CRUD, validation, rename cascade, origin check). Uses unique `Smoke ...` names and cleans up. Run after any change to `app/api/` or `lib/`. |
| Lint | `npx eslint . --ignore-pattern dist --ignore-pattern .next` | ~60s. Baseline: 2 pre-existing errors in `app/tracker.tsx` (setState in effect on line 21, `<a href="/">` on line 34). Do not count these as regressions. |
| Build | `npm run build` | Outputs `dist/` (Worker + client). |
| Run built app | `npm start` | wrangler dev against `dist/server/wrangler.json`. |
| New migration | `npm run db:generate` | drizzle-kit, after editing `db/schema.ts`. |

There are no unit tests. Verify changes with typecheck, then `npm run smoke` for API changes, and Playwright MCP against :5173 for UI changes. Extend `tests/smoke.mjs` when adding or changing API behaviour.

**The local D1 database (`.wrangler/state`) holds the owner's real expense data** (the app is not deployed). Never reset, delete, or run destructive SQL against it without explicit permission. Back it up (copy `.wrangler/state`) before applying migrations.

Git: `main` branch, LF line endings enforced by `.gitattributes`. The folder is owned by another Windows account, so it is listed in the global `safe.directory`. Commit only when asked.

## Where things are (the only files you normally touch)

```
app/tracker.tsx            Entire UI: one "use client" component (~50 very long lines). All state, fetches, charts, dialogs.
app/page.tsx               Re-exports tracker.
app/layout.tsx             Metadata, imports globals.css + pocket.css.
app/pocket.css             All app styling (minified-style, plain class names, 3 breakpoints: 1180/800/600px).
app/globals.css            Tailwind v4 + shadcn theme tokens. pocket.css overrides tokens in :root.
app/api/expenses/route.ts  GET list, POST create, PUT update, DELETE {id}.
app/api/categories/route.ts GET list, POST add, PUT rename {name, previous}, DELETE {name}.
lib/expenses.ts            Default 26 category names, Expense type, validateExpense().
lib/categories.ts          getCategories() (lazy-seeds defaults once), categoryName() validator.
lib/database.ts            database(): returns raw env.DB (D1Database). Used by all routes.
db/schema.ts               Drizzle table definitions (source of truth for migrations only).
drizzle/*.sql              Generated migrations 0000..0002.
docs/FEATURES.md           Implemented features, known limitations, feature ideas backlog. Read before planning new work; update when a feature ships.
tests/smoke.mjs            API smoke test (plain Node fetch, no dependencies).
.claude/settings.json      Pre-approved safe commands for Claude Code.
```

Starter plumbing, **do not edit** unless the task is specifically about it: `build/`, `scripts/`, `vendor/`, `lib/connector*`, `app/chatgpt-auth.ts` (unused), `db/index.ts` (`getDb()` Drizzle client, unused), `examples/`, `components/ui/*` (vendored shadcn, regenerate rather than hand-edit), `.openai/hosting.json` (keep `project_id`), `vite.config.ts`.
Generated/ignored, never edit or search: `dist/`, `.next/`, `.vinext/`, `.wrangler/`, `.sites-runtime/`, `node_modules/`, `package-lock.json`.

## Data model and invariants

Tables (SQLite/D1):
- `expenses(id text pk, category text, cents integer, date text 'YYYY-MM-DD', note text default '')`
- `custom_categories(key text pk = lower(name), name text)`
- `app_state(key text pk)`: flag row `categories_initialized` marks that default categories were seeded.

Rules to preserve:
- **Money is integer cents.** API accepts `amount` as a string (`^\d{1,9}(\.\d{1,2})?$`, > 0); server converts with `Math.round(amount*100)`. UI formats with `money()` (Intl `en-BD`, BDT). Never store floats.
- `expenses.category` stores the category **display name**, not the key. Renaming a category must update both tables in one `db.batch` (see PUT in categories route).
- Category uniqueness is case-insensitive via `key = name.toLowerCase()`.
- A category with expenses cannot be deleted (409).
- Expense IDs are client-generated `crypto.randomUUID()`; server validates `^[a-zA-Z0-9-]{1,64}$`.
- Dates: validated as real calendar dates >= 1900-01-01. "Today" is computed in Asia/Dhaka in the client.
- Seeding is lazy: `getCategories()` inserts defaults on first call if `categories_initialized` is absent. Deleting all categories will not re-seed.

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

- Everything lives in `app/tracker.tsx` as one component with many `useState`s. State is updated optimistically from API responses (no refetch after mutations).
- Styling is hand-written CSS classes in `app/pocket.css`, not Tailwind utility classes. Palette: primary `#256a53`, background `#f8f9f6`, text `#22382e`. Mobile layout rules live in `@media(max-width:600px)`; check 390px width after UI changes.
- Icons from `lucide-react`; dialogs/selects/tabs/tables from `@/components/ui/*` (shadcn on Radix).
- `recharts` is installed but unused; the donut is a CSS `conic-gradient` and the bar chart is plain divs.
- The second `useEffect` registers a `read_expenses` tool on `document.modelContext` (WebMCP). Keep it in sync if the Expense shape changes.
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
- Org policy: do not use em-dashes in written text.
