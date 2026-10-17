# NutriTrack Architecture Documentation

**Status**: Phase 2B Complete (Meal Logging Engine & Weight Tracking) | Phase 2C/3 Pending | 69 Passing Tests  
**Last Updated**: 2026-10-09  
**Version**: 0.5.0 (Meal Logging Engine, Nutrition Calculator, Weight Tracking & Daily Aggregations)

---

## 1. Executive Summary & Vision

**NutriTrack** is a polished, modern, open-source nutrition and food tracking web application designed for self-hosting or local execution. 

### Core Product Principles
* **AI-Independent Core**: The entire application is 100% operational without AI. All core workflows (food logging, macro tracking, goal monitoring, weight logging, analytics, food search) rely strictly on deterministic algorithms and local databases. The application must work without any external AI provider.
* **Optional AI Enhancement (Client-Side Keys Only)**:
  * AI is strictly an optional enhancement, never a dependency.
  * **Zero Server-Side Credential Storage**: User-provided AI API keys (OpenAI / Gemini / Anthropic) are **never** persisted as plaintext or database fields in MongoDB or on the server.
  * Your API key stays on your device: Keys are stored exclusively on the user's local device (e.g., client-side encrypted local storage). AI requests consume the user's key ephemerally. Users can clear or change their keys at any time.
  * No server-side API key storage. No mandatory AI subscription.
  * An optional encrypted credential-storage mechanism may be added separately in a future phase if multi-device sync is requested.
* **Data Privacy & Ownership**: User health, nutrition, and weight data belong entirely to the user. Every user-owned document is strictly partitioned by authenticated user identity.
* **Installer's MongoDB Ownership Principle**:
  * A NutriTrack installation connects strictly to the **INSTALLER'S own MongoDB deployment** (local MongoDB instance or the installer's private MongoDB Atlas cluster).
  * The project repository must **never** contain a real MongoDB URI, username, or password.
  * The maintainer's personal MongoDB Atlas cluster is **NOT** required by users who self-host the project.
* **Phase-Driven Evolution**: Built step-by-step with clean boundaries, high testability, and zero architectural surprises.

---

## 2. Technology Stack & Environment

| Layer | Technology | Details / Versions Verified |
| :--- | :--- | :--- |
| **Runtime / OS** | Windows / PowerShell | Python 3.13.14, Node v24.18.0, npm 12.0.1, Git 2.55 |
| **Frontend** | React 19 + TypeScript + Vite | Tailwind CSS v4, Lucide Icons, Recharts for charts |
| **Backend** | Python 3.13 + FastAPI | Pydantic v2 (schemas), Native PyMongo Async API (`AsyncMongoClient`) |
| **Database** | MongoDB Atlas / Local MongoDB | MongoDB 7.0+ compatible, BSON schemas with strict indexing |
| **Design Tooling** | Google Stitch MCP | Configured & operational for UI mockups and design systems |
| **API Architecture** | RESTful JSON API | Versioned at `/api/v1`, OpenAPI auto-documented via Swagger |

### Driver & MCP Tooling Status

* **MongoDB Driver (PyMongo Async)**: Native PyMongo Async API (`from pymongo import AsyncMongoClient`) is used. Motor is deprecated as of May 14, 2026 and has been completely removed from dependencies.
* **Stitch MCP**: **AVAILABLE & ACTIVE**
  * Server: Remote Stitch MCP endpoint configured via Google Cloud API Key.
  * Capabilities: Screen generation (`generate_screen_from_text`), UI variant design (`generate_variants`), design systems creation (`create_design_system`), and screen inspection.
  * Usage: Will be leveraged during UI development to prototype screens and align design tokens.
* **MongoDB MCP**: **NOT INSTALLED / UNAVAILABLE**
  * Status: No MongoDB MCP tool is registered in the environment.
  * Strategy: All database operations, migrations, and index verifications are executed directly via Python scripts using the native `pymongo` Async API in the backend service.

---

## 3. Repository Folder Structure

```
Trackal/
├── .github/                      # CI/CD workflows and issue templates
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── api/                  # API router declarations
│   │   │   ├── deps.py           # ✅ FastAPI dependency providers (get_current_user, get_db)
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── health.py        # ✅ GET /health — app & DB status
│   │   │       │   ├── foods.py         # ✅ Food search, CRUD, ownership rules
│   │   │       │   ├── auth.py          # 📋 Authentication / session management (future)
│   │   │       │   ├── users.py         # 📋 User profile & preferences (future)
│   │   │       │   ├── meals.py         # 📋 Daily logs and meal item operations (Phase 2B)
│   │   │       │   ├── weights.py       # 📋 Weight entries and milestones (future)
│   │   │       │   ├── analytics.py     # 📋 Macro summaries and trends (future)
│   │   │       │   └── export_import.py # 📋 JSON/CSV backup and restore (future)
│   │   │       └── router.py            # ✅ Central v1 route aggregator
│   │   ├── core/                 # Core configs, security, logging
│   │   │   ├── config.py         # ✅ Pydantic BaseSettings loaded from .env
│   │   │   ├── database.py       # ✅ PyMongo AsyncMongoClient, lifespan pool & index manager
│   │   │   ├── auth.py           # ✅ CurrentUser model for auth boundary
│   │   │   ├── exceptions.py     # ✅ Application exceptions (NotFound, Forbidden, InvalidId)
│   │   │   └── security.py       # 📋 Password hashing & JWT/session utilities (future)
│   │   ├── models/               # MongoDB ODM / Pydantic models (BSON / PyObjectId)
│   │   │   ├── common.py         # ✅ PyObjectId and base audit timestamps
│   │   │   ├── user.py           # ✅ User entity
│   │   │   ├── user_settings.py  # ✅ User settings entity (targets, units, NO API keys)
│   │   │   ├── food.py           # ✅ Food item entity (provenance: system, user, external, cached)
│   │   │   ├── meal_log.py       # ✅ Daily log and meal entries
│   │   │   └── weight_log.py     # ✅ Weight record entity
│   │   ├── repositories/         # Data access layer (MongoDB queries)
│   │   │   └── food_repository.py # ✅ Food collection CRUD, search, upsert, access scoping
│   │   ├── schemas/              # Request / Response DTO schemas
│   │   │   ├── user.py           # ✅ User DTOs
│   │   │   ├── food.py           # ✅ FoodCreate, FoodUpdate, FoodResponse, FoodSearchResponse
│   │   │   ├── meal_log.py       # ✅ MealLog DTOs
│   │   │   ├── weight_log.py     # ✅ WeightLog DTOs
│   │   │   └── health.py         # ✅ Health DTOs
│   │   ├── services/             # Pure business logic layer
│   │   │   ├── food_service.py   # ✅ Food search, CRUD, ownership enforcement
│   │   │   ├── seed_service.py   # ✅ Starter foods JSON loader & idempotent seeder
│   │   │   ├── nutrition_calculator.py  # 📋 Macro and calorie math (Phase 2B)
│   │   │   ├── meal_service.py   # 📋 Meal logging business logic (Phase 2B)
│   │   │   └── weight_service.py # 📋 Weight tracking logic (future)
│   │   └── main.py               # ✅ FastAPI application entrypoint with lifespan
│   ├── scripts/                  # Standalone CLI utilities
│   │   └── seed_foods.py         # ✅ Run: python scripts/seed_foods.py
│   ├── tests/                    # Pytest test suite (42 passing tests)
│   │   ├── conftest.py           # ✅ Fixtures (async_client, mock_db, client_with_db)
│   │   ├── mock_db.py            # ✅ In-memory AsyncMockDatabase for isolated testing
│   │   ├── test_config.py        # ✅ Settings validation tests
│   │   ├── test_models.py        # ✅ Pydantic schema validation & provenance tests
│   │   ├── test_health.py        # ✅ Health endpoint & DB connectivity tests
│   │   ├── test_starter_foods.py # ✅ Dataset validation, seed idempotency, user-food safety
│   │   ├── test_food_repository.py # ✅ Repository CRUD, search scoping, pagination
│   │   └── test_food_api.py      # ✅ Food API endpoints, ownership, cross-user isolation
│   ├── .env.example              # ✅ Sample environment template (placeholders only)
│   ├── requirements.txt          # ✅ Production dependencies (PyMongo native async, no Motor)
│   └── requirements-dev.txt      # ✅ Testing and linting dependencies
├── data/                         # Project data assets & starter seeds
│   └── foods/
│       └── starter_foods.json    # ✅ 20 curated starter foods (system provenance)
├── frontend/                     # 📋 React + Vite + TypeScript Application (Phase 3)
│   └── (not yet initialized)
├── docs/                         # Additional design artifacts and guides
├── ARCHITECTURE.md               # ✅ System blueprint and technical contract
└── README.md                     # ✅ Project overview, setup, and status
```

---

## 4. Locked Food Data Architecture & MongoDB Data Models

### 4.1 Hybrid Food-Data Model

The `foods` collection in NutriTrack is **NOT** treated as an all-encompassing worldwide food encyclopedia owned or hosted by the project's maintainers. Instead, NutriTrack adheres to a 4-tier hybrid model:

1. **Tier A — Starter / System Foods**:
   * A small, curated, high-quality starter dataset ships directly with the open-source repository at `data/foods/starter_foods.json`.
   * Seeded into the installer's own MongoDB during initial setup.
   * Marked with `provenance.source_type = "system"`, `is_system = True`, `created_by = None`.
   * Read-only to regular users; accessible by all users of the local installation.
2. **Tier B — External Public Food Sources**:
   * NutriTrack can query publicly available and appropriately licensed nutrition databases (e.g., USDA FoodData Central, Open Food Facts).
   * External records retain provenance: `source_name`, `external_id`, attribution, and licensing notes.
   * **Rule**: The maintainers never bulk-copy an entire external database into the repository or into a centralized maintainer database.
3. **Tier C — Local Cache**:
   * Externally retrieved food records may optionally be cached locally in the installer's MongoDB.
   * Marked with `provenance.source_type = "cached"`, `created_by = None`.
   * Treated strictly as local temporary cache to reduce external latency and respect rate limits, **not** as an authoritative worldwide catalog.
4. **Tier D — User-Created Foods**:
   * Users can create their own custom food records.
   * Marked with `provenance.source_type = "user"`, `is_system = False`, `created_by = user_id`.
   * Strictly user-owned: Visible, editable, and deletable ONLY by the creating user.

### 4.2 Data Ownership & Scoping Rules

1. **User-Scoped Documents (`user_settings`, `meal_logs`, `weight_logs`)**:
   * Must strictly contain an indexed `user_id` referencing the authenticated user.
   * Every read, update, and delete query **MUST** enforce `{"user_id": current_user.id}`.
2. **Food Catalog Search Scoping**:
   * Search queries execute against:
     ```json
     {
       "$or": [
         {"is_system": true},
         {"provenance.source_type": "cached"},
         {"created_by": current_user.id}
       ]
     }
     ```
     combined with text search or barcode lookups.

---

### 4.3 Collection: `users`
Represents user identity and authentication credentials.
```json
{
  "_id": "ObjectId",
  "email": "user@example.com",
  "username": "alex",
  "hashed_password": "string",
  "is_active": true,
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```
**Indexes**:
* `{"email": 1}` — Unique
* `{"username": 1}` — Unique

---

### 4.4 Collection: `user_settings`
User-specific target goals and unit preferences. Strictly user-owned. **Contains no AI credentials.**
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (ref: users)",
  "calorie_target": 2200,
  "protein_target_g": 160.0,
  "carb_target_g": 220.0,
  "fat_target_g": 70.0,
  "water_target_ml": 2500,
  "unit_system": "metric", // "metric" | "imperial"
  "updated_at": "ISODate"
}
```
**Indexes**:
* `{"user_id": 1}` — Unique

---

### 4.5 Collection: `foods`
Searchable food items with explicit provenance metadata.
```json
{
  "_id": "ObjectId",
  "name": "Rolled Oats",
  "brand": "Quaker",
  "barcode": "030000010300",
  "is_system": true,
  "created_by": null, // null for system/external/cached foods; user_id for custom foods
  "provenance": {
    "source_type": "system", // "system" | "user" | "external" | "cached"
    "source_name": "starter_pack", // e.g. "starter_pack", "usda_fdc", "open_food_facts", "custom"
    "external_id": null,
    "attribution": null,
    "license": "Public Domain"
  },
  "serving_sizes": [
    {
      "serving_id": "srv_a1b2c3d4",
      "description": "1 cup dry",
      "weight_g": 81.0,
      "is_default": true
    },
    {
      "serving_id": "srv_e5f6g7h8",
      "description": "100g",
      "weight_g": 100.0,
      "is_default": false
    }
  ],
  "nutrients_per_100g": {
    "calories": 389.0,
    "protein_g": 16.9,
    "carbs_g": 66.3,
    "fat_g": 6.9,
    "fiber_g": 10.6,
    "sugar_g": 0.0,
    "sodium_mg": 2.0
  },
  "tags": ["breakfast", "grain", "cereal"],
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```
**Indexes**:
* `{"name": "text", "brand": "text", "tags": "text"}` — Full-text search
* `{"is_system": 1, "created_by": 1}` — System vs custom filter
* `{"provenance.source_type": 1, "created_by": 1}` — Fast provenance-scoped lookups
* `{"created_by": 1, "name": 1}` — Custom user food sorting
* `{"barcode": 1}` — Sparse unique index for barcode lookups

---

### 4.6 Collection: `meal_logs`
Logs of meals eaten on a specific date by a specific user. Strictly user-owned.
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (ref: users)",
  "date": "YYYY-MM-DD",
  "meal_type": "breakfast", // "breakfast" | "lunch" | "dinner" | "snack"
  "items": [
    {
      "log_item_id": "item_uuid",
      "food_id": "ObjectId (ref: foods)",
      "food_name": "Rolled Oats",
      "serving_selected": {
        "description": "1 cup dry",
        "weight_g": 81.0
      },
      "number_of_servings": 1.5,
      "total_weight_g": 121.5,
      "computed_nutrients": {
        "calories": 472.6,
        "protein_g": 20.5,
        "carbs_g": 80.5,
        "fat_g": 8.4,
        "fiber_g": 12.9
      },
      "logged_at": "ISODate"
    }
  ],
  "notes": "Post morning workout",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```
**Indexes**:
* `{"user_id": 1, "date": 1, "meal_type": 1}` — Fast day/meal views
* `{"user_id": 1, "date": 1}` — Range lookups for weekly/monthly analytics

---

### 4.7 Collection: `weight_logs`
Tracks body weight changes. Strictly user-owned.
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (ref: users)",
  "date": "YYYY-MM-DD",
  "weight_kg": 76.5,
  "note": "Morning weight, fasted",
  "created_at": "ISODate"
}
```
**Indexes**:
* `{"user_id": 1, "date": -1}` — Unique compound index (one primary weight entry per day)

---

## 5. API Architecture & Endpoint Specification

All endpoints are prefixed with `/api/v1`.

### 5.1 System & Health (`/api/v1/health`)
* `GET /api/v1/health` — Returns application status and active MongoDB connectivity status (`connected` / `degraded`).

### 5.2 Authentication & Profile (`/api/v1/auth`, `/api/v1/users`)
* `POST /api/v1/auth/register` — Create new account
* `POST /api/v1/auth/login` — Authenticate and receive JWT access token
* `GET /api/v1/users/me` — Retrieve active user profile
* `GET /api/v1/users/settings` — Get user calorie & macro goals
* `PUT /api/v1/users/settings` — Update macro goals, units, calorie target

### 5.3 Foods Catalog (`/api/v1/foods`)
* `GET /api/v1/foods/search?q={query}&page=1&limit=20` — Search foods (`is_system: true` OR `provenance.source_type: "cached"` OR `created_by: current_user.id`)
* `GET /api/v1/foods/{food_id}` — Get full food details and serving options
* `POST /api/v1/foods` — Create a custom food item (`provenance.source_type: "user"`, `created_by: current_user.id`)
* `PUT /api/v1/foods/{food_id}` — Update user's custom food item (enforces `created_by == current_user.id`)
* `DELETE /api/v1/foods/{food_id}` — Delete user's custom food item (enforces `created_by == current_user.id`)

### 5.4 Meal Logging (`/api/v1/meals`)
* `GET /api/v1/meals/day/{date}` — Get all meals and daily nutrient totals for `current_user.id` on date
* `POST /api/v1/meals/log` — Add food item to a meal
* `PUT /api/v1/meals/items/{log_item_id}` — Update quantity or serving of a logged item
* `DELETE /api/v1/meals/items/{log_item_id}` — Remove item from meal log

### 5.5 Weight Tracking (`/api/v1/weights`)
* `GET /api/v1/weights?start_date={date}&end_date={date}` — Historical weight list for `current_user.id`
* `POST /api/v1/weights` — Log or update today's weight for `current_user.id`
* `DELETE /api/v1/weights/{weight_id}` — Remove a weight record for `current_user.id`

### 5.6 Analytics & Summaries (`/api/v1/analytics`)
* `GET /api/v1/analytics/daily-summary/{date}` — Calorie & macro balance vs goals
* `GET /api/v1/analytics/trends?range={7d|30d|90d}` — Aggregated calorie and macro trends

### 5.7 Data Portability (`/api/v1/export-import`)
* `GET /api/v1/export-import/export` — Export user's entire dataset as structured JSON
* `POST /api/v1/export-import/import` — Restore or import data from JSON backup

---

## 6. Frontend Route Structure & Navigation

| Route Path | View / Component | Core Purpose |
| :--- | :--- | :--- |
| `/` | `DashboardPage` | Overview: Calorie goal ring, macro budget progress, today's meal summaries, quick food log button, recent weight badge. |
| `/log` | `FoodLogPage` | Date switcher (`< Today >`), sectioned meal buckets (Breakfast, Lunch, Dinner, Snacks), inline food addition, per-meal macro breakdowns. |
| `/foods` | `FoodDatabasePage` | Search database (starter + cached + user foods), nutrition label viewer, and custom food creator. |
| `/weight` | `WeightTrackerPage` | Fasted weight entry, target goal lines, interactive weight history line chart. |
| `/analytics` | `AnalyticsPage` | Weekly/monthly calorie compliance, macro distribution averages, export data button. |
| `/settings` | `SettingsPage` | Calorie calculation formula, macro split adjustments (% or grams), metric/imperial toggle, local AI key configuration (kept in client storage only). |

---

## 7. Roadmap & Phase Breakdown

- [x] **Phase 0: Project Initialization**
  - Workspace inspection & MCP tool verification
  - Architectural blueprint & tech stack finalization
  - MongoDB document schemas & indexing design
  - API endpoint catalog & frontend routing specification
  - Security hardening (no server-side AI keys, strict user-scoping)
  - `ARCHITECTURE.md` and `README.md` creation
- [x] **Phase 1: Backend Foundation & Data Persistence**
  - Backend folder structure & virtual environment
  - Setup Pydantic v2 settings (`pydantic-settings`) with `.env.example`
  - Native PyMongo Async API (`AsyncMongoClient`) connection pool & lifespan lifecycle
  - Base Models (User, UserSettings, Food with Provenance, MealLog, WeightLog) with safe PyObjectId serialization
  - MongoDB index registration on application startup (`ensure_indexes`)
  - Implemented `GET /api/v1/health` with live database ping latency check
  - Locked Food Data Architecture (hybrid starter/system, external, local cache, user custom)
  - Automated test suite (pytest + httpx) with 27 passing tests
- [x] **Phase 2A: Food Data Layer & Food APIs**
  - Starter foods dataset: 20 curated staple foods at `data/foods/starter_foods.json`
  - Idempotent seed mechanism (`services/seed_service.py`, `scripts/seed_foods.py`)
  - Repository layer (`repositories/food_repository.py`) — MongoDB data access with 4-tier scoping
  - Service layer (`services/food_service.py`) — Business logic, ownership enforcement, access control
  - Authentication boundary (`core/auth.py`, `api/deps.py`) — `CurrentUser` injectable dependency
  - Application exceptions (`core/exceptions.py`) — `FoodNotFoundError`, `FoodForbiddenError`, `InvalidIdError`
  - Food API endpoints: `GET /search`, `GET /{id}`, `POST /`, `PUT /{id}`, `DELETE /{id}`
  - FoodResponse DTO with `from_food()` converter; FoodSearchResponse with pagination
  - In-memory `AsyncMockDatabase` for isolated testing without real MongoDB
  - 42 passing automated tests (15 new: seed, repository, API, ownership, cross-user isolation)
  - External food providers (USDA, Open Food Facts) intentionally deferred to Phase 2C
- [x] **Phase 2B: Meal Logging Engine & Weight Tracking**
  - Deterministic Nutrition calculator (`services/nutrition_calculator.py`) with 100g basis scaling and banker's rounding
  - Meal logging repository & service (`repositories/meal_repository.py`, `services/meal_service.py`)
  - Meal logging endpoints: `GET /api/v1/meals/day/{date}`, `POST /api/v1/meals/log`, `PUT /api/v1/meals/items/{id}`, `DELETE /api/v1/meals/items/{id}`
  - Snapshot retention of food names and calculated nutrients for historical audit safety
  - Weight repository & service (`repositories/weight_repository.py`, `services/weight_service.py`)
  - Weight tracking endpoints: `GET /api/v1/weights`, `POST /api/v1/weights`, `DELETE /api/v1/weights/{id}`
  - Automatic weight unit normalization (lbs -> kg) and daily upsert semantics
  - 69 total passing tests (27 new tests covering math, meals, weights, repositories, and cross-user isolation)
- [ ] **Phase 2C: External Food Providers (Optional)**
  - Integration with USDA FoodData Central and/or Open Food Facts
  - Local caching layer (`provenance.source_type: "cached"`)
  - Rate limit management and attribution
- [x] **Phase 3: Frontend Foundation & Design System (Stitch MCP)**
  - Scaffold Vite + React 19 + TypeScript + Tailwind CSS v4
  - Integrate Stitch MCP design system tokens ("NutriTrack Emerald Calm", `#10b981`)
  - Reusable UI primitives (Button, Card, Badge, Input, Select, Modal, LoadingSpinner, EmptyState, StatCard, MacroProgressBar)
  - Responsive layout shell (Sidebar, Header, MobileNav, DevUserBanner, Quick Modals)
  - Typed API client layer (`apiFetch`, `foodApi`, `mealApi`, `weightApi`, `healthApi`) with `X-User-ID` support
  - Clean page views: Dashboard, Food Log, Food Database, Weight Tracker, Analytics, Settings, NotFound
- [ ] **Phase 4: Core User Workflows**
  - Interactive Daily Dashboard
  - Meal Logging Interface with quick search and serving selector
  - Weight Tracking view with Recharts visualization
- [ ] **Phase 5: Analytics, Portability & Refinement**
  - Weekly & monthly trend analysis
  - JSON data export and import
  - Responsive polish & dark mode support
- [ ] **Phase 6: Optional AI Integration (Client-Side Key Only)**
  - Client-managed user-provided key for optional natural language parsing
  - Strict fallback to AI-independent core logging

---

## 8. Phase 2A Implementation Details

### 8.1 Starter Foods Dataset

**File**: `data/foods/starter_foods.json`  
**Count**: 20 curated, commonly-tracked staple foods  
**Provenance**: All entries use `provenance.source_type: "system"`, `source_name: "starter_pack"`, `is_system: true`, `created_by: null`  
**Categories covered**: Grains (oats, rice), proteins (chicken, salmon, eggs, whey), dairy (milk, yogurt), produce (banana, apple, broccoli, spinach, sweet potato, avocado), fats (olive oil, peanut butter, almonds), legumes (black beans)  

Each entry includes multiple serving sizes with one `is_default: true`, nutrients per 100g, and descriptive tags.

### 8.2 Seed Process

The seed mechanism is idempotent and safe to run repeatedly:

```bash
# From the backend/ directory, with venv activated:
python scripts/seed_foods.py
```

**Behavior**:
- Reads and validates every record through `Food` Pydantic model
- Upserts by matching on `name` + `brand` for system foods
- Creates new system foods on first run; updates metadata on subsequent runs
- **Never modifies or deletes user-created foods** (only touches `is_system: True` records)
- Returns a summary: `{total_processed, created, updated}`

### 8.3 Layered Architecture

```
HTTP Request → FastAPI Endpoint (api/v1/endpoints/foods.py)
                    ↓
              Dependencies (api/deps.py) → CurrentUser, AsyncDatabase
                    ↓
              FoodService (services/food_service.py) — business rules, ownership checks
                    ↓
              FoodRepository (repositories/food_repository.py) — MongoDB queries
                    ↓
              MongoDB (AsyncMongoClient via core/database.py)
```

### 8.4 Food Ownership Rules (Enforced in FoodService)

| Food Type | Read | Search Visible | Update | Delete |
| :--- | :--- | :--- | :--- | :--- |
| **System** (`is_system: true`) | ✅ Any user | ✅ All users | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Cached** (`provenance.source_type: "cached"`) | ✅ Any user | ✅ All users | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **User-owned** (`created_by: user_id`) | ✅ Owner only | ✅ Owner only | ✅ Owner only | ✅ Owner only |
| **Another user's food** | ❌ 404 (hides existence) | ❌ Never shown | ❌ 403 Forbidden | ❌ 403 Forbidden |

### 8.5 Authentication Boundary

**Current state**: No full JWT/session auth system is implemented yet.  
**Mechanism**: `CurrentUser` is injected via `get_current_user()` dependency in `api/deps.py`.  
- API callers can pass an `X-User-ID` header with a valid 24-character hex ObjectId.
- Tests override `get_current_user` via `app.dependency_overrides` for complete isolation.
- When full authentication is built (Phase 3+), only `get_current_user()` needs to change — all downstream code is already user-scoped.

### 8.6 External Food Providers — Deferred

Integration with external public food databases (USDA FoodData Central, Open Food Facts) is **intentionally deferred** to Phase 2C. The architecture fully supports it:
- `provenance.source_type: "external"` and `"cached"` are already validated in models
- Search scoping already includes cached foods in results
- The repository `upsert_system_food` pattern can be adapted for cache upserts

---

## 9. Phase 2B Implementation Details

### 9.1 Deterministic Nutrition Calculator

**File**: `app/services/nutrition_calculator.py`  
**Purpose**: Centralized, reproducible nutrient scaling and aggregation.  

* **Standard Basis**: Nutrients are modeled per 100 grams.  
* **Scaling Formula**:  
  $$\text{Total Weight (g)} = \text{serving\_weight\_g} \times \text{number\_of\_servings}$$  
  $$\text{Nutrient Value} = \text{round}\left(\text{nutrient\_per\_100g} \times \frac{\text{Total Weight (g)}}{100.0},\ 1\right)$$
* **Rounding Convention**: Standard Python round-half-to-even (banker's rounding) to 1 decimal place.
* **Input Validation**: Strictly validates that serving weights and quantities are finite floats $> 0$. Rejects NaN, Inf, zero, and negative values with `NutritionCalculationError`.
* **Missing Fields**: Safely defaults optional nutrients (e.g., fiber) to `0.0` without fabricating unrecorded data.

### 9.2 Meal Logging Architecture

**Components**:
* `MealRepository` (`repositories/meal_repository.py`): Encapsulates queries against `meal_logs`. All operations enforce `{"user_id": current_user.id}`.
* `MealService` (`services/meal_service.py`): Handles meal item creation, snapshot retention, serving resolution, item updates, deletions, and daily summary aggregations.
* `Meals Router` (`api/v1/endpoints/meals.py`):
  * `GET /api/v1/meals/day/{date}` — Returns all user meals for the day and aggregated `daily_totals`.
  * `POST /api/v1/meals/log` — Logs items into a meal bucket (`breakfast`, `lunch`, `dinner`, `snack`). Appends to existing meal log for that category/date if one exists.
  * `PUT /api/v1/meals/items/{log_item_id}` — Updates serving size or quantity and recalculates nutrition.
  * `DELETE /api/v1/meals/items/{log_item_id}` — Deletes item; deletes parent meal log document if no items remain.

### 9.3 Historical Nutrition Snapshot Retention

When an item is logged, `MealItem` persists a snapshot containing:
* `food_name`
* `serving_selected` (description and gram weight)
* `number_of_servings` and `total_weight_g`
* `computed_nutrients` (calories, protein, carbs, fat, fiber)

If a food item is modified or deleted from the catalog later, historical logs remain self-contained, accurate, and immutable.

### 9.4 Weight Tracking Architecture

**Components**:
* `WeightRepository` (`repositories/weight_repository.py`): Encapsulates `weight_logs` queries scoped to `user_id`. Enforces chronological descending sort.
* `WeightService` (`services/weight_service.py`): Enforces date validation, unit normalization, and single-entry-per-day upsert rules.
* `Weights Router` (`api/v1/endpoints/weights.py`):
  * `GET /api/v1/weights` — Lists weight records (supports optional `start_date` and `end_date` bounds).
  * `POST /api/v1/weights` — Upserts daily weight. Automatically converts `lbs` to `kg` ($1\text{ lb} \approx 0.45359237\text{ kg}$) and validates allowable range ($20.0 \text{ kg} - 500.0 \text{ kg}$).
  * `DELETE /api/v1/weights/{weight_id}` — Deletes weight entry owned by `current_user.id`.

### 9.5 Date & Timezone Conventions

* **Dates**: Stored as ISO 8601 strings in format `YYYY-MM-DD`. Validated with calendar checking (`datetime.strptime`) to prevent invalid calendar dates (e.g. `2026-02-30`).
* **Timestamps**: Stored as UTC `datetime` objects (`created_at`, `updated_at`, `logged_at`) via `utc_now()`.
