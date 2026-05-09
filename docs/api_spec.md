# University Guest Housing API — Contract Specification

> **Version:** 1.0.0  
> **Status:** Mock layer (Issue #5) — business logic coming in Issue #6  
> **Audience:** Mobile team (Yassin, Joudi) and backend contributors

---

## 1. Overview

| Property | Value |
|---|---|
| Base URL | `http://<host>/api/v1` |
| Content-Type | `application/json` (all requests and responses) |
| Interactive docs | `GET /docs` (Swagger UI) |
| Auth header | `Authorization: Bearer <access_token>` |

All endpoints accept and return JSON. The `Authorization` header is listed here for convention — it is **not yet enforced** in this issue. The mobile app should send it anyway so that Issue #6 can wire it up without any client changes.

---

## 2. Conventions

### UUIDs
All identifiers (`id`, `room_id`, `user_id`, `booking_id`) are [UUID v4](https://www.rfc-editor.org/rfc/rfc4122) strings in canonical hyphenated lowercase format:
```
00000000-0000-0000-0001-000000000001
```

### Dates and times
- **Date fields** (`start_date`, `end_date`) use ISO 8601 date format: `YYYY-MM-DD`, e.g. `"2026-06-10"`
- **Datetime fields** (`created_at`) use ISO 8601 with Cairo timezone (UTC+2): `"2026-05-01T10:30:00+02:00"`

### Currency
All monetary amounts (`price_per_night`, `total_cost`) are in **Egyptian Pounds (EGP)**. There is no currency field — the API always returns EGP.

### Error envelope
Every error response uses the same shape:
```json
{
  "error_code": "SNAKE_UPPER_CODE",
  "message": "Human-readable explanation",
  "details": { ... }
}
```
The `details` field is `null` for most errors; for `VALIDATION_ERROR` it contains a Pydantic error list.

### Pagination
The `Page[T]` shape is defined but not yet used in list endpoints (Issue #6 will add it). When implemented:
```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```
Use query params `?page=1&page_size=20` to paginate.

---

## 3. Error Codes

| `error_code` | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request body or params failed Pydantic validation. `details.errors` contains per-field messages. |
| `INVALID_CREDENTIALS` | 401 | Email/password combination does not match any account. |
| `EMAIL_ALREADY_REGISTERED` | 409 | A user with this email already exists. |
| `ROOM_NOT_FOUND` | 404 | No room with the given UUID exists. |
| `BOOKING_NOT_FOUND` | 404 | No booking with the given UUID exists. |
| `BOOKING_OVERLAP` | 409 | The requested dates overlap with an existing confirmed/pending booking for that room. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. Report to backend team with request details. |

---

## 4. Endpoints

### Auth — `/auth`

---

#### `POST /api/v1/auth/register`

Register a new guest account.

**Auth required:** No

**Request body:**
```json
{
  "name": "Alice Guest",
  "email": "alice@university.edu",
  "password": "supersecret99"
}
```

| Field | Type | Constraints |
|---|---|---|
| `name` | string | 2–80 characters |
| `email` | string | Valid email address |
| `password` | string | 8–128 characters |

**Success — `201 Created`:**
```json
{
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Alice Guest",
    "email": "alice@university.edu",
    "role": "guest",
    "created_at": "2025-09-01T08:00:00+02:00"
  },
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Errors:**
```json
// 409 — EMAIL_ALREADY_REGISTERED
{ "error_code": "EMAIL_ALREADY_REGISTERED", "message": "A user with this email already exists.", "details": null }

// 422 — VALIDATION_ERROR (e.g. password too short)
{ "error_code": "VALIDATION_ERROR", "message": "Request validation failed", "details": { "errors": [...] } }
```

---

#### `POST /api/v1/auth/login`

Authenticate and receive a JWT.

**Auth required:** No

**Request body:**
```json
{
  "email": "alice@university.edu",
  "password": "supersecret99"
}
```

**Success — `200 OK`:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

> `expires_in` is in seconds (86400 = 24 hours). Store the token securely and include it as `Authorization: Bearer <token>` on subsequent requests.

**Errors:**
```json
// 401 — INVALID_CREDENTIALS
{ "error_code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect.", "details": null }

// 422 — VALIDATION_ERROR
{ "error_code": "VALIDATION_ERROR", "message": "Request validation failed", "details": { "errors": [...] } }
```

---

### Rooms — `/rooms`

---

#### `GET /api/v1/rooms/`

List all rooms.

**Auth required:** No

**Query params:** None (pagination coming in Issue #6)

**Success — `200 OK`:**
```json
[
  {
    "id": "00000000-0000-0000-0001-000000000001",
    "room_number": "101",
    "capacity": 2,
    "price_per_night": 1200.0,
    "is_available": true,
    "image_url": "https://example.com/rooms/101.jpg"
  },
  {
    "id": "00000000-0000-0000-0001-000000000002",
    "room_number": "205",
    "capacity": 1,
    "price_per_night": 800.0,
    "is_available": true,
    "image_url": "https://example.com/rooms/205.jpg"
  }
]
```

> `image_url` may be `null` if no image is uploaded yet. Always handle this case in the mobile UI.

---

#### `GET /api/v1/rooms/{room_id}`

Get full details for a single room, including description and amenities.

**Auth required:** No

**Path param:** `room_id` — UUID of the room

**Success — `200 OK`:**
```json
{
  "id": "00000000-0000-0000-0001-000000000001",
  "room_number": "101",
  "capacity": 2,
  "price_per_night": 1200.0,
  "is_available": true,
  "image_url": "https://example.com/rooms/101.jpg",
  "description": "A cozy double room on the ground floor with a garden view and natural lighting.",
  "amenities": ["WiFi", "Air Conditioning", "Mini Fridge", "Study Desk"]
}
```

**Errors:**
```json
// 404 — ROOM_NOT_FOUND
{ "error_code": "ROOM_NOT_FOUND", "message": "Room 00000000-0000-0000-9999-000000000000 not found", "details": null }
```

---

### Bookings — `/bookings`

---

#### `POST /api/v1/bookings/`

Create a new booking request. The booking starts in `pending` status until an admin confirms it.

**Auth required:** Yes (`Authorization: Bearer <token>`)

**Request body:**
```json
{
  "room_id": "00000000-0000-0000-0001-000000000001",
  "start_date": "2026-06-10",
  "end_date": "2026-06-14"
}
```

| Field | Type | Constraints |
|---|---|---|
| `room_id` | UUID | Must reference an existing room |
| `start_date` | date | Must be today or in the future |
| `end_date` | date | Must be strictly after `start_date` |

**Success — `201 Created`:**
```json
{
  "id": "00000000-0000-0000-0002-000000000001",
  "room_id": "00000000-0000-0000-0001-000000000001",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "start_date": "2026-06-10",
  "end_date": "2026-06-14",
  "status": "pending",
  "total_cost": 4800.0,
  "created_at": "2026-05-09T14:00:00+02:00"
}
```

> `total_cost` is in **EGP** and is calculated as `price_per_night × number of nights`.

**Errors:**
```json
// 409 — BOOKING_OVERLAP
{ "error_code": "BOOKING_OVERLAP", "message": "The room is already booked for the selected dates.", "details": null }

// 404 — ROOM_NOT_FOUND
{ "error_code": "ROOM_NOT_FOUND", "message": "Room <id> not found", "details": null }

// 422 — VALIDATION_ERROR (e.g. end_date before start_date)
{ "error_code": "VALIDATION_ERROR", "message": "Request validation failed", "details": { "errors": [...] } }
```

---

#### `GET /api/v1/bookings/me`

List all bookings belonging to the authenticated user.

**Auth required:** Yes (`Authorization: Bearer <token>`)

**Success — `200 OK`:**
```json
[
  {
    "id": "00000000-0000-0000-0002-000000000001",
    "room_id": "00000000-0000-0000-0001-000000000001",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "start_date": "2026-06-10",
    "end_date": "2026-06-14",
    "status": "confirmed",
    "total_cost": 4800.0,
    "created_at": "2026-05-01T10:30:00+02:00"
  }
]
```

Possible `status` values: `pending`, `confirmed`, `cancelled`, `rejected`.

---

### Admin — `/admin`

> These endpoints are intended for admin users only. Auth enforcement is coming in Issue #6.

---

#### `GET /api/v1/admin/bookings`

List all bookings across all users.

**Auth required:** Yes — Admin role

**Success — `200 OK`:**

Same shape as `GET /bookings/me` but returns every booking in the system.

```json
[
  {
    "id": "00000000-0000-0000-0002-000000000001",
    "room_id": "00000000-0000-0000-0001-000000000001",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "start_date": "2026-06-10",
    "end_date": "2026-06-14",
    "status": "confirmed",
    "total_cost": 4800.0,
    "created_at": "2026-05-01T10:30:00+02:00"
  },
  {
    "id": "00000000-0000-0000-0002-000000000002",
    "room_id": "00000000-0000-0000-0001-000000000002",
    "user_id": "00000000-0000-0000-0000-000000000003",
    "start_date": "2026-07-01",
    "end_date": "2026-07-03",
    "status": "pending",
    "total_cost": 1600.0,
    "created_at": "2026-05-09T14:00:00+02:00"
  }
]
```

---

#### `PATCH /api/v1/admin/bookings/{booking_id}`

Update the status of a booking (confirm, reject, or cancel it).

**Auth required:** Yes — Admin role

**Path param:** `booking_id` — UUID of the booking

**Request body:**
```json
{
  "status": "confirmed"
}
```

Valid `status` values: `pending`, `confirmed`, `cancelled`, `rejected`

**Success — `200 OK`:**

Returns the full updated booking object:
```json
{
  "id": "00000000-0000-0000-0002-000000000001",
  "room_id": "00000000-0000-0000-0001-000000000001",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "start_date": "2026-06-10",
  "end_date": "2026-06-14",
  "status": "confirmed",
  "total_cost": 4800.0,
  "created_at": "2026-05-01T10:30:00+02:00"
}
```

**Errors:**
```json
// 404 — BOOKING_NOT_FOUND
{ "error_code": "BOOKING_NOT_FOUND", "message": "Booking <id> not found", "details": null }

// 422 — VALIDATION_ERROR (e.g. invalid status value)
{ "error_code": "VALIDATION_ERROR", "message": "Request validation failed", "details": { "errors": [...] } }
```

---

## 5. Versioning Policy

All endpoints are served under the `/api/v1/` prefix. This explicit versioning exists so that breaking changes — such as renaming fields, changing required parameters, or restructuring response shapes — can be introduced under `/api/v2/` without impacting any client that has already shipped against `v1`.

**What counts as a breaking change?**
- Removing or renaming a field in a response
- Changing a field's type (e.g. `int` → `string`)
- Making an optional field required in a request
- Changing the meaning of an error code

**What does NOT require a new version?**
- Adding new optional fields to a response
- Adding new endpoints
- Adding new optional query parameters

The `v1` contract is considered stable once Issue #6 is merged. After that, any breaking change will be announced to the mobile team at least one sprint in advance, and both versions will be maintained in parallel for at least two sprints before `v1` is deprecated.
