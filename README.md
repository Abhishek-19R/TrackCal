# NutriTrack 🥗

> A polished, modern, open-source nutrition and food tracking web application designed for self-hosting and local ownership.

[![Phase](https://img.shields.io/badge/Phase_3B-Completed-success?style=flat-square)](file:///c:/Projects/Trackal/ARCHITECTURE.md)
[![Tests](https://img.shields.io/badge/Tests-86_Passing-brightgreen?style=flat-square)](#)
[![Frontend](https://img.shields.io/badge/Frontend-Vite_+_React_19_+_Tailwind_v4-10b981?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](#)
[![Python](https://img.shields.io/badge/Backend-FastAPI_+_PyMongo_Async_+_Pydantic-3776AB?style=flat-square)](#)
[![Database](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square)](#)

---

## 📌 Project Overview

NutriTrack empowers individuals to track their daily calories, macronutrients (proteins, fats, carbs), micronutrients, meals, and body weight with total data privacy and zero vendor lock-in.

### Core Product Principles
* 🌿 **AI-Independent Core**: Every single feature in NutriTrack (calorie calculation, food search, meal logging, weight analysis) works deterministically without requiring an AI model or internet connectivity.
* 🤖 **Optional AI Enhancement (Client-Side Key Only)**: Optional natural language food parsing can be enabled by the user with their own private API keys (OpenAI / Gemini / Anthropic). Keys are stored strictly on the user's local device, never persisted in MongoDB or on the server.
* 🔒 **Data Privacy & Ownership**: Your health and body metrics remain yours. Strict user-scoped isolation for all personal logs. Run it locally or host it on your own server. Full JSON export/import supported.
* 🏠 **Installer's MongoDB Ownership**: NutriTrack connects strictly to the installer's own MongoDB deployment (local or private Atlas). The repo never contains credentials, and no centralized maintainer cluster is required.
* 🍎 **Hybrid Food-Data Model**: Rather than an unmaintainable worldwide monolithic database, NutriTrack uses a 4-tier model: Starter seed foods, public external source queries with attribution, optional local caching, and user-owned custom foods.
* ⚡ **Performance & Polish**: Built with modern web standards, responsive UI, micro-animations, and instant search.

---

## 📊 Current Project Status & Progress Tracker

> **Current Phase**: **Phase 3B (Personalized Nutrition Onboarding) — COMPLETED**  
> **Backend Baseline**: **86 automated tests passing** (pytest + in-memory AsyncMockDatabase)  
> **Frontend Baseline**: **TypeScript strict build passing (`tsc -b && vite build`) & 0 lint warnings (`oxlint`)**  
> **Stitch MCP Design System**: **"NutriTrack Emerald Calm" verified & integrated** (`#10b981`, Plus Jakarta Sans, Inter)  
> Next Up: **Phase 4 (Core User Workflows & Recharts Visualizations)**

If an AI assistant's context limit is reached, you can seamlessly continue with another model by referencing this status and [ARCHITECTURE.md](file:///c:/Projects/Trackal/ARCHITECTURE.md).

| Phase | Description | Status | Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 0** | **Project Initialization & Design** | ✅ **Done** | Tech stack validation, MCP environment check, data model design, API contracts, routing spec, [ARCHITECTURE.md](file:///c:/Projects/Trackal/ARCHITECTURE.md). |
| **Phase 1** | **Backend Foundation & Database** | ✅ **Done** | FastAPI scaffolding, native PyMongo Async connection pool (`AsyncMongoClient`), Pydantic v2 schemas/models, safe PyObjectId serializer, index manager, `GET /api/v1/health`, locked food provenance, 27 passing automated tests. |
| **Phase 2A** | **Food Data Layer & Food APIs** | ✅ **Done** | 20-food starter dataset with seed script, `FoodRepository` + `FoodService` layered architecture, food search + CRUD endpoints, 4-tier ownership isolation, `CurrentUser` auth boundary, in-memory mock DB for tests, 42 total passing tests. |
| **Phase 2B** | **Meal Logging & Weight Tracking** | ✅ **Done** | Deterministic nutrition calculator, meal logging CRUD & daily summary aggregation, historical snapshot retention, weight tracking with lbs/kg normalization, 69 total passing tests. |
| **Phase 2C** | **External Food Providers** | 📋 Deferred | USDA FoodData Central / Open Food Facts integration, local caching. |
| **Phase 3** | **Frontend Foundation & Design System** | ✅ **Done** | Vite + React 19 + Tailwind CSS v4, Google Stitch design tokens ("NutriTrack Emerald Calm"), typed API client with `X-User-ID`, responsive shell (Sidebar, Header, MobileNav, DevUserBanner), reusable UI primitives, Dashboard, Food Log, Food Database, Weight Tracker, Analytics, Settings, oxlint + TS clean. |
| **Phase 3B** | **Personalized Nutrition Onboarding** | ✅ **Done** | Mifflin–St Jeor BMR & TDEE calculator, goal/activity adjustments, safety floors, user-scoped settings, target override state machine, baseline weight log, 6 REST endpoints (86 passing backend tests), multi-step OnboardingModal wizard, live preview, Settings profile management & recalculation, Dashboard integration. |
| **Phase 4** | **Core User Workflows** | ⏳ **Next** | Interactive Daily Dashboard enhancements, inline meal item modification, Recharts weight line charts. |
| **Phase 5** | **Analytics & Portability** | 📋 Pending | 7/30/90-day trend analytics, JSON backup export/import, UI polish. |
| **Phase 6** | **Optional AI Features** | 📋 Pending | Client-side user-provided key for natural language food entry. |

---

## 🛠️ Technology Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts *(Phase 3)*
* **Backend**: Python 3.13, FastAPI, Pydantic v2, PyMongo Native Async API (`AsyncMongoClient`)
* **Database**: MongoDB (Atlas or local instance owned by installer)
* **Design Integration**: Google Stitch MCP (Active & verified)
* **Testing**: Pytest (backend), Vitest + React Testing Library (frontend)

---

## 📁 Repository Structure

```
Trackal/
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── api/                  # API routes & dependency injection
│   │   │   ├── deps.py           # get_current_user, get_db providers
│   │   │   └── v1/endpoints/     # health.py, foods.py, meals.py, weights.py, user_settings.py
│   │   ├── core/                 # config, database, auth boundary, exceptions
│   │   ├── models/               # MongoDB BSON documents & Pydantic ODM (user_settings.py, etc.)
│   │   ├── repositories/         # Data access layer (food, meal, weight, user_settings)
│   │   ├── schemas/              # Request & Response DTOs (user.py, food.py, meal_log.py, etc.)
│   │   ├── services/             # Business logic (tdee_calculator, user_settings, nutrition)
│   │   └── main.py               # Application entrypoint
│   ├── scripts/                  # CLI utilities (seed_foods.py)
│   └── tests/                    # Pytest test suites (86 passing tests)
├── data/                         # Starter food datasets
│   └── foods/starter_foods.json  # 20 curated system foods
├── frontend/                     # React 19 + TypeScript + Vite Application
│   ├── src/
│   │   ├── api/                  # Typed client layer with X-User-ID injection
│   │   ├── components/           # UI components, layout shell, and modals
│   │   ├── context/              # AppContext (Dev identity, health state, targets)
│   │   ├── pages/                # Dashboard, Food Log, Food Database, Weight, Analytics, Settings
│   │   ├── types/                # TypeScript models mirroring backend Pydantic schemas
│   │   ├── utils/                # Date and formatting helpers
│   │   ├── App.tsx               # Root routes and providers
│   │   ├── index.css             # Tailwind CSS v4 design tokens ("NutriTrack Emerald Calm")
│   │   └── main.tsx              # Application entrypoint
│   └── package.json              # Frontend dependencies and scripts
├── ARCHITECTURE.md               # Detailed architectural specification & data models
└── README.md                     # Project overview and instructions
```

---

## 🚀 Getting Started

### Prerequisites
* Python 3.13+
* MongoDB instance (local or MongoDB Atlas connection string)
* Node.js v20+ / v24+ & npm

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
pip install -r requirements-dev.txt   # for testing
cp .env.example .env
# Edit .env with your MongoDB URI
```

### Seed Starter Foods
```bash
# From the backend/ directory with venv activated:
python scripts/seed_foods.py
```
This loads the 20 curated starter foods into your MongoDB. Safe to run repeatedly — it upserts system foods and **never touches user-created foods**.

### Run the Backend Server
```bash
uvicorn app.main:app --reload
```
API docs available at `http://localhost:8000/docs`

### Run Backend Tests
```bash
cd backend
python -m pytest -v
```
All 86 tests use an in-memory mock database — **no MongoDB connection required for testing**.

### Frontend Setup & Development
```bash
cd frontend
npm install

# Copy environment template if needed
cp .env.example .env

# Run local development server (http://localhost:5173)
npm run dev

# Run TypeScript checks & production build
npm run build

# Run fast linter (oxlint)
npm run lint
```

---

## 🍎 Food API Reference (Phase 2A)

All food endpoints are prefixed with `/api/v1/foods`.

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/foods/search?q={term}&page=1&limit=20` | Search system + cached + user's own foods | User ID |
| `GET` | `/foods/{food_id}` | Get food details by ID | User ID |
| `POST` | `/foods` | Create custom food (user-owned) | User ID |
| `PUT` | `/foods/{food_id}` | Update user's own custom food | Owner only |
| `DELETE` | `/foods/{food_id}` | Delete user's own custom food | Owner only |

---

## 🍽️ Meal Logging API Reference (Phase 2B)

All meal logging endpoints are prefixed with `/api/v1/meals`.

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/meals/day/{date}` | Retrieve day's meals and aggregated daily nutrient totals | User ID |
| `POST` | `/meals/log` | Log food items into a meal category (`breakfast`, `lunch`, `dinner`, `snack`) | User ID |
| `PUT` | `/meals/items/{log_item_id}` | Update quantity or serving of an individual logged item | Owner only |
| `DELETE` | `/meals/items/{log_item_id}` | Delete an individual logged item | Owner only |

**Deterministic Nutrition Snapshot**: Each logged item preserves a point-in-time snapshot of the food name, chosen serving grams, quantity, and computed macro totals scaled from the 100g base.

---

## ⚖️ Weight Tracking API Reference (Phase 2B)

All weight tracking endpoints are prefixed with `/api/v1/weights`.

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/weights?start_date={start}&end_date={end}` | List weight logs ordered descending by date | User ID |
| `POST` | `/weights` | Record daily weight (supports `weight_kg` or `weight` + `unit="lbs"`, daily upsert) | User ID |
| `DELETE` | `/weights/{weight_id}` | Delete a specific body weight record | Owner only |

---

## 🎯 User Settings & Onboarding API Reference (Phase 3B)

All user settings endpoints are prefixed with `/api/v1/user`.

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/user/settings` | Get current user settings (creates defaults if missing) | User ID |
| `POST` | `/user/onboarding` | Complete onboarding with physical profile, BMR/TDEE calculation & baseline weight | User ID |
| `PUT` | `/user/profile` | Update physical profile (auto-recalculates targets if not overridden) | User ID |
| `PUT` | `/user/targets` | Manually override daily nutrition targets (`is_custom_override: true`) | User ID |
| `POST` | `/user/recalculate-targets` | Reset targets to calculated Mifflin–St Jeor values (clears override) | User ID |
| `POST` | `/user/calculate-preview` | Stateless preview of BMR, TDEE, macros without persisting | Public/User ID |

---

## 📖 Detailed Architecture & Data Models

For full details on the MongoDB collections (`users`, `user_settings`, `foods`, `meal_logs`, `weight_logs`), compound indexes, API endpoints, frontend routes, and Phase 2A/2B implementation specifics, refer to the [ARCHITECTURE.md](file:///c:/Projects/Trackal/ARCHITECTURE.md) document.

---

## 🤝 Contributing & Handoff

When continuing development:
1. Review the current status in this README.
2. Check the section in [ARCHITECTURE.md](file:///c:/Projects/Trackal/ARCHITECTURE.md) corresponding to the active phase.
3. Complete that phase's requirements cleanly before advancing.
4. **After making changes, update both `ARCHITECTURE.md` and `README.md`** so the next developer or AI model can seamlessly pick up where you left off.

