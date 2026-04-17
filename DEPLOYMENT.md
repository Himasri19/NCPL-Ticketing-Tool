# NCPL Ticketing — Deployment Guide

Three deployment paths in order of recommendation:

| Path | Backend | Frontend | Database | Difficulty |
|------|---------|----------|----------|------------|
| **A. Hybrid (RECOMMENDED)** | Render / Railway | Vercel | MongoDB Atlas | ⭐ Easy |
| **B. All-on-Vercel** | Vercel Python Serverless | Vercel | MongoDB Atlas | ⭐⭐ Medium (cold starts) |
| **C. Emergent Native** | Emergent | Emergent | Emergent-managed | ⭐ Easiest (1 click) |

---

## Prerequisites (all paths)

### 1. MongoDB Atlas (free tier)
1. Create account at https://cloud.mongodb.com
2. Create a **Shared** (M0 free) cluster
3. Database Access → **Add user** → remember the password
4. Network Access → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`)
5. Copy connection string (e.g. `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/`)

### 2. Emergent Universal Key
- Get from https://app.emergent.sh → Profile → Universal Key
- Needed for the object-storage upload integration (ticket attachments)

### 3. Pick your admin Google email(s)
- Whoever signs in with this email becomes Admin automatically
- Everyone else → Employee

---

## Path A — Hybrid: Frontend on Vercel + Backend on Render

### Step 1 — Deploy backend to Render
1. Push this repo to GitHub
2. Go to https://render.com → **New +** → **Web Service**
3. Connect your GitHub repo
4. Fill in:
   - **Root Directory**: `backend`
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (from `.env.example`):
   ```
   MONGO_URL=mongodb+srv://...
   DB_NAME=ncpl_ticketing
   CORS_ORIGINS=https://your-app.vercel.app
   EMERGENT_LLM_KEY=sk-emergent-...
   ADMIN_EMAILS=you@company.com
   APP_NAME=ncpl-ticketing
   ```
6. Deploy. Copy the Render URL (e.g. `https://ncpl-ticketing.onrender.com`)

### Step 2 — Deploy frontend to Vercel
1. Go to https://vercel.com → **Add New Project** → import your GitHub repo
2. Set:
   - **Root Directory**: `frontend`
   - **Framework**: Create React App (auto-detected)
3. Environment variable:
   ```
   REACT_APP_BACKEND_URL=https://ncpl-ticketing.onrender.com
   ```
4. Deploy. Copy the Vercel URL (e.g. `https://ncpl-ticketing.vercel.app`)

### Step 3 — Fix CORS
1. Go back to Render → Environment
2. Update `CORS_ORIGINS` to exactly your Vercel URL:
   ```
   CORS_ORIGINS=https://ncpl-ticketing.vercel.app
   ```
3. Click **Save, Rebuild & Deploy**

### Step 4 — First login
1. Open `https://ncpl-ticketing.vercel.app`
2. Click **Continue with Google**
3. Sign in with the email listed in `ADMIN_EMAILS` → you land in the Admin Console.

**Done.** 🎉

---

## Path B — Everything on Vercel (single project)

This uses FastAPI as a Python serverless function via `api/index.py`.
Caveats: cold starts (~2s), 30s max duration per request, no WebSockets.

### Step 1 — Push to GitHub
Ensure the following files are committed (already created in this repo):
- `/vercel.json`
- `/api/index.py`
- `/requirements.txt`

### Step 2 — Create Vercel project
1. https://vercel.com → **Add New Project** → import repo
2. **Root Directory**: leave empty (root of repo)
3. **Framework Preset**: Other
4. Vercel auto-detects `vercel.json` — do not override

### Step 3 — Environment variables (all under one Vercel project)

Add **ALL** of the following in Vercel Settings → Environment Variables:

| Key | Value | Scope |
|-----|-------|-------|
| `MONGO_URL` | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/` | Production, Preview |
| `DB_NAME` | `ncpl_ticketing` | All |
| `CORS_ORIGINS` | `https://your-app.vercel.app` (set after first deploy) | All |
| `EMERGENT_LLM_KEY` | `sk-emergent-...` | All |
| `ADMIN_EMAILS` | `you@company.com,other@company.com` | All |
| `APP_NAME` | `ncpl-ticketing` | All |
| `REACT_APP_BACKEND_URL` | `https://your-app.vercel.app` (same host, set after first deploy) | All |

### Step 4 — First deploy + fix URLs
1. Deploy. Copy the assigned URL (e.g. `https://ncpl-abc123.vercel.app`)
2. Update `CORS_ORIGINS` and `REACT_APP_BACKEND_URL` to that URL
3. Redeploy to apply the new env vars
4. Sign in with Google

---

## Path C — Emergent Native (simplest)

1. In the Emergent UI, click **Deploy** on this project
2. Click **Deploy Now** → wait ~10 min
3. Optional: add a custom domain in Settings
4. Zero code changes needed.

---

## Complete Environment Variables Reference

See `.env.example` at repo root.

### Backend env vars (required)
- `MONGO_URL` — MongoDB Atlas connection string
- `DB_NAME` — typically `ncpl_ticketing`
- `CORS_ORIGINS` — **exact** frontend URL(s), comma-separated, **no wildcards**
- `EMERGENT_LLM_KEY` — from app.emergent.sh Profile
- `ADMIN_EMAILS` — comma-separated Google emails that auto-become admin
- `APP_NAME` — storage path prefix, default `ncpl-ticketing`

### Frontend env var (required)
- `REACT_APP_BACKEND_URL` — HTTPS URL of the backend (no trailing slash)

---

## Production hardening checklist

- [x] CORS uses explicit origins (wildcard no longer accepted when cookies are sent)
- [x] `session_token` cookie: `HttpOnly`, `Secure`, `SameSite=None`
- [x] Passwords never stored (Google OAuth only)
- [x] MongoDB `_id` field excluded from all API responses
- [x] File uploads capped at 15 MB
- [x] Rate limits on Mongo driver default pool (handled by Atlas)
- [ ] **Add**: a monitoring/alerting service (Sentry / Better Stack)
- [ ] **Add**: daily MongoDB Atlas backup snapshot (paid tier)
- [ ] **Add**: custom domain + TLS (Vercel / Cloudflare auto-issues)

---

## Troubleshooting

### "Invalid state parameter" after Google sign-in
- Close all tabs. Open one fresh tab. Go to your frontend URL. Click Continue with Google. Complete in the same tab without navigating away.
- Vercel preview URLs change every deploy — if the origin changes mid-flow, OAuth breaks. Use your production URL only.

### `/api/auth/me` returns 401 right after login
- `CORS_ORIGINS` doesn't exactly match the frontend origin (scheme + host + no trailing slash)
- Browser blocked third-party cookies (site-scoped cookies are fine; check devtools → Application → Cookies)

### Attachments upload fails with 500
- `EMERGENT_LLM_KEY` missing or wrong
- Check backend logs for `Storage init failed`

### MongoDB connection timeout on Vercel
- Add `0.0.0.0/0` in Atlas Network Access, or use Atlas Private Endpoint for stricter setups
