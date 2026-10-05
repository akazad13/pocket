# Pocket expense tracker

A mobile-first personal expense tracker in BDT. Starts empty; the reference table's 26 category labels are retained, but none of its amounts or account data were imported.

## Features

- Add expenses with category, amount, date, and optional note.
- Edit and delete entries, with confirmation before deletion.
- Add categories from the expense form. Use Manage categories to rename categories (including their existing expenses) or delete empty categories. Categories with expenses cannot be deleted until those expenses are moved or removed.
- Browse months, category totals, annual trends, and a category-by-month table.
- Search the selected month's expenses and export the year's monthly totals to CSV.
- Store expense amounts as integer cents in Cloudflare D1; local development uses persisted SQLite through the Cloudflare emulator.

## Run locally

Use Node.js 22.13 or later, then `npm run install:ci` and `npm run dev`. Open http://127.0.0.1:5173/.

The current checkout already has the local database initialized. A fresh checkout needs a local Wrangler configuration with DB bound to database name `site-creator-d1`, database ID `00000000-0000-4000-8000-000000000000`, and the generated SQL in `drizzle/` applied using `wrangler d1 execute DB --local --persist-to .wrangler/state --file drizzle/0000_mature_spirit.sql --config <local-config-path>`.

`npm run build` produces the Worker and client build in `dist/`. `node node_modules/typescript/bin/tsc --noEmit --incremental false` checks types.

## Deployment status

Registered as a private Site, but not published: the installed Sites plugin's publishing scripts became unavailable during this session. Keep the existing project ID in `.openai/hosting.json` when resuming publication. Production deployment must apply the generated D1 migration. The app relies on the private Site access gate and is intended for a single owner; do not expose it publicly without adding per-user authorization.

## Verified

Production build and TypeScript check passed. Local create/read-after-reload/update/delete and rejection of negative amounts passed. Desktop and 390px mobile layouts inspected. Browser structured read tool verified with valid and invalid input. Temporary test entries removed.
