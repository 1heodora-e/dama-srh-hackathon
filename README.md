# Dama SRH Intelligence Platform

Dama is a two-layer Sexual and Reproductive Health (SRH) equity platform for Burkina Faso.  
It combines district-level vulnerability intelligence for policy teams with community-facing access tools for women, girls, and frontline health workers.

## What Dama includes

- Layer 1: Equity Intelligence Dashboard (province vulnerability scoring + map + priority signals)
- Layer 2: Community Delivery System
  - Radio script intelligence portal (English, French, Mooré)
  - PWA-style CSPS locator
  - Relais Communautaire mobile workflow
  - Dama Sira educational layer (anonymous AI SRH chat + resources)
- Feedback loop: interaction signals can refresh vulnerability rankings

## Project Structure

```text
dama-srh-hackathon/
├─ backend/
│  ├─ main.py
│  ├─ models/schemas.py
│  ├─ ml/vulnerability_model.py
│  ├─ database/seed_data.py
│  └─ nlp/moore_templates.py
├─ frontend/
│  ├─ src/
│  │  ├─ pages/
│  │  ├─ components/
│  │  └─ styles/
│  ├─ public/
│  └─ package.json
└─ dama_prd.md
```

## Tech Stack

- Backend: FastAPI, Pydantic, pandas, numpy, scikit-learn, joblib
- Frontend: React 18, Vite, React Router, Leaflet, Recharts
- Styling: Centralized CSS (`frontend/src/styles/globals.css` + `frontend/src/styles/app.css`)
- AI chat: Anthropic Messages API via backend proxy endpoint

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### 1) Clone and open

```bash
git clone <your-repo-url>
cd dama-srh-hackathon
```

### 2) Backend setup

Install required Python packages:

```bash
py -3 -m pip install fastapi uvicorn pandas numpy scikit-learn joblib httpx
```

Set Anthropic key in your backend terminal session:

```powershell
$env:ANTHROPIC_API_KEY="your_anthropic_key_here"
```

Run backend:

```bash
py -3 -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Backend docs:

- [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3) Frontend setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

App URL:

- [http://localhost:5173](http://localhost:5173)

## Environment Variables

### Backend

- `ANTHROPIC_API_KEY` (required for `/api/sira/chat`)

### Frontend

Do not store Anthropic keys in frontend env.  
Frontend should call backend APIs only.

Optional frontend env for production API base:

```env
VITE_API_BASE_URL=https://your-backend-domain
```

## Application Routes (Frontend)

- `/` Landing
- `/dashboard` Equity intelligence dashboard
- `/radio` Radio intelligence portal
- `/radio/:provinceId` Province-specific radio generation
- `/locator` Facility and CSPS access page
- `/relay` Relais Communautaire portal
- `/learn` Dama Sira (Ask Sira + Resources)

## API Endpoints (Backend)

### Vulnerability + dashboard

- `GET /api/vulnerability/scores`
- `GET /api/vulnerability/district/{province_id}`
- `GET /api/vulnerability/top-priority`

### Radio intelligence

- `GET /api/radio/script/{province_id}`

### Locator

- `GET /api/locator/facilities/{province_id}`
- `POST /api/locator/interaction`

### Relay portal

- `GET /api/relay/sync/{relay_id}`
- `POST /api/relay/visit`

### Feedback loop

- `POST /api/feedback/refresh`

### Sira AI

- `POST /api/sira/chat`
  - Request supports `language_mode` (`auto`, `fr`, `en`)
  - Uses Anthropic via backend proxy

## Dama Sira Notes

- Anonymous by design: conversation state is held in React state (not persisted)
- Message cap: 20 messages per conversation
- Language options:
  - Auto (detect user language)
  - Forced French
  - Forced English

## Responsiveness

The UI includes responsive breakpoints for tablet and phone with improvements across:

- navigation wrapping
- grid collapse
- map height scaling
- form controls and button stacking
- mobile chat usability on `/learn`

## Deployment Guide (Recommended)

### Backend -> Render

- Build command: `pip install -r backend/requirements.txt` (or equivalent install flow)
- Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Add secret: `ANTHROPIC_API_KEY`

### Frontend -> Vercel

- Root directory: `frontend`
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_API_BASE_URL=https://your-backend-url`

### CORS hardening before production

In `backend/main.py`, replace wildcard origins with your frontend domain(s).

## Security Checklist

- Never commit `.env` files with secrets
- Keep Anthropic key backend-only
- Rotate any key that has appeared in terminal logs, commits, or screenshots
- Ensure `.gitignore` includes:
  - `.env`
  - `frontend/.env`

## Common Troubleshooting

### "Failed to fetch" in Sira chat

- Backend not running on `127.0.0.1:8000`
- `ANTHROPIC_API_KEY` missing in backend terminal environment
- Stale service worker/cache in browser

### "Unexpected token '<' ... is not valid JSON"

- Frontend received HTML instead of API JSON (usually stale frontend bundle or wrong endpoint)

### npm PowerShell execution policy error

Use:

```powershell
npm.cmd run dev
```

Or set:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Build Commands

Frontend production build:

```bash
cd frontend
npm run build
```

## Product Context

See `dama_prd.md` for full product requirements, user context, design system, and implementation scope.

# dama-srh-hackathon