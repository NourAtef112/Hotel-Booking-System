# 🏛️ University Guest Housing Booking System

> Architecture skeleton — Software Engineering course project

## Project Overview

A full-stack University Guest Housing Booking System that allows students, staff, and external guests to browse, book, and manage guest housing rooms at a university campus.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) + TypeScript |
| Backend | Python + FastAPI |
| Database | PostgreSQL |
| Testing | pytest + Playwright |

## Repository Structure

```
university-guest-housing/
├── mobile-app/        # React Native Expo mobile application
├── backend/           # FastAPI Python backend
├── docs/              # Requirements, design, validation docs
├── tests/             # pytest test stubs (failing-first)
├── gherkin/           # BDD feature scenarios
├── api-contracts/     # API request/response schemas
└── README.md
```

## Engineering Lifecycle

This project follows the full Software Engineering cycle:

1. **Requirements** → `docs/requirements.md`
2. **Design** → `docs/design.md`
3. **Implementation** → `backend/` + `mobile-app/`
4. **Validation** → `tests/` + `gherkin/` + `docs/validation.md`

## Quick Start

```bash
# Backend (Python 3.11+)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Mobile (Node 18+)
cd mobile-app
npm install
npx expo start
```

## Status

> ⚠️ **Architecture Phase** — Stubs and contracts only. No business logic implemented.
