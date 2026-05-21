# Third-party setup (Render + Vercel + Postgres)

Everything below is **your work** in hosting dashboards. The repo already implements Path 2 code (Postgres layer, API URL env, auto-seed on first boot when `DATABASE_URL` is set).

Replace placeholders:
- `YOUR_RENDER_API` → e.g. `https://dama-api-xxxx.onrender.com`
- `YOUR_VERCEL_APP` → e.g. `https://dama-srh-hackathon.vercel.app`

---

## Part A — Render PostgreSQL

### A1. Create database

1. Log in to [Render](https://render.com).
2. **New +** → **PostgreSQL**.
3. Name: `dama-db` (or similar), region near your web service.
4. Create database.
5. Copy **Internal Database URL** (starts with `postgres://` — the app converts it automatically).

### A2. Note credentials

- [ ] Internal URL saved (for Render web service)
- [ ] External URL saved (optional — for seeding from your laptop with `psql` or `seed_db.py`)

---

## Part B — Render Web Service (FastAPI backend)

### B1. Create or update web service

1. **New +** → **Web Service** (or open existing backend service).
2. Connect GitHub repo `dama-srh-hackathon`.
3. Settings:

| Field | Value |
|-------|--------|
| **Root Directory** | *(leave empty — repo root)* |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` (root file includes `backend/requirements.txt`) |
| **Start Command** | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |

### B2. Link database

1. Service → **Environment**.
2. **Add from database** → select `dama-db` → adds `DATABASE_URL` automatically.

   **Or** manually add:
   - Key: `DATABASE_URL`
   - Value: Internal Database URL from Part A

### B3. Other environment variables

| Key | Value | Required |
|-----|--------|----------|
| `DATABASE_URL` | From linked Postgres | **Yes** (production) |
| `ANTHROPIC_API_KEY` | Your Anthropic key | **Yes** for `/learn` (Sira) |
| `CORS_ORIGINS` | `https://YOUR_VERCEL_APP,http://localhost:5173` | Recommended (comma-separated, no spaces) |

If `CORS_ORIGINS` is omitted, the API allows `*` (works but less secure).

### B4. Deploy

1. **Manual Deploy** → Deploy latest commit.
2. Wait for build (install + ML model train on first request can take 1–3 minutes on free tier).
3. **First deploy with `DATABASE_URL`:** the app auto-creates tables and seeds 45 provinces (cold start may be slow).

### B5. Verify backend

Open in browser:

- [ ] `https://YOUR_RENDER_API/health` → `{"status":"ok","database":true,"provinces":45}`
- [ ] `https://YOUR_RENDER_API/docs` → Swagger UI
- [ ] `https://YOUR_RENDER_API/api/vulnerability/scores` → JSON FeatureCollection

### B6. Optional — manual reseed (Render Shell)

If health shows `provinces: 0` or errors:

1. Service → **Shell**.
2. Run:
   ```bash
   python -m backend.database.seed_db
   ```

### B7. Optional — reseed from your PC

1. Copy `.env.example` → `.env` at repo root.
2. Set `DATABASE_URL` to Postgres **External** URL from Render.
3. Local:
   ```bash
   pip install -r backend/requirements.txt
   python -m backend.database.seed_db
   ```

---

## Part C — Vercel (frontend)

### C1. Project settings

1. [Vercel](https://vercel.com) → import repo (if not already).
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`

### C2. Environment variable (required)

**Settings → Environment Variables → Production:**

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://YOUR_RENDER_API` |

- Use **HTTPS**, no trailing slash.
- Add same variable for **Preview** if you test preview deployments.

### C3. Redeploy

1. **Deployments** → ⋮ on latest → **Redeploy** (required after env changes — Vite bakes vars at build time).

### C4. Verify frontend

1. Open `https://YOUR_VERCEL_APP/dashboard`
2. DevTools → **Network**:
   - [ ] Requests go to `https://YOUR_RENDER_API/api/...`
   - [ ] No calls to `127.0.0.1:8000`
   - [ ] No CORS errors
3. Functional checks:
   - [ ] Dashboard map and priority list load
   - [ ] Radio, Locator, Relay pages load data
   - [ ] Ask Sira sends messages (needs `ANTHROPIC_API_KEY` on Render)
   - [ ] Log interaction / relay visit → **Refresh Feedback Loop** → counts increase

### C5. Persistence test

1. Log a locator interaction on production.
2. Trigger a new Render deploy (or wait for auto-deploy).
3. Refresh dashboard → interaction count still reflected after **Refresh Feedback Loop**.

---

## Part D — Anthropic (Sira chat only)

1. [Anthropic Console](https://console.anthropic.com/) → API keys.
2. Create key → paste into Render as `ANTHROPIC_API_KEY`.
3. Never put this key in Vercel or frontend env.

---

## Part E — GitHub (if not connected)

- [ ] Render connected to repo (auto-deploy on push to `main`)
- [ ] Vercel connected to repo (auto-deploy on push)
- [ ] Push latest code with Path 2 changes before testing production

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Dashboard error on Vercel | Set `VITE_API_BASE_URL`, redeploy Vercel |
| CORS error in browser | Set `CORS_ORIGINS` on Render to exact Vercel URL, redeploy Render |
| `database: false` on `/health` | Add/link `DATABASE_URL` on Render |
| `provinces: 0` | Run `python -m backend.database.seed_db` in Render Shell |
| Render build fails | Check build logs; ensure `backend/requirements.txt` path |
| Sira 500 | Add `ANTHROPIC_API_KEY` on Render |
| Slow first load | Free tier cold start + ML seed; wait 60–90s and retry |
| Mixed content blocked | Ensure API URL is `https://` not `http://` |

---

## Quick copy-paste checklist

```
[ ] Render Postgres created
[ ] Render Web Service: build + start commands set
[ ] DATABASE_URL linked on Render
[ ] ANTHROPIC_API_KEY on Render
[ ] CORS_ORIGINS = https://YOUR_VERCEL_APP,http://localhost:5173
[ ] /health shows database:true, provinces:45
[ ] Vercel VITE_API_BASE_URL = https://YOUR_RENDER_API
[ ] Vercel redeployed after env change
[ ] Production dashboard works end-to-end
```

---

## Local dev (no third-party changes)

**Without Postgres** (same as before):

```bash
py -3 -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
cd frontend && npm run dev
```

**With local Postgres:**

1. Install Postgres locally or use Render External URL in `.env`.
2. `DATABASE_URL=postgresql://...` in `.env`
3. `python -m backend.database.seed_db`
4. `uvicorn backend.main:app --reload --port 8000`
