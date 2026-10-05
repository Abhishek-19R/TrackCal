# NutriTrack 🥗

> A polished, modern, open-source nutrition and food tracking web application designed for self-hosting and local ownership.

[![Phase](https://img.shields.io/badge/Phase_2A-Completed-success?style=flat-square)](file:///c:/Projects/Trackal/ARCHITECTURE.md)
[![Tests](https://img.shields.io/badge/Tests-42_Passing-brightgreen?style=flat-square)](#)
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

> **Current Phase**: **Phase 2A (Food Data Layer & Food APIs) — COMPLETED** (42 passing tests)  
> **Food Data Architecture**: **LOCKED & DOCUMENTED**  
> Next Up: **Phase 2B (Meal Logging Engine & Weight Tracking)**

If an AI assistant's context limit is reached, you can seamlessly continue with another model by referencing this status and [ARCHITECTURE.md](file:///c:/Projects/Trackal/ARCHITECTURE.md).

| Phase | Description | Status | Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 0** | **Project Initialization & Design** | ✅ **Done** | Tech stack validation, MCP environment check, data model design, API contracts, routing spec, [ARCHITECTURE.md](file:///c:/Projects/Trackal/ARCHITECTURE.md). |
| **Phase 1** | **Backend Foundation & Database** | ✅ **Done** | FastAPI scaffolding, native PyMongo Async connection pool (`AsyncMongoClient`), Pydantic v2 schemas/models, safe PyObjectId serializer, index manager, `GET /api/v1/health`, locked food provenance, 27 passing automated tests. |
| **Phase 2A** | **Food Data Layer & Food APIs** | ✅ **Done** | 20-food starter dataset with seed script, `FoodRepository` + `FoodService` layered architecture, food search + CRUD endpoints, 4-tier ownership isolation, `CurrentUser` auth boundary, in-memory mock DB for tests, 42 total passing tests. |
| **Phase 2B** | **Meal Logging & Weight Tracking** | ⏳ **Next** | Meal logging endpoints, nutrition calculator, weight tracking, daily macro totals. |
| **Phase 2C** | **External Food Providers** | 📋 Deferred | USDA FoodData Central / Open Food Facts integration, local caching. |
| **Phase 3** | **Frontend Foundation & Design System** | 📋 Pending | Vite + React + Tailwind setup, Google Stitch MCP UI integration, core components. |
| **Phase 4** | **Core User Workflows** | 📋 Pending | Daily Dashboard, Food Log view, Weight Tracker with charts. |
| **Phase 5** | **Analytics & Portability** | 📋 Pending | 7/30/90-day trend analytics, JSON export/import, UI polish. |
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
│   │   │   └── v1/endpoints/     # health.py, foods.py (+ future: meals, weights, etc.)
│   │   ├── core/                 # config, database, auth boundary, exceptions
│   │   ├── models/               # MongoDB BSON documents & Pydantic ODM
│   │   ├── repositories/         # Data access layer (food_repository.py)
│   │   ├── schemas/              # Request & Response DTOs
│   │   ├── services/             # Business logic (food_service, seed_service)
│   │   └── main.py               # Application entrypoint
│   ├── scripts/                  # CLI utilities (seed_foods.py)
│   └── tests/                    # Pytest test suites (42 tests)
├── data/                         # Starter food datasets
│   └── foods/starter_foods.json  # 20 curated system foods
├── frontend/                     # (Phase 3 — not yet initialized)
├── ARCHITECTURE.md               # Detailed architectural specification & data models
└── README.md                     # Project overview and instructions
```

---

## 🚀 Getting Started

### Prerequisites
* Python 3.13+
* MongoDB instance (local or MongoDB Atlas connection string)
* Node.js v20+ / v24+ & npm *(only needed from Phase 3 onwards)*

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

### Run the Server
```bash
uvicorn app.main:app --reload
```
API docs available at `http://localhost:8000/docs`

### Run Tests
```bash
cd backend
pytest -v
```
All 42 tests use an in-memory mock database — **no MongoDB connection required for testing**.

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

**Ownership Rules**:
* System foods: readable by all, never editable or deletable by users
* User custom foods: visible, editable, deletable **only** by the creating user
* Another user's foods: return 404 (existence is never leaked)

**Auth Boundary**: Pass `X-User-ID: <24-char-hex-ObjectId>` header. Full JWT auth deferred to Phase 3+. See [ARCHITECTURE.md §8.5](file:///c:/Projects/Trackal/ARCHITECTURE.md) for details.

---

## 📖 Detailed Architecture & Data Models

For full details on the MongoDB collections (`users`, `user_settings`, `foods`, `meal_logs`, `weight_logs`), compound indexes, API endpoints, frontend routes, and Phase 2A implementation specifics, refer to the [ARCHITECTURE.md](file:///c:/Projects/Trackal/ARCHITECTURE.md) document.

---

## 🤝 Contributing & Handoff

When continuing development:
1. Review the current status in this README.
2. Check the section in [ARCHITECTURE.md](file:///c:/Projects/Trackal/ARCHITECTURE.md) corresponding to the active phase.
3. Complete that phase's requirements cleanly before advancing.
4. **After making changes, update both `ARCHITECTURE.md` and `README.md`** so the next developer or AI model can seamlessly pick up where you left off.
