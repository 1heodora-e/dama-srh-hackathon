# Path 2: Live Database + Production Deployment — Full Checklist

**Goal:** Vercel frontend + Render backend + **PostgreSQL** with persistent data. All routes work in production (dashboard, radio, locator, relay, feedback refresh, Sira chat).

**Current state (baseline):**
- Data: `backend/database/seed_data.py` + in-memory pandas at startup + JSON files (`interaction_logs.json`, `relay_visits.json`)
- Frontend: hardcoded `http://127.0.0.1:8000` in 5 page files
- No `requirements.txt`, no `DATABASE_URL`, no SQL layer

Use this as a **sequential** checklist. Do not skip **Phase 0** (frontend + Render health) — production will still fail even with Postgres if the API URL is wrong.

---

## Phase 0 — Unblock production (no Postgres yet)

Do this first so you can verify Render/Vercel wiring before DB work.

### 0.1 Render backend health

- [ ] Render Web Service exists; repo root is the service root (not `frontend/`)
- [ ] **Build command:** `pip install -r requirements.txt` (repo root — includes SQLAlchemy, psycopg2, etc.)
- [ ] **Start command:**  
      `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- [ ] Add `backend/requirements.txt` in repo (recommended) and point Render build at it
- [ ] Open `https://<your-service>.onrender.com/docs` — Swagger loads
- [ ] Browser test (must return JSON):
  - [ ] `GET /api/vulnerability/scores`
  - [ ] `GET /api/vulnerability/top-priority`

### 0.2 Frontend → Render API URL

- [ ] Create `frontend/src/lib/api.js` (or `api.ts`):
  ```js
  export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  ```
- [ ] Replace hardcoded `API_BASE` in:
  - [ ] `frontend/src/pages/Dashboard.jsx`
  - [ ] `frontend/src/pages/RadioPortal.jsx`
  - [ ] `frontend/src/pages/Locator.jsx`
  - [ ] `frontend/src/pages/RelayPortal.jsx`
  - [ ] `frontend/src/pages/Learn.jsx`
- [ ] Vercel → **Environment Variables** → Production:
  - [ ] `VITE_API_BASE_URL` = `https://<your-service>.onrender.com` (HTTPS, no trailing slash)
- [ ] Redeploy Vercel (env vars are baked at build time)
- [ ] DevTools on `/dashboard`: requests go to Render host, not `127.0.0.1`

### 0.3 CORS

- [ ] In `backend/main.py`, set `allow_origins` to your real origins, e.g.:
  - `https://<your-app>.vercel.app`
  - `http://localhost:5173`
- [ ] Redeploy Render

### 0.4 Sira (optional for dashboard, required for `/learn`)

- [ ] Render env: `ANTHROPIC_API_KEY` = your key
- [ ] Test `POST /api/sira/chat` from Swagger or `/learn` on Vercel

**Phase 0 done when:** Vercel dashboard loads map/scores using Render API (still synthetic in-memory data).

---

## Phase 1 — PostgreSQL on Render

### 1.1 Create database

- [ ] Render → **New +** → **PostgreSQL**
- [ ] Note **Internal Database URL** (for backend on Render) and **External** (for local migrations from your PC)
- [ ] Plan: free tier is fine for hackathon; accept cold starts and connection limits

### 1.2 PostGIS (optional for MVP)

- [ ] **MVP:** Skip PostGIS; store province map GeoJSON in frontend/CDN (as today). DB holds tabular data only.
- [ ] **Later:** Enable PostGIS extension + `geometry` columns per `dama_prd.md` §9

### 1.3 Attach DB to web service

- [ ] Link Postgres instance to FastAPI service **or** manually add env on Render:
  - [ ] `DATABASE_URL` = Internal URL from Render Postgres dashboard

### 1.4 Local parity

- [ ] Copy `DATABASE_URL` to local `.env` (gitignored) for migrations/seeding
- [ ] Add `.env.example` at repo root:
  ```env
  DATABASE_URL=postgresql://user:pass@host:5432/dbname
  ANTHROPIC_API_KEY=
  ```

---

## Phase 2 — Schema & migrations

Align tables with **actual API fields** in `backend/main.py` and `backend/models/schemas.py` (not only PRD — PRD is a superset).

### 2.1 Add migration tooling

- [ ] Add `backend/requirements.txt` with: `sqlalchemy`, `psycopg2-binary`, `alembic`
- [ ] Init Alembic: `alembic init backend/migrations` (or `backend/alembic`)
- [ ] Configure `alembic.ini` / `env.py` to read `DATABASE_URL` from environment

### 2.2 Core tables (MVP)

Create migration `001_initial_schema.sql` (or Alembic revision) with:

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `provinces` | 45 provinces | `id`, `name`, `region`, `conflict_affected` |
| `province_indicators` | DHS-style features for ML | `province_id`, numeric columns matching `generate_synthetic_dhs_indicators()` |
| `vulnerability_scores` | Current score per province | `province_id`, `score`, `top_risk_factor`, `data_quality`, `component_breakdown` (JSONB), `score_date` |
| `facilities` | CSPS locator | `id`, `province_id`, `name`, `facility_type`, `is_open`, `distance_km`, `services` (JSONB array), `chw_contact` |
| `relays` | Relay profiles | `relay_id` (text PK), `relay_name`, `province_id`, `commune`, `phone`, `assigned_households` |
| `relay_households` | Household labels per relay | `relay_id`, `household_label` |
| `interaction_logs` | Locator POSTs | `interaction_id` (UUID), `province_id`, `interaction_type`, `source`, `user_agent`, `logged_at` |
| `relay_visits` | Relay POSTs | `visit_id` (UUID), `relay_id`, `province_id`, `household_label`, `srh_need_identified`, `referral_made`, `service_type`, `logged_at` |
| `score_history` | Optional audit trail for feedback | `province_id`, `score`, `recorded_at` |

- [ ] Add indexes: `province_id` on logs, `logged_at` on logs, `vulnerability_scores(province_id, score_date DESC)`

### 2.3 Run migrations

- [ ] Local: `alembic upgrade head` (or `psql $DATABASE_URL -f ...`)
- [ ] Render: add **release command** or one-off job: `alembic upgrade head` before/on deploy
- [ ] Confirm tables exist in Render Postgres shell or `psql`

---

## Phase 3 — Seed database from existing Python seed

### 3.1 Seed script

- [ ] Add `backend/database/seed_db.py` (CLI: `python -m backend.database.seed_db`)
- [ ] Script should:
  1. Load `PROVINCES` from `seed_data.py` → `INSERT` into `provinces`
  2. Run `generate_synthetic_dhs_indicators()` → `province_indicators`
  3. Run `build_vulnerability_outputs()` / `run_pipeline()` → `INSERT` into `vulnerability_scores` (+ `component_breakdown` JSON)
  4. Run `generate_sample_facilities()` → `facilities`
  5. Run `generate_sample_relays()` + `generate_sample_relay_households()` → `relays` + `relay_households`
  6. Be **idempotent** (truncate + reseed, or `ON CONFLICT`) for dev reruns

### 3.2 Run seed

- [ ] Local: seed against local/dev `DATABASE_URL`
- [ ] Render: run once via Render Shell or deploy hook:
  ```bash
  python -m backend.database.seed_db
  ```
- [ ] Verify row counts: 45 provinces, 45 scores, ~270 facilities (6×45), relays present

### 3.3 Migrate existing JSON logs (optional)

- [ ] One-time import from `interaction_logs.json` / `relay_visits.json` into SQL tables if you have real demo data

---

## Phase 4 — Backend data layer (replace in-memory + JSON)

### 4.1 Database module

- [ ] Add `backend/database/connection.py` — SQLAlchemy engine/session from `DATABASE_URL`
- [ ] Add `backend/database/repository.py` (or split by domain) with functions:
  - [ ] `get_all_scores()` → DataFrame or list for API
  - [ ] `get_province_score(province_id)`
  - [ ] `get_top_priority(limit=10)`
  - [ ] `get_facilities_by_province(province_id)`
  - [ ] `get_relay_sync(relay_id)` — relay + households
  - [ ] `insert_interaction(...)`
  - [ ] `insert_relay_visit(...)`
  - [ ] `refresh_scores_from_feedback()` — read log counts, update `vulnerability_scores`, append `score_history`

### 4.2 Refactor `backend/main.py`

Replace globals loaded at import:

| Current | Replace with |
|---------|----------------|
| `_scores_df = run_pipeline(...)` at module load | Load from DB on startup **or** lazy read per request |
| `_facilities_df`, `_relays_df`, `_relay_households` | DB queries |
| `_persist_interaction` / JSON file | `INSERT` into `interaction_logs` |
| `_persist_relay_visit` / JSON file | `INSERT` into `relay_visits` |
| `_refresh_scores_with_feedback()` | SQL counts + update scores in DB |
| `_score_history` list | `score_history` table (optional) |

- [ ] Keep `run_pipeline()` for **recompute** inside `POST /api/feedback/refresh` — write results back to `vulnerability_scores`
- [ ] Add startup hook `@app.on_event("startup")` or lifespan:
  - [ ] Verify DB connection
  - [ ] If `vulnerability_scores` empty → auto-seed or fail with clear log
- [ ] Remove or gate JSON file writes (dev-only fallback optional)

### 4.3 Environment handling

- [ ] `DATABASE_URL` required in production; clear 503/500 if missing
- [ ] Local dev: fall back to in-memory only if `DATABASE_URL` unset (optional convenience)

### 4.4 API contract unchanged

Ensure response shapes stay identical (frontend unchanged except `API_BASE`):

- [ ] `GET /api/vulnerability/scores`
- [ ] `GET /api/vulnerability/district/{province_id}`
- [ ] `GET /api/vulnerability/top-priority`
- [ ] `GET /api/radio/script/{province_id}`
- [ ] `GET /api/locator/facilities/{province_id}`
- [ ] `POST /api/locator/interaction`
- [ ] `GET /api/relay/sync/{relay_id}`
- [ ] `POST /api/relay/visit`
- [ ] `POST /api/feedback/refresh`
- [ ] `POST /apii/sira/chat`

---

## Phase 5 — Repo & deploy configuration

### 5.1 `backend/requirements.txt`

- [ ] Pin versions for: `fastapi`, `uvicorn[standard]`, `pandas`, `numpy`, `scikit-learn`, `joblib`, `httpx`, `pydantic`, `sqlalchemy`, `psycopg2-binary`, `alembic`

### 5.2 Render Web Service

| Setting | Value |
|---------|--------|
| Root Directory | repo root |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |
| Pre-deploy / Release Command (optional) | `alembic upgrade head` |

**Environment variables (Render):**

- [ ] `DATABASE_URL` — Internal Postgres URL (auto if linked)
- [ ] `ANTHROPIC_API_KEY` — for Sira
- [ ] (Optional) `CORS_ORIGINS` — comma-separated Vercel + localhost URLs

### 5.3 Vercel

| Setting | Value |
|---------|--------|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output | `dist` |
| Env | `VITE_API_BASE_URL=https://<render-service>.onrender.com` |

- [ ] Redeploy after every `VITE_*` change

### 5.4 Git

- [ ] `.gitignore`: `.env`, `frontend/.env`, `*.pkl` if large (or use Git LFS)
- [ ] Do not commit secrets or production `DATABASE_URL`

---

## Phase 6 — End-to-end production verification

Run on **live Vercel URL** with DevTools → Network open.

### 6.1 Dashboard (`/dashboard`)

- [ ] `GET https://<render>/api/vulnerability/scores` → 200, FeatureCollection JSON
- [ ] `GET https://<render>/api/vulnerability/top-priority` → 200, array JSON
- [ ] External GeoJSON (GitHub) loads — map renders
- [ ] Click province → `GET /api/vulnerability/district/{id}` → 200
- [ ] **Refresh Feedback Loop** → `POST /api/feedback/refresh` → 200; message shows interaction/visit counts from **DB**

### 6.2 Radio (`/radio`, `/radio/:id`)

- [ ] Province list loads from scores API
- [ ] `GET /api/radio/script/{province_id}` → 200 with EN/FR/Mooré sections

### 6.3 Locator (`/locator`)

- [ ] `GET /api/locator/facilities/{province_id}` → facility list
- [ ] Log interaction → `POST /api/locator/interaction` → 201/200
- [ ] Confirm row in Render Postgres: `SELECT * FROM interaction_logs ORDER BY logged_at DESC LIMIT 5;`

### 6.4 Relay (`/relay`)

- [ ] `GET /api/relay/sync/{relay_id}` → relay + households
- [ ] Submit visit → `POST /api/relay/visit` → success
- [ ] Confirm row in `relay_visits` table
- [ ] Dashboard refresh reflects new visit counts

### 6.5 Sira (`/learn`)

- [ ] Chat message → `POST /api/sira/chat` → 200 (not 500 missing API key)

### 6.6 Persistence across redeploy

- [ ] Log interaction on production
- [ ] Trigger Render **manual deploy** or push commit
- [ ] After redeploy, interaction still in DB (proves Postgres, not ephemeral disk)

### 6.7 Failure modes to confirm fixed

- [ ] No requests to `127.0.0.1:8000` from Vercel origin
- [ ] No CORS errors in console
- [ ] No mixed-content (HTTPS page calling HTTP API)

---

## Phase 7 — Documentation & handoff

- [ ] Update root `README.md`:
  - Path 2 architecture diagram (Vercel → Render → Postgres)
  - Env var tables for Render + Vercel
  - Local dev: Docker Postgres or Render external URL + migrate + seed commands
- [ ] Link to this checklist: `docs/PATH2_DEPLOYMENT_CHECKLIST.md`
- [ ] Record production URLs in README or team doc (Render + Vercel)

---

## Suggested implementation order (for developers)

1. Phase 0 (frontend API_BASE + Vercel env + CORS) — **~1 hour**
2. Phase 1–2 (Postgres + schema + Alembic) — **~2–4 hours**
3. Phase 3 (seed script + run on Render) — **~2 hours**
4. Phase 4 (repository + main.py refactor) — **~4–8 hours**
5. Phase 5–6 (deploy config + full QA) — **~2 hours**

**Total estimate:** 1–2 days focused work for one developer.

---

## File map (what you will add/change)

| Action | Path |
|--------|------|
| Create | `docs/PATH2_DEPLOYMENT_CHECKLIST.md` (this file) |
| Create | `backend/requirements.txt` |
| Create | `backend/database/connection.py` |
| Create | `backend/database/repository.py` |
| Create | `backend/database/seed_db.py` |
| Create | `backend/migrations/` (Alembic) |
| Create | `frontend/src/lib/api.js` |
| Modify | `backend/main.py` |
| Modify | 5× `frontend/src/pages/*.jsx` |
| Modify | `README.md` |
| Create | `.env.example` |

---

## What “complete” looks like

| Requirement | Verified by |
|-------------|-------------|
| Live Postgres on Render | Rows persist after redeploy |
| Backend reads/writes SQL | Phase 6 locator/relay DB checks |
| Frontend uses Render HTTPS API | Network tab on Vercel |
| All 10 API routes work | Phase 6 checklist |
| Feedback loop uses real logs | Refresh shows counts; scores update in DB |
| Sira works in prod | `/learn` chat with `ANTHROPIC_API_KEY` set |

---

## Quick reference — URLs to fill in

| Service | Your URL (fill in) |
|---------|-------------------|
| Render API | `https://________________.onrender.com` |
| Vercel app | `https://________________.vercel.app` |
| Render Postgres | Internal URL in Render dashboard |

Copy these into `VITE_API_BASE_URL`, CORS `allow_origins`, and your runbook.
