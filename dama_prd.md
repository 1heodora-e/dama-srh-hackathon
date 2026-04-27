# DAMA — Product Requirements Document
### SRH Equity Intelligence Platform for Burkina Faso
**Version:** 1.0 | **Deadline:** April 27, 2026 | **Built by:** Theodora | **For:** CRA Public Sector Innovation Hackathon

---

## 1. PRODUCT OVERVIEW

### What is Dama?
Dama (meaning "enough" in Mooré, Burkina Faso's most spoken language) is a two-layer SRH equity intelligence platform that addresses the insufficient supply of sexual and reproductive health services in Burkina Faso. It connects the people who plan healthcare (district health officers and policymakers) with the women who need it, through a system built around radio — the one infrastructure that already reaches every community regardless of income, literacy, or phone access.

### The Core Insight
Burkina Faso's SRH crisis is not primarily an awareness problem. It is a **supply intelligence problem**. District health officers make resource allocation decisions without a real-time picture of where services are failing and why. Meanwhile, over 500 health facilities have closed due to conflict, leaving 2 million people without access to essential care. Nobody knows precisely where the collapse is worst.

Dama builds that picture — and connects the women being missed in the process.

### The Two Layers
- **Layer 1 — Equity Intelligence Engine:** ML-powered district vulnerability scoring dashboard for policymakers
- **Layer 2 — Radio Intelligence System:** District-specific SRH radio broadcast content + a reach cascade (QR PWA → callback number → Relais Communautaire portal) that meets women wherever they are on the digital access spectrum

### The Feedback Loop
```
Equity Map → Informs Radio Script → Drives Community Access → Generates Interaction Data → Updates Equity Map
```
The system gets smarter every broadcast cycle.

---

## 2. PROBLEM STATEMENT
**Selected Challenge:** Burkina Faso — "Burkina Faso faces an insufficient supply of sexual and reproductive health services, leaving a significant portion of the population without adequate care and hindering the country's progress toward universal health coverage."

### Key Statistics (real data for pitch)
- Maternal mortality ratio: ~263.8 deaths per 100,000 live births
- Neonatal mortality rate: ~24.6 deaths per 1,000 live births
- 500+ health facilities closed due to conflict (northern and eastern regions)
- 31% of health facilities affected by the security crisis; 17.7% completely closed
- Only 51.6% of service delivery points had contraceptive products available (2020)
- 51.3% of women aged 20–24 were married before age 18
- 58.2% of women of reproductive age had family planning needs met with modern methods
- 6 million people affected by the humanitarian crisis; 2 million urgently need healthcare
- Family planning declared free nationwide July 2020 — but supply gaps persist

---

## 3. TARGET USERS

### Primary Users
| User | Description | Uses |
|------|-------------|------|
| District Health Officers | Government officials managing SRH resource allocation across Burkina Faso's 45 provinces | Layer 1 Dashboard |
| Ministry of Health Officials | National-level policymakers making budget and intervention decisions | Layer 1 Dashboard + Export |
| Radio Station Coordinators | Staff at community radio stations (100+ in Burkina Faso) | Radio Script Portal |
| Relais Communautaires | Community health relays doing door-to-door outreach | Relay Portal |
| Women in rural/peri-urban communities | End beneficiaries accessing SRH facility information | PWA Locator |

---

## 4. VISUAL DESIGN SYSTEM

### Brand Identity
- **Name:** Dama
- **Meaning:** "Enough" in Mooré — the problem is insufficiency, the solution is Dama
- **Logo:** Path curving into radio waves (terracotta on dark/sand backgrounds) — already generated
- **Tagline:** *"Enough care. For every woman. Everywhere."*

### Color Palette
```css
:root {
  /* Primary */
  --terracotta: #C1440E;
  --terracotta-light: #E8612A;
  --terracotta-dark: #8B2F08;

  /* Backgrounds */
  --dark-base: #1A1A2E;
  --dark-surface: #16213E;
  --dark-card: #0F3460;
  --sand: #F2E0C8;
  --sand-dark: #E8C9A0;

  /* Accent */
  --forest-green: #2D6A4F;
  --forest-light: #40916C;

  /* Vulnerability Scale (map colors) */
  --vuln-low: #F2E0C8;      /* sand — low vulnerability */
  --vuln-medium: #E8A87C;   /* amber */
  --vuln-high: #C1440E;     /* terracotta */
  --vuln-critical: #6B1A06; /* deep red — conflict zones */

  /* Text */
  --text-primary: #F2E0C8;
  --text-secondary: #A89B8C;
  --text-dark: #1A1A2E;

  /* UI */
  --border: rgba(194, 68, 14, 0.2);
  --glow: rgba(194, 68, 14, 0.15);
}
```

### Typography
```css
/* Import in index.html */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;0,700;1,300&family=DM+Sans:wght@300;400;500;600&display=swap');

--font-display: 'Fraunces', serif;    /* Headers, logo wordmark */
--font-body: 'DM Sans', sans-serif;  /* UI, labels, body text */
```

### Visual Texture
- Subtle grain overlay on all backgrounds (use CSS noise filter or SVG feTurbulence)
- Warm shadow system: `box-shadow: 0 4px 24px rgba(194, 68, 14, 0.12)`
- Smooth animated transitions: `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`
- Pulsing indicators for conflict-affected districts
- Counting number animations when dashboard loads

### Dark Mode (Dashboard) vs Light Mode (PWA/Radio Portal)
- Dashboard: dark base `#1A1A2E` — mission control feel
- Radio Script Portal: sand `#F2E0C8` — newsroom/editorial feel
- PWA Locator: white with terracotta accents — clean, accessible, mobile

---

## 5. TECHNICAL ARCHITECTURE

### Full Stack
```
Frontend:     React + Tailwind CSS + Leaflet.js + Recharts
Backend:      FastAPI (Python)
Database:     PostgreSQL + PostGIS
ML:           scikit-learn (Random Forest), GeoPandas, Pandas
NLP:          HuggingFace Transformers (multilingual, CPU-only)
Voice:        Africa's Talking API (callback system)
Hosting:      Railway or Render (free tier)
PWA:          React PWA with offline-first service worker
```

### No GPU Required
All ML components run on CPU:
- Random Forest on tabular data (45 provinces × ~20 features) trains in seconds
- HuggingFace distilled multilingual model for French NLP inference (CPU-compatible)
- Mooré: template-based generation with variable substitution (instant, no ML needed)
- Synthetic data generation: numpy/pandas statistical sampling only

---

## 6. DATA SOURCES

| Source | Data | Layer |
|--------|------|-------|
| INSD (Institut National de la Statistique et de la Démographie) | District population, poverty rates | Layer 1 |
| DHS Program 2021 (Burkina Faso) | SRH indicators by region, contraceptive prevalence | Layer 1 |
| OpenStreetMap | Health facility locations, road networks, distance calculations | Both |
| WHO/OCHA HDX | Conflict-affected zone data, facility closure data | Layer 1 |
| UNHCR | Displacement population by district | Layer 1 |
| Africa's Talking | Voice callback infrastructure | Layer 2 |
| Community radio stations | Broadcast distribution network | Layer 2 |

### Synthetic Data Pipeline (for missing district data)
- Same approach as PadRoute's NISR synthetic generation
- Statistical sampling from known district distributions
- Clearly flagged in dashboard as "estimated" vs "verified" data

---

## 7. COMPONENT SPECIFICATIONS

---

### COMPONENT 1: ML Vulnerability Engine

**File:** `backend/ml/vulnerability_model.py`

**Features per district (input to Random Forest):**
```python
features = [
    'population_density',
    'poverty_rate',
    'distance_to_nearest_csps_km',
    'number_of_open_csps',
    'number_of_closed_csps',         # conflict closures
    'chw_density_per_1000',          # Relais Communautaires
    'contraceptive_availability_pct',
    'modern_contraceptive_prevalence',
    'maternal_mortality_rate',
    'adolescent_birth_rate',
    'displacement_population',
    'conflict_affected_binary',
    'distance_to_nearest_cma_km',    # district hospital
    'female_literacy_rate',
    'child_marriage_rate_pct'
]
```

**Output:** Vulnerability score 0–100 per province, with component breakdown

**Model:** Random Forest Classifier (scikit-learn)
- Train/test on DHS + INSD combined dataset
- Synthetic fill for missing values clearly flagged
- Feature importance chart exported for dashboard visualization
- Save model as `dama_vulnerability_model.pkl`

**API Endpoint:**
```
GET /api/vulnerability/scores          → all 45 provinces scored
GET /api/vulnerability/district/{id}   → single district detail
GET /api/vulnerability/top-priority    → top 10 most vulnerable
POST /api/vulnerability/refresh        → retrain with new interaction data
```

---

### COMPONENT 2: District Intelligence Dashboard

**File:** `frontend/src/pages/Dashboard.jsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  DAMA logo    Last updated: [timestamp]    Export PDF│
├──────────────┬──────────────────────┬───────────────┤
│              │                      │               │
│  Priority    │   BURKINA FASO MAP   │   District    │
│  List        │   (Choropleth)       │   Detail      │
│  Top 10      │                      │   Panel       │
│  Districts   │                      │               │
│              │                      │               │
├──────────────┴──────────────────────┴───────────────┤
│  Trend Charts    |    Key Stats Bar                  │
└─────────────────────────────────────────────────────┘
```

**Map Component (Leaflet.js):**
- Burkina Faso GeoJSON with 45 provinces
- Choropleth coloring: sand → amber → terracotta → deep red by vulnerability score
- Click district → populates right detail panel
- Conflict overlay toggle (red hatching on conflict-affected zones)
- Pulsing red dot animation on top 3 most critical districts
- Smooth color transition animation on load
- Tooltip on hover: district name + score + top risk factor

**Priority List (Left Sidebar):**
- Ranked 1–10 most vulnerable districts
- Each item: rank number, district name, score badge, primary risk factor tag
- Click to select district on map
- Color-coded score badges matching map scale

**District Detail Panel (Right Sidebar):**
- District name in Fraunces display font
- Vulnerability score (large, animated count-up on select)
- Breakdown cards:
  - Open CSPS facilities (count)
  - Closed facilities (count, red)
  - CHW density per 1,000 women
  - Contraceptive availability %
  - Displacement population
  - Conflict status (badge)
- Feature importance mini-bar chart (what's driving the score)
- "Generate Radio Script" button → links to Radio Portal for this district

**Stats Bar (Bottom):**
- Total population without adequate SRH access (calculated)
- Average distance to nearest open facility (national)
- Facilities closed due to conflict (count)
- Districts in critical vulnerability range (count)
- All numbers animate on page load

**Visual Details:**
- Dark `#1A1A2E` background with grain texture overlay
- Terracotta glow on selected district panel
- Smooth panel slide-in animation on district select
- Export to PDF button generates policy-ready report

---

### COMPONENT 3: Radio Script Portal

**File:** `frontend/src/pages/RadioPortal.jsx`

**Purpose:** Radio station coordinators log in, select their district, download this week's generated SRH broadcast script

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  DAMA  |  Radio Portal          [District Selector] │
├──────────────────────────┬──────────────────────────┤
│   FRENCH SCRIPT          │   MOORÉ SCRIPT           │
│                          │                          │
│  [Generated content]     │  [Template-filled]       │
│                          │                          │
│                          │                          │
├──────────────────────────┴──────────────────────────┤
│  Broadcast Schedule  |  Download PDF  |  Archive    │
└─────────────────────────────────────────────────────┘
```

**Script Generation (NLP Backend):**
```python
# French: HuggingFace multilingual model
# Input: district vulnerability data dict
# Output: structured radio script

script_template = {
    "opening": "Bienvenue sur Dama Santé...",
    "district_update": f"Dans la province de {district_name}...",
    "nearest_facility": f"Le CSPS le plus proche est à {distance}km...",
    "services_available": f"Services disponibles: {services_list}...",
    "chw_contact": f"Contactez votre Relais Communautaire: {chw_name}...",
    "srh_tip": "[NLP generated health tip relevant to district profile]",
    "qr_announcement": "Scannez le code Dama à votre CSPS pour plus d'informations",
    "closing": "Dama — assez de soins, pour chaque femme, partout."
}
```

**Mooré Template System:**
```python
# Template-based (no ML needed for MVP)
mooré_templates = {
    "opening": "Dama Laafi yãmb saam...",           # Welcome to Dama Health
    "nearest_facility": "CSPS {name} bee {distance}km...",
    "chw_contact": "Relais Communautaire {name}..."
}
```

**Visual Style:**
- Sand `#F2E0C8` background — editorial/newsroom feel
- Two-column script layout side by side
- Typewriter animation as script generates
- Download button exports formatted PDF with Dama branding
- Broadcast calendar showing scheduled air times
- Archive of past scripts by district and date

---

### COMPONENT 4: PWA Facility Locator

**File:** `frontend/src/pages/Locator.jsx` (configured as PWA)

**Access:** Via QR code on posters at CSPS facilities and community radio stations

**Mobile-first, single screen design:**
```
┌─────────────────────┐
│  dama    [FR | MRE] │  ← language toggle
├─────────────────────┤
│                     │
│  📍 Your nearest    │
│  CSPS:              │
│                     │
│  ┌─────────────────┐│
│  │ Centre de Santé ││
│  │ de Titao        ││
│  │ 2.3 km away     ││
│  │ ● Open today    ││
│  │ Services:       ││
│  │ • Family plan.  ││
│  │ • Prenatal care ││
│  │ • GBV support   ││
│  │ [📞 CHW Contact]││
│  └─────────────────┘│
│                     │
│  Other facilities:  │
│  [Card 2] [Card 3]  │
│                     │
└─────────────────────┘
```

**Technical Implementation:**
- React PWA with service worker for offline-first caching
- District data cached on first load — works with poor/no connectivity
- Language toggle: French ↔ Mooré (template-based Mooré)
- Facility data pulled from PostGIS spatial query (nearest 3 CSPS by coordinates)
- If no GPS: user selects province from dropdown
- Tap-to-call button for CHW contact
- Every QR scan logs anonymized district-level access request → feeds Layer 1

**PWA Config:**
```json
{
  "name": "Dama",
  "short_name": "Dama",
  "theme_color": "#C1440E",
  "background_color": "#F2E0C8",
  "display": "standalone",
  "start_url": "/locator"
}
```

---

### COMPONENT 5: Relais Communautaire Portal

**File:** `frontend/src/pages/RelayPortal.jsx`

**Purpose:** Community health relays log visit outcomes, generating anonymized data that feeds Layer 1

**Mobile-optimized layout:**
```
┌─────────────────────┐
│  dama relay         │
│  Bonjour, [Name]    │
├─────────────────────┤
│  Today's visits: 4  │
│  ✓ Household 1      │
│  ✓ Household 2      │
│  ○ Household 3      │
│  ○ Household 4      │
├─────────────────────┤
│  Log Visit Outcome: │
│  [Anonymous Form]   │
│  SRH needs flagged? │
│  ○ Yes  ○ No        │
│  Facility referred? │
│  ○ Yes  ○ No        │
│  [Submit]           │
├─────────────────────┤
│  ⟳ Last sync: 2h ago│
└─────────────────────┘
```

**Data Logged (all anonymous):**
- District/commune of visit
- SRH need flagged (yes/no)
- Facility referral made (yes/no)
- Service type needed (family planning, maternal care, GBV, other)
- Sync timestamp

**This data feeds directly into the vulnerability model refresh endpoint**

---

### COMPONENT 6: The Feedback Loop Engine

**File:** `backend/feedback/loop.py`

**How it works:**
```python
def weekly_refresh():
    # 1. Aggregate interaction data from past 7 days
    qr_scans = get_qr_interactions_by_district()
    relay_logs = get_relay_visit_logs()
    callback_entries = get_callback_data()  # from Africa's Talking API

    # 2. Generate new demand signal features
    demand_signals = {
        'access_requests_per_1000': qr_scans / population,
        'relay_srh_flags_pct': relay_logs.srh_flagged / relay_logs.total,
        'unmet_referral_rate': relay_logs.no_referral / relay_logs.srh_flagged
    }

    # 3. Retrain/update vulnerability model
    model.update_features(demand_signals)

    # 4. Regenerate radio scripts for top priority districts
    generate_scripts_for_top_10()

    # 5. Update dashboard
    refresh_vulnerability_scores()
```

**Schedule:** Weekly cron job (or manual trigger for MVP demo)

---

## 8. BACKEND API STRUCTURE

**File:** `backend/main.py` (FastAPI)

```
/api/vulnerability/
    GET  /scores                    → all district scores
    GET  /district/{province_id}    → single district detail
    GET  /top-priority              → top 10 list
    POST /refresh                   → trigger model refresh

/api/radio/
    GET  /script/{province_id}      → generate script for district
    GET  /archive/{province_id}     → past scripts
    POST /schedule                  → set broadcast schedule

/api/locator/
    GET  /facilities/nearest        → nearest 3 CSPS by coords
    GET  /facilities/{province_id}  → all facilities in province
    POST /interaction               → log QR scan (anonymous)

/api/relay/
    POST /visit                     → log relay visit outcome
    GET  /sync/{relay_id}           → get relay's assigned visits

/api/feedback/
    POST /refresh                   → trigger weekly loop
    GET  /stats                     → interaction summary
```

---

## 9. DATABASE SCHEMA

```sql
-- Provinces (45 Burkina Faso provinces)
CREATE TABLE provinces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    region VARCHAR(100),
    population INTEGER,
    poverty_rate DECIMAL,
    female_literacy_rate DECIMAL,
    child_marriage_rate DECIMAL,
    conflict_affected BOOLEAN,
    displacement_population INTEGER,
    geometry GEOMETRY(MULTIPOLYGON, 4326)  -- PostGIS
);

-- Health Facilities (CSPS, CMA, CHR)
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    facility_type VARCHAR(50),  -- CSPS, CMA, CHR
    province_id INTEGER REFERENCES provinces(id),
    is_open BOOLEAN,
    closure_reason VARCHAR(100),  -- conflict, staffing, etc.
    services TEXT[],              -- available SRH services
    chw_count INTEGER,
    contraceptive_available BOOLEAN,
    location GEOMETRY(POINT, 4326)
);

-- Vulnerability Scores
CREATE TABLE vulnerability_scores (
    id SERIAL PRIMARY KEY,
    province_id INTEGER REFERENCES provinces(id),
    score DECIMAL,               -- 0-100
    score_date TIMESTAMP,
    component_scores JSONB,      -- breakdown by feature
    data_quality VARCHAR(20)     -- 'verified' or 'estimated'
);

-- Radio Scripts
CREATE TABLE radio_scripts (
    id SERIAL PRIMARY KEY,
    province_id INTEGER REFERENCES provinces(id),
    script_french TEXT,
    script_moore TEXT,
    generated_at TIMESTAMP,
    broadcast_date DATE,
    station_name VARCHAR(200)
);

-- Interaction Logs (anonymous)
CREATE TABLE interaction_logs (
    id SERIAL PRIMARY KEY,
    interaction_type VARCHAR(50),  -- qr_scan, callback, relay_visit
    province_id INTEGER REFERENCES provinces(id),
    srh_need_flagged BOOLEAN,
    referral_made BOOLEAN,
    service_type VARCHAR(100),
    logged_at TIMESTAMP
);

-- Relais Communautaires
CREATE TABLE relays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    province_id INTEGER REFERENCES provinces(id),
    commune VARCHAR(100),
    phone VARCHAR(20),
    assigned_households INTEGER
);
```

---

## 10. PROJECT FOLDER STRUCTURE

```
dama/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json          # PWA config
│   │   ├── dama-logo.png
│   │   └── service-worker.js
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/
│   │   │   │   ├── BurkinaMap.jsx
│   │   │   │   ├── DistrictLayer.jsx
│   │   │   │   └── ConflictOverlay.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── PriorityList.jsx
│   │   │   │   ├── DistrictDetail.jsx
│   │   │   │   └── StatsBar.jsx
│   │   │   ├── Radio/
│   │   │   │   ├── ScriptDisplay.jsx
│   │   │   │   └── BroadcastCalendar.jsx
│   │   │   ├── Locator/
│   │   │   │   ├── FacilityCard.jsx
│   │   │   │   └── LanguageToggle.jsx
│   │   │   └── shared/
│   │   │       ├── DamaLogo.jsx
│   │   │       ├── VulnerabilityBadge.jsx
│   │   │       └── LoadingState.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── RadioPortal.jsx
│   │   │   ├── Locator.jsx
│   │   │   └── RelayPortal.jsx
│   │   ├── hooks/
│   │   │   ├── useVulnerabilityData.js
│   │   │   ├── useDistrictSelect.js
│   │   │   └── useOfflineCache.js
│   │   ├── utils/
│   │   │   ├── colorScale.js      # vuln score → color mapping
│   │   │   ├── formatters.js
│   │   │   └── mooréTemplates.js  # Mooré language templates
│   │   ├── styles/
│   │   │   └── globals.css        # CSS variables + base styles
│   │   └── App.jsx
├── backend/
│   ├── main.py                    # FastAPI app
│   ├── ml/
│   │   ├── vulnerability_model.py
│   │   ├── synthetic_data.py
│   │   ├── feature_engineering.py
│   │   └── dama_model.pkl         # saved model
│   ├── nlp/
│   │   ├── script_generator.py    # French NLP
│   │   └── moore_templates.py     # Mooré template system
│   ├── feedback/
│   │   └── loop.py
│   ├── routers/
│   │   ├── vulnerability.py
│   │   ├── radio.py
│   │   ├── locator.py
│   │   └── relay.py
│   ├── models/
│   │   └── schemas.py             # Pydantic models
│   └── database/
│       ├── connection.py
│       ├── seed_data.py           # real Burkina Faso data
│       └── migrations/
├── data/
│   ├── raw/
│   │   ├── burkina_provinces.geojson
│   │   ├── dhs_2021_srh.csv
│   │   ├── insd_population.csv
│   │   ├── osm_health_facilities.geojson
│   │   └── ocha_conflict_zones.geojson
│   ├── processed/
│   │   └── district_features.csv
│   └── synthetic/
│       └── synthetic_districts.csv
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_feature_engineering.ipynb
│   ├── 03_model_training.ipynb
│   └── 04_vulnerability_scoring.ipynb
├── requirements.txt
├── package.json
└── README.md
```

---

## 11. MVP SCOPE FOR MAY 8 DEMO

### Must Have (build first)
- [ ] Burkina Faso choropleth vulnerability map with real province data
- [ ] Random Forest model trained and scoring all 45 provinces
- [ ] Interactive district detail panel on map click
- [ ] Top 10 priority districts list
- [ ] One complete radio script generated (French + Mooré) for highest-vulnerability district
- [ ] Working QR code linking to PWA facility locator
- [ ] PWA showing 3 nearest facilities with services listed
- [ ] Feedback loop architecture diagram (can be visual, doesn't need to be fully live)

### Nice to Have (if time allows)
- [ ] Relay Communautaire portal (basic form)
- [ ] PDF export for policy report
- [ ] Trend chart showing vulnerability change over time
- [ ] Conflict overlay toggle on map
- [ ] Script archive by district

### Pitch Deck Only (show as diagram, not built)
- Africa's Talking callback voice system
- Full NLP pipeline fine-tuned on SRH vocabulary
- Weekly automated feedback loop cron job
- Multi-station broadcast scheduling system

---

## 12. CURSOR PROMPTING GUIDE

### Start here — Prompt 1 (Data + ML Backend)
```
Build the Dama ML vulnerability engine for Burkina Faso's 45 provinces.

Create backend/ml/vulnerability_model.py with:
- A Random Forest classifier using scikit-learn
- Features: population_density, poverty_rate, distance_to_nearest_csps_km, 
  number_of_open_csps, number_of_closed_csps, chw_density_per_1000, 
  contraceptive_availability_pct, maternal_mortality_rate, 
  adolescent_birth_rate, displacement_population, conflict_affected_binary,
  child_marriage_rate_pct
- Synthetic data generation for all 45 Burkina Faso provinces using 
  realistic distributions based on DHS 2021 data ranges
- Output: vulnerability score 0-100 per province + component breakdown
- Save trained model as dama_model.pkl

Also create backend/database/seed_data.py with:
- All 45 Burkina Faso province names and regions
- Realistic SRH indicator ranges from DHS 2021
- 10 provinces flagged as conflict-affected (northern/eastern regions: 
  Sahel, Est, Nord, Centre-Nord most affected)
- Sample CSPS facility data per province

Use pandas, scikit-learn, numpy. No GPU required.
```

### Prompt 2 (FastAPI Backend)
```
Build the Dama FastAPI backend in backend/main.py.

Connect to the vulnerability model from Prompt 1 and create these endpoints:
- GET /api/vulnerability/scores → all 45 province scores as GeoJSON-ready JSON
- GET /api/vulnerability/district/{province_id} → full detail breakdown
- GET /api/vulnerability/top-priority → top 10 most vulnerable provinces
- GET /api/radio/script/{province_id} → generate French radio script for district
- POST /api/locator/interaction → log anonymous QR scan interaction
- GET /api/locator/facilities/{province_id} → facilities in province

For radio script generation, create a template-based system that takes 
district vulnerability data and generates a structured SRH radio broadcast 
script in French. Include: nearest open CSPS, available services, CHW contact 
prompt, district-specific health tip based on top vulnerability factor, 
and Dama QR code announcement.

Also create a Mooré template system in backend/nlp/moore_templates.py with 
key phrases translated for: welcome, nearest facility, CHW contact, closing.

Use FastAPI, pydantic for schemas, and CORS enabled for React frontend.
```

### Prompt 3 (Dashboard — Most Important Visual)
```
Build the Dama district intelligence dashboard in frontend/src/pages/Dashboard.jsx.

DESIGN SYSTEM:
- Dark background #1A1A2E with subtle grain texture
- Terracotta accent #C1440E
- Sand secondary #F2E0C8  
- Fonts: Fraunces (headers) + DM Sans (body) from Google Fonts
- Warm shadows: box-shadow: 0 4px 24px rgba(194, 68, 14, 0.12)

LAYOUT (three-column):
Left sidebar (25%): Priority list of top 10 most vulnerable provinces
  - Rank number, province name, vulnerability score badge, primary risk tag
  - Terracotta gradient badges from amber (low) to deep red (critical)
  - Click to select province on map

Center (50%): Burkina Faso choropleth map using Leaflet.js
  - Load burkina_provinces.geojson
  - Color provinces by vulnerability score: sand → amber → terracotta → deep red
  - Hover tooltip: province name + score + top risk factor
  - Click → updates right detail panel
  - Pulsing animation on top 3 most critical provinces
  - Conflict overlay toggle button (hatching on affected zones)

Right sidebar (25%): District detail panel
  - Province name in Fraunces font, large
  - Vulnerability score with animated count-up on load
  - Metric cards: open CSPS, closed facilities, CHW density, 
    contraceptive availability, displacement population
  - Conflict status badge
  - "Generate Radio Script" button linking to /radio/{province_id}

Bottom stats bar:
  - Total population without SRH access, avg distance to facility, 
    facilities closed, critical districts count
  - All numbers animate on page load

Top bar: Dama logo + "Last updated" timestamp + "Export PDF" button

Make it look like a professional mission control dashboard. 
Stunning, dark, data-rich, warm terracotta glow effects.
```

### Prompt 4 (Radio Script Portal)
```
Build the Dama Radio Script Portal in frontend/src/pages/RadioPortal.jsx.

DESIGN: Sand #F2E0C8 background, editorial/newsroom aesthetic, 
Fraunces headers, warm and professional.

LAYOUT:
- Top: Province selector dropdown + "Generate Script" button
- Main: Two-column layout — French script left, Mooré script right
- Each script in a clean card with typewriter animation as it loads
- Bottom: Download as PDF button, broadcast calendar, script archive

Connect to GET /api/radio/script/{province_id} endpoint.

The script display should show:
- Opening greeting
- District-specific update (vulnerability context)
- Nearest open CSPS name and distance
- Available SRH services list
- CHW contact information
- Weekly SRH health tip
- QR code announcement
- Closing tagline: "Dama — assez de soins, pour chaque femme, partout"

Mooré column: template-filled version of same content.

Add a broadcast schedule calendar component showing planned air dates.
Make it feel like a professional radio production tool.
```

### Prompt 5 (PWA Facility Locator)
```
Build the Dama PWA facility locator in frontend/src/pages/Locator.jsx.

Configure as a Progressive Web App with:
- manifest.json: name "Dama", theme_color "#C1440E", background "#F2E0C8"
- Service worker for offline-first caching of district facility data

DESIGN: Mobile-first, clean white with terracotta accents, 
DM Sans font, very simple and accessible.

Single screen layout:
- Dama logo top left, language toggle (FR | MRE) top right
- Hero card: nearest CSPS name, distance, open/closed status badge,
  services list (family planning, prenatal, GBV support, etc.),
  tap-to-call CHW button
- Below: two smaller cards for next 2 nearest facilities  
- Province dropdown if no GPS location available

Connect to GET /api/locator/facilities/{province_id}.
Log anonymous interaction on load: POST /api/locator/interaction.

Offline behavior: cache province facility data on first load,
show "offline mode" indicator if no connectivity,
serve cached data seamlessly.

This is accessed via QR code by women in rural Burkina Faso.
Make it extremely simple, clear, and fast-loading.
```

---

## 13. PITCH DECK STRUCTURE (5 minutes)

| Slide | Content | Time |
|-------|---------|------|
| 1 | Dama logo full screen. No text. Just the mark. | 10s |
| 2 | The numbers: 500+ closed facilities. 2M without care. 263 maternal deaths per 100k. | 30s |
| 3 | "This isn't an awareness problem. It's a supply intelligence problem." | 20s |
| 4 | Full-screen Dama vulnerability map of Burkina Faso | 30s |
| 5 | The two layers explained + feedback loop diagram | 45s |
| 6 | Live dashboard demo | 60s |
| 7 | Radio system + reach cascade diagram | 30s |
| 8 | PWA locator demo (QR scan live) | 30s |
| 9 | Localization: Mooré, CSPS, Relais Communautaires, conflict zones | 20s |
| 10 | Implementation pathway: pilot one district, partner with Ministry of Health | 20s |
| 11 | Dama. Enough care. For every woman. Everywhere. | 15s |

---

## 14. KEY DIFFERENTIATORS (for Q&A)

**"Why radio?"**
Radio reaches 80%+ of rural Burkina Faso regardless of income, literacy, or phone access. Every other solution in this room requires a smartphone. Dama doesn't.

**"Why not USSD?"**
USSD is oversaturated in health hackathon solutions and requires women to self-navigate unfamiliar menus. Radio meets women in their daily lives without asking anything of them.

**"How is the ML model trained without real labeled data?"**
Synthetic data generation using real DHS 2021 distribution ranges for each province, same methodology used in production ML pipelines for low-data environments. Clearly flagged as estimated where applicable.

**"How does the feedback loop work in practice?"**
Every QR scan and relay visit log contributes an anonymized demand signal to the vulnerability model. After 8 weeks of deployment, the model has real community interaction data replacing synthetic estimates district by district.

**"What does implementation actually look like?"**
Pilot with one district health office and 3 community radio stations. Existing Relais Communautaire network already has phones — they need the portal, not new infrastructure. Ministry of Health partnership for CSPS data access.

---

## 15. QUICK REFERENCE

- **Burkina Faso provinces:** 45
- **Regions:** 13
- **CSPS (primary health centers):** ~1,900 nationally
- **CMA (district hospitals):** 45
- **Community radio stations:** 100+
- **Relais Communautaires:** nationwide network
- **Official language:** French
- **Main local languages:** Mooré (~50% speakers), Dioula (western regions)
- **Conflict-affected regions:** Sahel, Est, Nord, Centre-Nord most severe
- **Key data sources:** INSD, DHS 2021, OpenStreetMap, OCHA HDX, WHO AFRO

---

*Built for the CRA Public Sector Student Innovation Hackathon — May 8, 2026*
*Theodora | African Leadership University | Swift Haven Africa*
