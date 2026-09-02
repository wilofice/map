# Deployment Guide

This document covers everything a new developer needs to understand, redeploy, and maintain the cloud infrastructure.

---

## Live URLs

| Environment | URL |
|---|---|
| **Production (Railway)** | https://soothing-tenderness-production-60f6.up.railway.app |
| Local dev | http://localhost:3000 (API) · http://localhost:5173 (Vite) |

---

## Stack

| Layer | Technology | Purpose |
|---|---|---|
| Hosting | Railway (Hobby plan) | Runs the Express server + serves compiled frontend |
| Database (local) | SQLite via better-sqlite3 | All reads/writes — fast, works offline |
| Database (cloud) | Turso (libSQL) | Cloud replica; pulled on startup, pushed on every write |
| Build system | Nixpacks (auto-detected) | Railway builds Node.js + React automatically |

---

## How the data layer works

```
Your code writes → local SQLite (sync, instant)
                       └─→ turso-sync.js Proxy fires setImmediate
                               └─→ Turso cloud (async, background)

On server startup:
  Turso cloud → pull all rows → local SQLite (fresh state)
```

- **Offline / no Turso creds:** app works unchanged in local-only mode.
- **Railway restart:** pulls latest Turso state on boot — always fresh.
- **Conflict policy:** last-write-wins by `updated_at`. Safe for single-user.

---

## Environment Variables

Set in Railway dashboard → Project → Service → Variables, **and** in your local `.env` (copy `.env.example`).

| Variable | Required | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | Yes (cloud) | `libsql://map-<org>.turso.io` — from `turso db show map --url` |
| `TURSO_AUTH_TOKEN` | Yes (cloud) | From `turso db tokens create map` |
| `NODE_ENV` | Recommended | Set to `production` on Railway |
| `DEBUG` | Optional | `true` enables verbose server logs |
| `PORT` | Auto-set by Railway | Do not set manually on Railway |
| `WORKING_ROOT_DIR` | Optional | Root for XML file operations |

To set Railway variables from your local `.env`:

```bash
railway link   # link to the project once
railway variables set \
  TURSO_DATABASE_URL="$(grep TURSO_DATABASE_URL .env | cut -d= -f2-)" \
  TURSO_AUTH_TOKEN="$(grep TURSO_AUTH_TOKEN .env | cut -d= -f2-)" \
  NODE_ENV=production DEBUG=false
```

---

## Deploying

### Standard deploy (push to main)

Railway auto-deploys on every push to `main`. No manual step needed:

```bash
git push
```

Railway runs the build command from `railway.toml`:
```
npm install && cd frontend && npm install && npm run build
```
Then starts the server with `npm start`.

### Manual redeploy (force)

```bash
railway link                              # only needed once
railway up --service soothing-tenderness
```

### Check deployment status

```bash
railway logs --service soothing-tenderness --lines 30
```

A healthy boot looks like:
```
✅ Database initialized: /app/mind_maps.db
✅ Turso connection verified
✅ Pulled N rows from Turso → local
💾 Database: ✅ Connected
☁️  Turso sync: ✅ Active
```

Health check endpoint:
```bash
curl https://soothing-tenderness-production-60f6.up.railway.app/api/health
```

---

## Turso setup (first time only)

```bash
# 1. Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 2. Login
turso auth login

# 3. Create the database (already done — skip if DB exists)
turso db create map

# 4. Get the URL
turso db show map --url

# 5. Create a token
turso db tokens create map

# 6. Put both in .env and Railway variables
```

To migrate existing local data to Turso (one-time):
```bash
node scripts/migrate-to-turso.mjs
```

---

## Railway free tier limits

| Resource | Free allowance | Typical usage |
|---|---|---|
| RAM | 512 MB | ~100–150 MB |
| CPU | Shared | Very low (idle most of the time) |
| Egress | 100 GB / month | Negligible for personal use |
| Build minutes | 500 / month | ~2–3 min per deploy |
| Sleep | Never (Hobby plan) | Always on |

The Hobby plan has a **$5/month credit**. A small Express server costs ~$0.30–$0.80/month — well within the free credit.

---

## File structure (deployment-relevant)

```
map/
├── railway.toml              # Build + start command, healthcheck config
├── backend/
│   ├── database-schema.sql   # Full schema — runs on fresh Railway SQLite
│   └── turso-sync.js         # Proxy that replicates writes to Turso cloud
├── scripts/
│   └── migrate-to-turso.mjs  # One-time data migration script
└── .env.example              # Template for local .env
```

---

## MCP server (local only)

The MCP server (`mcp.mjs`) runs on your **local machine** — it is not deployed to Railway. It reads/writes the local `mind_maps.db` directly, and `turso-sync.js` replicates changes to the cloud. Changes made via MCP locally appear in the Railway web app after sync.

Configure Claude Desktop / Cursor:
```json
{
  "mcpServers": {
    "mindmap": {
      "command": "/Users/genereux/dev/map/run-mcp.sh"
    }
  }
}
```

See [MCP.md](MCP.md) for full tool reference.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `no such table: collections` | Stale Railway container with old schema | Push latest `database-schema.sql` and redeploy |
| `Database: ❌ Not available` | Schema error on boot | Check `railway logs` for the SQLite error |
| `Turso sync: ℹ️ Local-only` | Missing env vars | Set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` on Railway |
| Frontend returns 404 at `/` | `frontend-dist/` not built | Check build logs; ensure `npm run build` ran during deploy |
| Railway auto-deploy not triggering | Branch mismatch | Confirm Railway is watching the `main` branch |
