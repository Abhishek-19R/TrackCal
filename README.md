# NutriTrack 🥗

> A modern, open-source nutrition and food tracking web application designed for self-hosting, local data ownership, and clean personal health tracking.

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)](#-testing-linting--build-verification)
[![Backend Tests](https://img.shields.io/badge/Backend_Pytest-92_Passing-brightgreen?style=flat-square)](#-testing-linting--build-verification)
[![Frontend Tests](https://img.shields.io/badge/Frontend_Tests-7_Passing-brightgreen?style=flat-square)](#-testing-linting--build-verification)
[![Python](https://img.shields.io/badge/Python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white)](#-technology-stack)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](#-technology-stack)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](#-technology-stack)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178C6?style=flat-square&logo=typescript&logoColor=white)](#-technology-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](#-technology-stack)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-47A248?style=flat-square&logo=mongodb&logoColor=white)](#-technology-stack)

---

## 📌 Project Overview & Current Status

NutriTrack empowers individuals to track their daily calories, macronutrients (protein, carbs, fat, fiber), meals, and body weight with local data ownership and zero mandatory cloud lock-in.

* **Current Status**: **Active Development / Pre-Release**
* **Architecture Version**: 0.7.0 (Photo-Based Food Detection & Core Feature Complete)
* **Automated Tests**: 92 backend tests passing (Pytest) + 7 frontend tests passing (`node --test`)
* **Type Safety & Code Quality**: Clean TypeScript production build (`tsc -b && vite build`) and 0 lint warnings (`oxlint`)

### Core Product Principles
* 🌿 **Deterministic Core**: Every nutrition calculation, food search, meal snapshot, BMR/TDEE formula, and weight metric runs deterministically without requiring an internet connection or AI model.
* 🤖 **Optional AI Vision (Client-Side BYOK)**: Photo-based meal detection with Google Gemini Vision. User API keys reside strictly on the user's browser device and are never sent to the backend server or stored in MongoDB.
* 🔒 **Data Ownership & Privacy**: Your health logs belong to you. Built for self-hosting with your own local or private MongoDB instance.
* ⚡ **Performance & Modern Polish**: Built with Vite, React 19, Tailwind CSS v4, Lucide icons, and micro-animations following the Google Stitch "NutriTrack Emerald Calm" design tokens.

---

## ✨ Implemented Features

* **Personalized Nutrition Onboarding (Mifflin–St Jeor)**:
  - Metric and imperial profile inputs (height, weight, age, sex, activity level, goal).
  - Deterministic BMR and TDEE calculation with scientific goal adjustments (`lose`, `maintain`, `gain`).
  - Clinically recommended safety floors (1,500 kcal/day for males, 1,200 kcal/day for females).
  - Target override state machine: manual target overrides are preserved during profile updates until explicitly recalculated.
* **Curated Food Catalog & Search**:
  - Starter catalog of 20 essential foods with defensible nutrition per 100g and common household serving sizes.
  - Partial unique indexing on barcodes to prevent duplicate entries while safely handling null values.
  - User-owned custom food creation and updates.
* **Meal Logging & Historical Snapshots**:
  - Four meal categories: Breakfast, Lunch, Dinner, Snacks.
  - Category and date inheritance when opening logging modals.
  - Point-in-time nutrient snapshots: changes to food catalog items never retroactively alter logged historical meals.
  - Flexible serving quantity inputs with live fractional serving previews (e.g. 0.5, 0.75, 1.5).
* **Body Weight Tracking**:
  - Daily weight logging with automatic metric (`kg`) and imperial (`lbs`) normalization.
  - Upsert semantics to maintain a single authoritative weight record per calendar day.
* **Photo-Based Food Detection (AI Vision)**:
  - Mobile camera capture and desktop image upload.
  - Optional natural language notes to clarify hidden or ambiguous ingredients (e.g., *"cooked with olive oil"*).
  - Client-side Gemini Vision integration with automatic model fallback (`gemini-2.5-flash` → `gemini-1.5-flash`).
  - Interactive review screen: portion weight steppers (`+/- 25g`), rename items, remove items, add new items.
  - Deterministic catalog matching: links detected items with local verified database values whenever available.
  - Zero-lockin fallback: 1-click fallback to manual search if quota is exhausted or no key is provided.

---

## 🖼️ Screenshots & Interface Demo

> *Note: UI visual captures will be refreshed as design polish evolves.*

| Daily Dashboard | Meal Logging Modal |
| :---: | :---: |
| *[ Dashboard Placeholder — Calorie ring, macro progress bars, active meal buckets, and quick logging buttons ]* | *[ Log Food Modal Placeholder — Category inheritance, serving steppers, and instant search ]* |

| Mifflin–St Jeor Onboarding Wizard | Photo Food Detection & Review |
| :---: | :---: |
| *[ Onboarding Wizard Placeholder — Multi-step BMR/TDEE calculation and live macro preview ]* | *[ Photo Scanner Placeholder — Camera capture, portion adjustment steppers, and catalog matching ]* |

---

## 🛠️ Technology Stack

| Layer | Technologies | Role in NutriTrack |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** + **TypeScript** | Component architecture, strict client typing |
| **Bundler & Tooling** | **Vite 8** + **Oxlint** | Fast HMR dev server, optimized production bundling, fast linting |
| **Styling** | **Tailwind CSS v4** | Modern CSS engine, utility-first styling with custom design tokens |
| **Backend API** | **FastAPI** + **Python 3.13** | Asynchronous RESTful JSON API (`/api/v1`) |
| **Validation & Schemas** | **Pydantic v2** | Strict request/response DTOs, data sanitization, custom ObjectId serialization |
| **Database Driver** | **PyMongo Async** (`AsyncMongoClient`) | Native async MongoDB driver with connection pooling |
| **Database** | **MongoDB 7.0+** | Document store with compound indexes, partial filter expressions, and transactional upserts |
| **Testing** | **Pytest** + **Node.js Test Runner** | 92 backend tests with in-memory mock DB; 7 frontend unit tests |

---

## 🏗️ Architecture Overview

NutriTrack uses a layered architecture to ensure clean boundaries between HTTP presentation, domain logic, and data storage:

```
[ Frontend: React 19 + TypeScript + Vite ]
       │
       │ HTTP / RESTful JSON (`/api/v1`) + `X-User-ID` Header
       ▼
[ FastAPI Routing Layer (`app/api/v1/endpoints`) ]
       │
       │ DTO Validation (`app/schemas`)
       ▼
[ Domain Service Layer (`app/services`) ]
   ├── Nutrition Calculator (per-100g scaling)
   ├── TDEE / Mifflin–St Jeor Engine
   ├── Seed & Catalog Service
   └── Meal & Weight Aggregators
       │
       │ Persistence Operations
       ▼
[ Repository Layer (`app/repositories`) ]
       │
       │ Native PyMongo Async Driver (`AsyncMongoClient`)
       ▼
[ MongoDB Database (`nutritrack`) ]
   ├── `users` & `user_settings`
   ├── `foods` (starter, custom, cached)
   ├── `meal_logs` (daily food logs & snapshots)
   └── `weight_logs` (daily weight history)
```

For full details on compound indexes, data models, serializer specifics, and API contracts, refer to [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📋 Prerequisites

Before setting up NutriTrack locally, ensure you have:

* **Python**: `3.13+` (recommended) or `3.11+`
* **Node.js**: `v20+` or `v24+` with `npm`
* **MongoDB**: A running MongoDB 7.0+ instance (local Docker container recommended, or a free MongoDB Atlas cluster)
* **Git**: `2.x+`
* *(Optional)* A free **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/) for photo-based food detection.

---

## 💻 Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Abhishek-19R/TrackCal.git
cd TrackCal
```

### 2. MongoDB Setup

#### Option A: Run MongoDB locally with Docker (Recommended)
```bash
docker run -d \
  --name nutritrack-mongo \
  -p 27017:27017 \
  -v nutritrack-data:/data/db \
  mongo:7.0
```

#### Option B: Use MongoDB Atlas
Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and obtain your connection string:
`mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`

---

### 3. Backend Setup

#### On Windows (PowerShell):
```powershell
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Configure environment variables
Copy-Item .env.example .env
# Edit .env if your MongoDB URI differs from mongodb://127.0.0.1:27017

# Seed starter foods into MongoDB
python scripts/seed_foods.py

# Launch the FastAPI backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### On macOS / Linux (bash / zsh):
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Configure environment variables
cp .env.example .env
# Edit .env if your MongoDB URI differs from mongodb://127.0.0.1:27017

# Seed starter foods into MongoDB
python scripts/seed_foods.py

# Launch the FastAPI backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

* Backend API Docs (Swagger UI): `http://127.0.0.1:8000/docs`
* Health Endpoint: `http://127.0.0.1:8000/api/v1/health`

---

### 4. Frontend Setup

In a separate terminal window:

```bash
cd frontend

# Install Node dependencies
npm install

# Configure environment variables
# On Windows PowerShell:
Copy-Item .env.example .env
# On macOS / Linux:
cp .env.example .env

# Start the Vite development server
npm run dev
```

* Frontend Application: `http://localhost:5173`

---

## 🤖 Optional Gemini Photo-Scanning Setup (BYOK)

NutriTrack includes photo-based meal detection that requires **zero server configuration**:

1. Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Open NutriTrack in your browser and go to **Settings** (`/settings`), or open the **Photo Scanner** directly from the Dashboard or Meal Log.
3. Paste your Gemini API key and click **Save**.
4. **How It Works**:
   - The key is stored solely in your browser's `localStorage` (`nutritrack_client_gemini_key`).
   - Requests are sent directly from your browser to Google's Gemini Vision API endpoints (`gemini-2.5-flash` / `gemini-1.5-flash`).
   - The key is **never transmitted to the NutriTrack backend, never stored in MongoDB, and never written to server logs**.
   - If free-tier limits (15 RPM / 1,500 RPD) are reached, you can continue logging manually with zero interruption.

---

## 🧪 Testing, Linting & Build Verification

Every test and verification script listed below is tested and operational:

### Backend Tests
```bash
cd backend
# With virtual environment activated:
python -m pytest -v
```
* Runs 92 automated tests using an in-memory mock database (`mock_db.py`).
* Tests complete in under 2 seconds without requiring an external MongoDB connection.

### Frontend Unit Tests
```bash
cd frontend
npm test
```
* Runs 7 unit tests testing JSON code block stripping, schema sanitization, weight clamping, catalog recalculation, and Gemini error mappings.

### Frontend Linting
```bash
cd frontend
npm run lint
```
* Runs `oxlint` across all TypeScript and React files with 0 errors and 0 warnings.

### Frontend Production Build
```bash
cd frontend
npm run build
```
* Runs `tsc -b` (strict TypeScript validation) and Vite production bundling (`dist/`).

---

## 📁 Repository Structure

```
TrackCal/
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── api/                  # Route handlers & dependency injection
│   │   │   ├── deps.py           # Database & current user providers
│   │   │   └── v1/endpoints/     # foods, meals, weights, user_settings, health
│   │   ├── core/                 # App configuration, database pool, auth, exceptions
│   │   ├── models/               # MongoDB BSON document models (Pydantic + PyObjectId)
│   │   ├── repositories/         # Database access layer (CRUD & queries)
│   │   ├── schemas/              # Pydantic request/response DTOs
│   │   ├── services/             # Domain logic (TDEE engine, nutrition calculator, seed service)
│   │   └── main.py               # FastAPI application entrypoint
│   ├── scripts/
│   │   └── seed_foods.py         # Seed script with partial index initialization
│   ├── tests/                    # Pytest test suites (92 passing tests)
│   ├── .env.example              # Backend environment template
│   ├── pytest.ini                # Pytest configuration
│   ├── requirements.txt          # Production Python dependencies
│   └── requirements-dev.txt      # Development & testing dependencies
├── data/
│   └── foods/starter_foods.json  # 20 curated baseline starter foods
├── frontend/                     # React 19 + TypeScript + Vite Application
│   ├── public/                   # Static assets & favicons
│   ├── src/
│   │   ├── api/                  # Typed HTTP client layer with X-User-ID header
│   │   ├── components/           # UI components, layout shell, and modals
│   │   ├── context/              # AppContext (user identity, targets, toasts)
│   │   ├── pages/                # Dashboard, Food Log, Food Database, Weight, Analytics, Settings
│   │   ├── services/aiVision/    # Gemini vision adapter, validator, catalog matcher
│   │   ├── types/                # TypeScript models mirroring backend schemas
│   │   ├── utils/                # Date and formatting utilities
│   │   ├── App.tsx               # Root routes and providers
│   │   ├── index.css             # Tailwind CSS v4 design tokens
│   │   └── main.tsx              # React application entrypoint
│   ├── tests/                    # Frontend unit tests (aiVision.test.mjs)
│   ├── .env.example              # Frontend environment template
│   ├── .oxlintrc.json            # Oxlint configuration
│   └── package.json              # Frontend scripts and dependencies
├── .gitignore                    # Root repository ignore rules
├── ARCHITECTURE.md               # Complete architecture & schema specification
└── README.md                     # Project overview and instructions
```

---

## 🔒 Security & Privacy Notes

* **Development-Only User Identity (`X-User-ID`)**:
  - The current version uses an HTTP header (`X-User-ID`) to simulate user-scoped data isolation for local development.
  - **This is strictly a development mechanism, NOT a production authentication system**. It does not verify passwords, sign tokens, or defend against spoofing.
  - Production multi-user authentication (JWT / OAuth2) is planned for a subsequent phase.
* **Client-Side AI Keys**:
  - Gemini API keys are saved exclusively in browser `localStorage`.
  - While this ensures keys never touch the backend server, database, or git history, note that browser `localStorage` is accessible to scripts running on that domain.
  - Never share browser profiles on untrusted public machines when an API key is stored.
* **Zero Image Retention**:
  - Images submitted for photo detection are read in memory as base64, sent directly to Google's API, and discarded immediately.
  - NutriTrack has no image storage infrastructure; image bytes are never written to disk, database, or backend logs.
* **No Hardcoded Secrets**:
  - All database connection strings and sensitive settings are strictly read from environment variables (`.env`).
  - Example template files (`.env.example`) contain only safe placeholders and local default addresses.

---

## ⚠️ Current Limitations & Roadmap

### Current Limitations
1. **Single-User / Dev Auth**: Authentication currently relies on a client-supplied `X-User-ID` header.
2. **Local AI Rate Limits**: Free-tier Gemini keys are subject to Google AI Studio rate limits (15 RPM / 1,500 RPD).
3. **Food Catalog Scope**: The built-in catalog contains 20 curated baseline items; wider catalogs require adding custom items or future external provider integration.

### Planned Improvements
- [ ] **Production Authentication**: Secure user registration, password hashing (Argon2 / bcrypt), and JWT session tokens.
- [ ] **Interactive Visualizations**: Time-series weight progress line charts and macro distribution charts via Recharts.
- [ ] **Trend Analytics**: 7-day, 30-day, and 90-day rolling averages and calorie deficit/surplus summaries.
- [ ] **External Nutrition Databases**: Optional integration with USDA FoodData Central and Open Food Facts for barcode scanning and catalog expansion.
- [ ] **Data Portability**: Full JSON export and import for seamless backup and device migration.

---

## 🤝 Contribution Guidelines

Contributions are welcome! To contribute:

1. **Fork the Repository** on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Adhere to Code Standards**:
   - Backend: Format Python code cleanly, preserve existing type annotations, and maintain unit test coverage.
   - Frontend: Ensure TypeScript builds cleanly (`npm run build`) and passes linting (`npm run lint`).
4. **Run All Automated Tests**:
   - Backend: `pytest` must pass all tests (`python -m pytest`).
   - Frontend: `npm test` must pass all tests.
5. **Submit a Pull Request**: Provide a clear description of the problem solved, changes made, and test commands verified.

---

## 📄 License

*License*: **Not yet selected**.
A formal open-source license will be selected prior to public release. Until then, all rights are reserved.

---

## ❓ Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `ServerSelectionTimeoutError` when backend starts | MongoDB is not running or unreachable on port 27017 | Ensure your local Docker container is running (`docker start nutritrack-mongo`) or check your `MONGODB_URI` in `backend/.env`. |
| `E11000 duplicate key error on barcode: null` during seed | Old MongoDB sparse index treating null as duplicate | Run `python scripts/seed_foods.py`; the migration helper automatically updates `idx_foods_barcode_unique` with a partialFilterExpression. |
| `Network Error` or CORS blocked in frontend | Backend is offline or origin is not permitted | Verify the backend is running at `http://localhost:8000` and `CORS_ORIGINS` in `backend/.env` includes `http://localhost:5173`. |
| Gemini Scanner shows `Quota Exceeded (429)` | Google AI Studio free tier per-minute or per-day limit reached | Wait 60 seconds before retrying, or click "Search Catalog Instead" for instant manual logging. |
| Serving size input rejects decimals in Quick Log | Step alignment issue | Enter any decimal between 0.25 and 20 servings (e.g. 0.5, 0.75, 1.5); the input accepts both direct typing and stepper clicks. |
