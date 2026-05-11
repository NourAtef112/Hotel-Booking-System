# QA Report — University Guest Housing Booking System

**Author:** QA Engineer (Gendy)
**Date:** 2026-05-11
**Branch:** `feature/gendy-validation`
**Backend Author:** Moamen
**Stack:** FastAPI (Python) + React Native (Expo) + PostgreSQL

---

## 1. Test Coverage Summary

### Gherkin Scenario → Test Case Mapping

| Feature File | Gherkin Scenario | Spec File | Test Name | Status |
|---|---|---|---|---|
| `login.feature` | Successful login | `auth.spec.ts` | Login: success — valid credentials return 200 + access_token | ❌ FAIL (stub) |
| `login.feature` | Invalid credentials | `auth.spec.ts` | Login: invalid credentials return 401 | ❌ FAIL (stub) |
| `registration.feature` | Successful registration as a guest | `auth.spec.ts` | Register: success — valid payload returns 201 + user object | ❌ FAIL (stub) |
| `registration.feature` | *(edge case)* duplicate email | `auth.spec.ts` | Register: duplicate email returns 409 | ❌ FAIL (stub) |
| `registration.feature` | *(edge case)* missing fields | `auth.spec.ts` | Register: missing fields returns 422 | ✅ PASS |
| `registration.feature` | *(edge case)* invalid email | `auth.spec.ts` | Register: invalid email format returns 422 | ✅ PASS |
| `login.feature` | *(edge case)* bad email format | `auth.spec.ts` | Login: invalid email format returns 422 | ✅ PASS |
| `login.feature` | *(edge case)* missing password | `auth.spec.ts` | Login: missing password returns 422 | ✅ PASS |
| `booking.feature` | Successful room booking | `booking.spec.ts` | Booking: success — valid payload returns 201 + pending status | ❌ FAIL (stub) |
| `booking.feature` | Room is no longer available | `booking.spec.ts` | Booking: double booking attempt returns 409 | ❌ FAIL (stub) |
| `booking.feature` | *(browse rooms step)* | `booking.spec.ts` | GET /rooms: returns paginated room list with 200 | ❌ FAIL (stub) |
| `booking.feature` | *(browse rooms filter)* | `booking.spec.ts` | GET /rooms?available=true: filters available rooms | ❌ FAIL (stub) |
| `booking.feature` | *(edge case)* missing fields | `booking.spec.ts` | Booking: missing room_id returns 422 | ✅ PASS |
| `cancel_booking.feature` | Successful cancellation | `booking.spec.ts` | Cancel booking: returns 204 | ✅ PASS |
| `cancel_booking.feature` | *(edge case)* non-existent ID | `booking.spec.ts` | Cancel booking: non-existent ID returns 404 | ❌ FAIL (stub) |
| `booking.feature` | *(history — confirmed booking visible)* | `history.spec.ts` | History: authenticated user receives booking list with 200 | ❌ FAIL (stub) |
| `booking.feature` | *(history — new user empty state)* | `history.spec.ts` | History: new user with no bookings returns empty list | ❌ FAIL (stub) |
| `booking.feature` | *(history — unauthenticated)* | `history.spec.ts` | History: unauthenticated request returns 401 | ❌ FAIL (stub) |
| `booking.feature` | *(history — specific booking)* | `history.spec.ts` | History: get specific booking by ID returns 200 + booking object | ❌ FAIL (stub) |
| `booking.feature` | *(history — not found)* | `history.spec.ts` | History: non-existent booking ID returns 404 | ❌ FAIL (stub) |

**Total: 20 test cases | ✅ 6 PASS | ❌ 14 FAIL (expected — stub not implemented)**

---

## 2. Bug Registry

### 🔴 BUG-001 — CRITICAL: Route Prefix Mismatch

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Found in** | `backend/main.py` |
| **Description** | The API contract and task specification document endpoints with an `/api` prefix (e.g., `POST /api/auth/register`, `GET /api/rooms`). The actual FastAPI router in `main.py` mounts routes **without** any `/api` prefix: `/auth/register`, `/rooms/`, `/bookings/`. Any client coded against the documented spec will receive 404 Not Found. |
| **Actual routes** | `POST /auth/register`, `POST /auth/login`, `GET /rooms/`, `POST /bookings/`, `GET /bookings/`, `GET /bookings/{id}`, `DELETE /bookings/{id}` |
| **Documented routes** | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/rooms`, etc. |
| **Fix** | Add `root_path="/api"` to the FastAPI app or use `prefix="/api"` in router registration. **Do not modify until Moamen confirms intended path structure.** |
| **Affects** | All endpoints |

---

### 🔴 BUG-002 — CRITICAL: All Endpoint Handlers are Unimplemented Stubs

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Found in** | `backend/app/api/auth_routes.py`, `room_routes.py`, `booking_routes.py` |
| **Description** | Every route handler returns `pass` (Python `None`). FastAPI attempts to serialize `None` into the declared `response_model`, which raises a `ResponseValidationError` → HTTP 500. The system is not functional end-to-end. |
| **Affected endpoints** | `POST /auth/register`, `POST /auth/login`, `GET /rooms/`, `POST /bookings/`, `GET /bookings/`, `GET /bookings/{id}` |
| **Exception** | `DELETE /bookings/{id}` (status 204, no response body) — works correctly. |
| **Fix** | Implement service layer logic: `auth_service.register_user()`, `auth_service.authenticate_user()`, `room_service.get_rooms()`, `booking_service.create_booking()`, `booking_service.get_user_bookings()`, `booking_service.cancel_booking()`. |

---

### 🟠 BUG-003 — HIGH: No Authentication Middleware

| Field | Detail |
|---|---|
| **Severity** | High |
| **Found in** | `backend/main.py`, `backend/app/api/booking_routes.py` |
| **Description** | No JWT authentication middleware or dependency injection is configured. Authenticated routes (`/bookings/`, `DELETE /bookings/{id}`) accept requests without any `Authorization` header and do not enforce ownership. `main.py` has `# TODO: Add authentication middleware`. |
| **Impact** | Any unauthenticated user can make booking requests; booking ownership is never validated. |
| **Fix** | Implement JWT dependency (`Depends(get_current_user)`) on all protected routes. |

---

### 🟡 BUG-004 — MEDIUM: No CORS Configuration

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Found in** | `backend/main.py` |
| **Description** | `main.py` has `# TODO: Add CORS middleware configuration`. Without CORS headers, the React Native web build and any browser-based client will be blocked by CORS policy. |
| **Fix** | Add `CORSMiddleware` with allowed origins for the mobile app and local dev URLs. |

---

### 🟡 BUG-005 — MEDIUM: No Request Logging Middleware

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Found in** | `backend/main.py` |
| **Description** | `# TODO: Add request logging middleware` — no access logs exist, making debugging in production impossible. |
| **Fix** | Add a logging middleware or integrate with a logging framework. |

---

## 3. Fixed Issues

*No fixes applied — QA role is validation only. Backend logic is owned by Moamen.*

---

## 4. Pass / Fail Summary

### ✅ Currently Passing (6)

| # | Test | Route | Reason |
|---|---|---|---|
| 1 | Register: missing fields returns 422 | `POST /auth/register` | FastAPI schema validation fires before stub |
| 2 | Register: invalid email format returns 422 | `POST /auth/register` | FastAPI `EmailStr` validation fires before stub |
| 3 | Login: invalid email format returns 422 | `POST /auth/login` | FastAPI `EmailStr` validation fires before stub |
| 4 | Login: missing password returns 422 | `POST /auth/login` | FastAPI schema validation fires before stub |
| 5 | Booking: missing room_id returns 422 | `POST /bookings/` | FastAPI schema validation fires before stub |
| 6 | Cancel booking: returns 204 | `DELETE /bookings/{id}` | Stub returns `None`; 204 requires no response body |

### ❌ Currently Failing (14 — all expected, stub not implemented)

| # | Test | Route | Expected | Actual |
|---|---|---|---|---|
| 1 | Register: success | `POST /auth/register` | 201 | 500 (stub) |
| 2 | Register: duplicate email | `POST /auth/register` | 409 | 500 (stub) |
| 3 | Login: success | `POST /auth/login` | 200 + JWT | 500 (stub) |
| 4 | Login: invalid credentials | `POST /auth/login` | 401 | 500 (stub) |
| 5 | GET /rooms: list | `GET /rooms/` | 200 + list | 500 (stub) |
| 6 | GET /rooms?available=true | `GET /rooms/` | 200 + filtered | 500 (stub) |
| 7 | Booking: success | `POST /bookings/` | 201 + pending | 500 (stub) |
| 8 | Booking: double booking | `POST /bookings/` | 409 | 500 (stub) |
| 9 | Cancel: non-existent ID | `DELETE /bookings/99999` | 404 | 204 (stub) |
| 10 | History: booking list | `GET /bookings/` | 200 + list | 500 (stub) |
| 11 | History: empty state | `GET /bookings/` | 200 + empty list | 500 (stub) |
| 12 | History: unauthenticated | `GET /bookings/` | 401 | 500 (stub) |
| 13 | History: get by ID | `GET /bookings/1` | 200 + object | 500 (stub) |
| 14 | History: not found | `GET /bookings/99999999` | 404 | 500 (stub) |

---

## 5. Single Command to Run All E2E Tests

### Prerequisites
```bash
# 1. Install Node dependencies (one-time setup)
npm install

# 2. Install Python dependencies (one-time setup)
cd backend
pip install -r requirements.txt
cd ..
```

### Run
```bash
npx playwright test
# OR
npm run test:e2e
```

The `webServer` option in `playwright.config.ts` automatically starts the FastAPI backend on port 8000 before the tests run. No manual server startup is required.

### Detailed output with HTML report
```bash
npm run test:e2e:report
```

---

## 6. Re-run After Implementation

Once Moamen implements the backend logic, re-run all tests:

```bash
npx playwright test
```

All previously failing 500 tests should now pass.
Update the Pass/Fail table in this report accordingly.

**Expected final state (post-implementation):**
- ✅ 20 / 20 tests passing
- BUG-001 resolved (route prefix aligned with spec)
- BUG-002 resolved (handlers implemented)
- BUG-003 resolved (auth middleware active)
- BUG-004 resolved (CORS configured)

---

## 7. File Structure

```
Hotel-Booking-System/
├── .gitignore                          ✅ Updated (playwright-report/, test-results/, postman_environment.json)
├── package.json                        ✅ Created (Playwright deps)
├── playwright.config.ts                ✅ Created
├── tests/
│   └── e2e/
│       ├── auth.spec.ts                ✅ Full implementation (8 tests)
│       ├── booking.spec.ts             ✅ Full implementation (7 tests)
│       ├── history.spec.ts             ✅ Full implementation (5 tests)
│       └── api/
│           └── postman_collection.json ✅ Created (6 endpoints, all edge cases)
├── docs/
│   └── qa_report.md                   ✅ This file
└── features/                           ✅ Unchanged (no new .feature files)
    ├── login.feature
    ├── registration.feature
    ├── booking.feature
    └── cancel_booking.feature
```

> **STRICT COMPLIANCE:** No files were added to `backend/tests/`. No existing backend logic was modified. No `.feature` files were created. No secrets or `.env` files are tracked.
