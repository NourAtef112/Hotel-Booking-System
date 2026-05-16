# 🏛️ E-JUST Guest Housing Booking System

> CSE323 Software Engineering — Team Project | E-JUST, 2026

A web-based platform that digitizes E-JUST's guest housing reservation process.
Previously managed via phone calls — now a fully online booking system for students, staff, and external guests.

---

## 📌 Project Status

| Phase | Focus | Status |
|---|---|---|
| Phase 1 — Requirements | Actor classification, traceability, edge cases | ✅ Done |
| Phase 2 — Design & Specification | Gherkin, UML, API contracts | ✅ Done |
| Phase 3 — TDD Implementation | Vertical slice, BookingService, PaymobService | ✅ Done |
| Phase 4 — Validation & Pipeline | Integration tests, Playwright E2E, real DB | 🔄 In Progress |

---

## 👥 Team

| Name | Student ID | Role |
|---|---|---|
| Moamen Ahmed Fouad | 120230151 | Architecture + Backend Lead |
| Yassin Mahmoud Alam | 120230122 | Frontend (React Web) |
| Nour Atef | 120230032 | Testing + Documentation + API Contracts |
| Mohammed ElGendy | 120230154 | Contributor |
| Joudi Sameh | 120230148 | Contributor |

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS (Web only) |
| Backend | Python 3.11 + FastAPI |
| Database | PostgreSQL + SQLAlchemy 2.x (async) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Validation | Pydantic v2 |
| Unit Tests | pytest + pytest-asyncio + pytest-respx |
| E2E Tests | Playwright + Page Object Model |
| Payment | Paymob (Unified Checkout / Intention API) |

---

## 🗂️ Repository Structure

```
university-guest-housing/
├── backend/               # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/        # Route handlers
│   │   ├── core/          # Config, DB connection, exceptions
│   │   ├── models/        # SQLAlchemy models
│   │   ├── repositories/  # IBookingRepository + SQL implementation
│   │   ├── schemas/       # Pydantic v2 DTOs
│   │   └── services/      # BookingService, AuthService, PaymobService
│   ├── tests/unit/        # 29 unit tests (all passing)
│   ├── alembic/           # DB migrations
│   └── docs/              # Architecture + payment docs
├── docs/                  # Requirements, design, validation docs
├── gherkin/               # BDD feature scenarios
├── api-contracts/         # API request/response schemas
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL running locally
- Node 18+ (for frontend)

### Backend

```bash
cd backend
cp ../.env.example .env
# Fill in DATABASE_URL and SECRET_KEY in .env
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend (separate repo / Figma handoff)
The frontend is a React + TypeScript + Tailwind CSS web app.
Currently in design handoff — Figma/Framer designs being implemented by Yassin.

### Run tests

```bash
cd backend
pytest tests/unit/ -v
# Expected: 29 green
```

---

## 🔑 API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/register | No | Register new user |
| POST | /auth/login | No | Login, returns JWT |
| GET | /rooms | Yes | List all rooms |
| GET | /rooms/{id} | Yes | Room detail |
| POST | /bookings | Yes | Create booking |
| GET | /bookings/me | Yes | My bookings |
| GET | /admin/bookings | Admin | All bookings |
| PATCH | /admin/bookings/{id} | Admin | Update booking status |
| POST | /api/payments/checkout | Yes | Initiate Paymob payment |
| POST | /api/payments/webhook | Public | Paymob webhook handler |
| WS | /ws/availability | No | Live room availability stream |

Full Swagger docs available at: http://localhost:8000/docs

---

## 🏠 Seeded Rooms

| Room | Type | Price/night |
|---|---|---|
| GH-101 | Single | 250 EGP |
| GH-102 | Single | 250 EGP |
| GH-201 | Double | 400 EGP |
| GH-202 | Suite | 600 EGP |
| GH-301 | VIP Suite | 900 EGP |

Default admin: admin@ejust.edu.eg / Admin123!

---

## ⚠️ Known Limitations

- Paymob live payments blocked pending account KYC verification — demo mode used for submission
- WebSocket availability stream has no JWT auth guard yet (Phase 4 TODO)
- Frontend implementation pending Figma design handoff
