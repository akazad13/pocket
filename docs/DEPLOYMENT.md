# Deploying Pocket to Cloudflare Workers & D1

Complete, step-by-step production deployment guide for Pocket.

---

## 1. Architecture & Deployment Overview

Pocket is designed to run seamlessly on the Cloudflare edge runtime:
- **Server Runtime**: Cloudflare Workers with `nodejs_compat` flag (compiled via Vinext / Vite).
- **Static Assets**: Cloudflare Workers Assets (`dist/client`), served globally with automatic CDN caching and gzip/brotli compression.
- **Database**: Cloudflare D1 (serverless SQLite at the edge) bound as `DB`.
- **Authentication**: Built-in multi-user authentication with PBKDF2 password hashing, salt generation, and HMAC-signed session cookies (`POCKET_AUTH_SECRET`).

```
+-------------------------------------------------------------+
|              Cloudflare Global Edge Network                 |
|   https://pocket.<your-subdomain>.workers.dev / Custom DNS   |
+-------------------------------------------------------------+
                               |
        +----------------------+----------------------+
        |                                             |
        v                                             v
+-------------------------------+             +-------------------------------+
|    Cloudflare Worker (SSR)    |             |    Cloudflare Worker Assets   |
|     `dist/server/index.js`    |             |        `dist/client/`         |
|   - API handlers (/api/*)     |             |   - JavaScript chunks         |
|   - Multi-tenant Auth engine  |             |   - CSS design tokens         |
|   - Server-side rendering     |             |   - Manifest & Web Workers    |
+-------------------------------+             +-------------------------------+
                |
                v
+-------------------------------+
|      Cloudflare D1 Database   |
|        `pocket-db` (SQLite)   |
|   - 10 isolated tables        |
|   - Multi-user data tenancy   |
+-------------------------------+
```

---

## 2. Prerequisites

Before deploying, ensure you have:
1. **Node.js**: Version `>=22.13.0` (Node `v22.13.1` or later recommended).
2. **Cloudflare Account**: A free or paid Cloudflare account ([dash.cloudflare.com](https://dash.cloudflare.com/)).
3. **Wrangler CLI**: Cloudflare's official developer CLI. Authenticate locally by running:
   ```bash
   npx wrangler login
   ```
   This will open a browser window to authorize Wrangler with your Cloudflare account.

---

## 3. Step-by-Step Deployment Runbook

### Step 1: Create the Cloudflare D1 Database

Run the following command to provision a brand-new D1 database on your Cloudflare account:

```bash
npx wrangler d1 create pocket-db
```

Output will look similar to this:

```text
✅ Successfully created DB 'pocket-db'!

Add the following to your wrangler.json file:
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "pocket-db",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ]
}
```

> [!IMPORTANT]
> Copy the generated `database_id`. You will place it into `wrangler.json` in Step 3.

---

### Step 2: Initialize Database Schema

Pocket provides a consolidated schema initializer at `drizzle/schema.sql` that sets up all 10 tables, indices, and constraints in a single command.

Execute this script against your remote D1 database:

```bash
npx wrangler d1 execute pocket-db --remote --file drizzle/schema.sql
```

You should see confirmation output showing that all tables (`app_state`, `users`, `custom_categories`, `expenses`, `budgets`, `recurring`, `income`, `accounts`, `transfers`, `adjustments`) were created successfully.

---

### Step 3: Configure `wrangler.json`

Open [wrangler.json](file:///d:/Projects/Github/akazad13/pocket/pocket/wrangler.json) in the project root. It should look like this:

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "pocket",
  "main": "dist/server/index.js",
  "compatibility_date": "2026-05-15",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "assets": {
    "directory": "dist/client"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "pocket-db",
      "database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"
    }
  ],
  "vars": {
    "POCKET_AUTH_SECRET": "pocket-production-secret-replace-me-random-32-chars",
    "POCKET_USERNAME": "admin",
    "POCKET_PASSWORD": "pocket2026-replace-me"
  }
}
```

1. Replace `"REPLACE_WITH_YOUR_D1_DATABASE_ID"` with your actual D1 `database_id` from Step 1.
2. (Optional) Adjust `"name"` if you want your worker to have a different name in the Cloudflare Dashboard.

---

### Step 4: Configure Production Secrets

For maximum security, do not keep production credentials or auth secrets in plain text in `wrangler.json`. Instead, store them as Cloudflare Worker encrypted secrets:

```bash
# 1. Secret used to sign session cookies (use a random 32+ character string)
npx wrangler secret put POCKET_AUTH_SECRET

# 2. Initial default administrator username
npx wrangler secret put POCKET_USERNAME

# 3. Initial default administrator password
npx wrangler secret put POCKET_PASSWORD
```

When prompted by Wrangler, paste your strong random secrets.

---

### Step 5: Build the Application

Build the Next.js / Vinext server bundle and client static assets:

```bash
npm run install:ci
npm run build
```

This compiles:
- `dist/server/index.js` (Cloudflare Worker runtime)
- `dist/client/` (static assets: HTML, CSS, JS, manifest, service worker)

---

### Step 6: Deploy to Cloudflare Workers

Deploy the compiled application to Cloudflare:

```bash
npx wrangler deploy
```

Wrangler will upload static client assets, link your remote D1 database binding, register worker routes, and output your live deployment URL:

```text
Total Upload: xx KiB / gzip: xx KiB
Uploaded pocket (x.xx sec)
Deployed pocket triggers (x.xx sec)
  https://pocket.<your-subdomain>.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 4. Post-Deployment Verification

1. **Open Live App**: Visit `https://pocket.<your-subdomain>.workers.dev`.
2. **Initial Login**: Sign in using your configured `POCKET_USERNAME` and `POCKET_PASSWORD`.
3. **Multi-User Registration**: You can register new users or invite family members directly via the "Register" tab on the login screen. Each user receives an isolated tenant partition in D1.
4. **Profile & Security**: Click your username in the top navigation or use `Ctrl+K` -> "Profile settings" to change your password or update your display name.
5. **Install as PWA**: Open the app in Chrome or Safari on mobile, tap "Add to Home Screen" or the install icon in the address bar to use Pocket as a native standalone app.

---

## 5. Custom Domain Configuration

To serve Pocket on your own domain (e.g. `pocket.yourdomain.com` or `finance.yourdomain.com`):

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Compute (Workers) > Workers & Pages > pocket**.
3. Go to **Settings > Domains & Routes**.
4. Click **Add > Custom Domain**.
5. Enter your domain or subdomain (e.g. `pocket.example.com`).
6. Cloudflare automatically issues and manages free SSL/TLS certificates and configures DNS routing.

---

## 6. Maintenance, Migrations & Backups

### 6.1 Remote Database Backups

You can export the entire production SQLite database at any time using Wrangler:

```bash
npx wrangler d1 export pocket-db --remote --output=backup-$(date +%Y%m%d).sql
```

In addition, Pocket includes a full JSON backup & restore utility inside the application under **Settings > Backup & restore**.

### 6.2 Applying Incremental Schema Migrations

When new features introduce schema changes:

1. Generate migration locally:
   ```bash
   npm run db:generate
   ```
2. Apply the newly created migration file to remote D1:
   ```bash
   npx wrangler d1 execute pocket-db --remote --file drizzle/000N_name.sql
   ```
3. Re-build and re-deploy:
   ```bash
   npm run build
   npx wrangler deploy
   ```

---

## 7. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `Database not found` (code 10021) | Missing or incorrect `database_id` in `wrangler.json` | Ensure `database_id` matches the output of `npx wrangler d1 list`. |
| 403 Forbidden on mutations | Cross-origin mutation request blocked | Ensure requests originate from the same domain or workers.dev host. |
| In-app session expires immediately | `POCKET_AUTH_SECRET` changed or mismatch | Ensure `POCKET_AUTH_SECRET` is set consistently via `wrangler secret put`. |
| Assets returning 404 | Missing build step before deploy | Run `npm run build` before executing `npx wrangler deploy`. |
| Local database out of sync with remote | Development uses `.wrangler/state` | Remote D1 is completely separate from local emulator storage. Export/import via SQL if you want to sync data. |
