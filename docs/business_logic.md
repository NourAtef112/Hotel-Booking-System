# E-JUST Guest Housing — Business Logic Documentation

**Project:** E-JUST Guest Housing Booking System (Web Platform)
**Issue:** #6 — Business Logic & Availability Engine
**Module:** `backend/app/services/booking_service.py`

---

## 1. Overview

The E-JUST Guest Housing Booking System replaces the university's manual phone-based room reservation process with a web platform. Staff and visiting researchers book rooms through a browser; the housing office manages approvals through an admin panel.

Business rules exist to prevent three categories of failure:

| Category | Risk | Module that prevents it |
|---|---|---|
| Double-booking | Two users book the same room for overlapping dates | `BookingService.create_booking` + `ranges_overlap` |
| Invalid dates | Past-date, zero-night, or excessively long stays | `BookingCreate` Pydantic validators |
| Illegal workflow | Admin un-cancelling or un-rejecting a booking | `BookingService.update_booking_status` state machine |

**Layer ownership:** All domain rules live exclusively in `BookingService`. Routers translate HTTP ↔ service calls; repositories translate service calls ↔ storage. No rule appears in more than one layer.

---

## 2. The Date-Overlap Algorithm

### Formula

```python
def ranges_overlap(a_start, a_end, b_start, b_end) -> bool:
    return a_start < b_end and b_start < a_end
```

### Why strict `<` and not `<=`

In the hospitality domain, checkout happens in the morning and check-in in the afternoon. If guest A checks out on May 18 and guest B checks in on May 18, the room is cleaned between the two stays — **back-to-back is not a conflict.**

Using `<=` would incorrectly block that scenario. Strict `<` means `a_end == b_start` evaluates `b_start < a_end` as `False`, which is the correct "allowed" result.

### Four canonical cases (ASCII timelines)

```
Case 1 — Back-to-back: ALLOWED
A:  [===]
B:       [===]
a_start=May15, a_end=May18, b_start=May18, b_end=May21
May15 < May21 → True, but May18 < May18 → False  →  overlap = False ✓

Case 2 — Partial overlap: REJECTED
A:  [===]
B:     [===]
a_start=May15, a_end=May18, b_start=May17, b_end=May20
May15 < May20 → True,  May17 < May18 → True  →  overlap = True ✓

Case 3 — Contained: REJECTED
A:  [=======]
B:    [===]
a_start=May15, a_end=May18, b_start=May15, b_end=May16
May15 < May16 → True,  May15 < May18 → True  →  overlap = True ✓

Case 4 — Fully disjoint: ALLOWED
A:  [===]
B:          [===]
a_start=May15, a_end=May18, b_start=May19, b_end=May22
May15 < May22 → True,  May19 < May18 → False  →  overlap = False ✓
```

### Concurrency protection

The algorithm alone is not sufficient under concurrent load. Two simultaneous requests for the same room and same dates can both pass the overlap check before either one persists to the database. The production PostgreSQL layer **must** add a `SELECT FOR UPDATE` row-level lock on the room's bookings before checking overlaps, ensuring only one transaction proceeds at a time. The SQLAlchemy ORM model already includes a `ExcludeConstraint` via GiST indexing as a database-level safety net.

---

## 3. Cost Calculation

### Formula

```python
def calculate_cost(price_per_night: float, start_date: date, end_date: date) -> float:
    nights = (end_date - start_date).days
    return round(nights * price_per_night, 2)
```

### Example

GH-201 (Double room, 400 EGP/night), 3-night stay (June 1 → June 4):

```
nights = (June 4 - June 1).days = 3
total  = 3 × 400 = 1,200 EGP
```

### Edge: zero-night stay

A zero-night stay (`start_date == end_date`) yields `nights = 0` and `total_cost = 0.0`. This is rejected **before** `calculate_cost` is ever called, by the Pydantic validator that enforces `end_date > start_date`. The cost function itself never receives degenerate input.

---

## 4. Status State Machine

### Allowed transitions

| From \ To | `pending` | `confirmed` | `rejected` | `cancelled` |
|---|---|---|---|---|
| `pending` | — | ✅ | ✅ | ✅ |
| `confirmed` | ✗ | — | ✗ | ✅ |
| `rejected` | ✗ | ✗ | — | ✅ |
| `cancelled` | ✗ | ✗ | ✗ | — |

### Why `cancelled → confirmed` is forbidden

Once a booking is cancelled, the room may have been re-assigned to another guest. Reinstating a cancelled booking without re-checking availability would re-introduce the double-booking risk the entire system is designed to prevent. `cancelled` is a terminal state.

### Why `rejected → confirmed` is forbidden

An admin's rejection is a deliberate decision — the guest may have been notified and may have sought alternative accommodation. Silently reversing a rejection without the guest's knowledge would corrupt the workflow. If a rejection was made in error, the correct action is to create a new booking.

### Implementation

```python
_ALLOWED_TRANSITIONS = {
    "pending":   {"confirmed", "rejected", "cancelled"},
    "confirmed": {"cancelled"},
    "rejected":  {"cancelled"},
    "cancelled": set(),
}
```

Any transition where `new_status not in _ALLOWED_TRANSITIONS[current_status]` raises `IllegalStateTransitionError` (HTTP 422, `error_code="ILLEGAL_STATE_TRANSITION"`).

---

## 5. Pydantic Validators

All validators live in `BookingCreate` (`backend/app/schemas/booking.py`) inside a single `@model_validator(mode='after')`:

| Validator | Rule | Persona / Edge case it prevents |
|---|---|---|
| Past date | `start_date < date.today()` → `ValidationError` | H-3: Guest accidentally selects yesterday's date |
| Zero nights | `start_date >= end_date` → `ValidationError` | H-5: Guest sets check-out before check-in |
| 30-night cap | `(end_date - start_date).days > 30` → `ValidationError` | H-6: Guest tries to book for the entire semester |
| — | Valid: `start_date ≥ today`, `end_date > start_date`, duration ≤ 30 | H-1: Normal guest books 3-night conference stay |
| Far future | Dates in year 2999 accepted — no upper ceiling | H-4: Admin pre-books a room for next academic year |
| Historical | Year 1900 → `ValidationError` (past-date rule) | H-2: Data-entry error, impossible date |

All date arithmetic uses `date.today()` evaluated **server-side at request time**. Client-supplied timestamps are never trusted.

---

## 6. Real-Time Availability

### WebSocket pattern

The endpoint `GET /ws/availability` (defined in `backend/app/api/v1/ws_availability.py`) upgrades a standard HTTP connection to a WebSocket. The `ConnectionManager` singleton tracks all active connections.

```
Client                          Server
  |--- WS Upgrade /ws/availability -->|
  |<-- {"event":"snapshot","rooms":[…]} --|  ← current state on connect
  |                                    |
  |  (User A books GH-101)             |
  |<-- {"event":"room_availability_update","room_id":1,"available":false} --|
  |                                    |
  |  (User A cancels GH-101)           |
  |<-- {"event":"room_availability_update","room_id":1,"available":true} --|
```

### Events that trigger a broadcast

| Event | Triggered by | `available` value sent |
|---|---|---|
| Booking created | `BookingService.create_booking` | `false` |
| Booking cancelled | `BookingService.update_booking_status` (→ `cancelled`) | `true` |

Broadcasts for `confirmed` and `rejected` status changes are intentionally omitted — `available` is determined by whether an active booking exists, not by the admin workflow status.

### Client JSON schema

**Snapshot (on connect):**
```json
{
  "event": "snapshot",
  "rooms": [
    {"room_id": 1, "room_number": "GH-101", "available": true},
    {"room_id": 4, "room_number": "GH-202", "available": false}
  ]
}
```

**Live update (on booking event):**
```json
{
  "event": "room_availability_update",
  "room_id": 1,
  "available": false
}
```

---

## 7. Traceability

| Business Rule | Requirement ID | Test Function | Exception / HTTP Code |
|---|---|---|---|
| Back-to-back bookings allowed | BR-01 | `test_ranges_overlap[back-to-back]` | — |
| Partial overlap rejected | BR-01 | `test_ranges_overlap[partial overlap]` | `BookingOverlapError` / 409 |
| Contained overlap rejected | BR-01 | `test_ranges_overlap[contained inside]` | `BookingOverlapError` / 409 |
| Disjoint dates allowed | BR-01 | `test_ranges_overlap[fully disjoint]` | — |
| B starts before A overlap | BR-01 | `test_ranges_overlap[B starts before A]` | `BookingOverlapError` / 409 |
| Exact same dates overlap | BR-01 | `test_ranges_overlap[exact same dates]` | `BookingOverlapError` / 409 |
| Past start_date rejected | BR-02 | `test_past_start_date_raises` | `ValidationError` / 422 |
| Zero nights rejected | BR-03 | `test_zero_nights_raises` | `ValidationError` / 422 |
| End before start rejected | BR-03 | `test_end_before_start_raises` | `ValidationError` / 422 |
| >30 nights rejected | BR-04 | `test_more_than_30_nights_raises` | `ValidationError` / 422 |
| Valid booking accepted | BR-05 | `test_valid_booking_created` | — |
| Far-future dates accepted | BR-05 | `test_far_future_dates_accepted` | — |
| Year 1900 rejected | BR-02 | `test_year_1900_raises` | `ValidationError` / 422 |
| New booking starts as pending | BR-06 | `test_create_booking_no_existing_returns_pending` | — |
| Overlap raises BookingOverlapError | BR-01 | `test_create_booking_overlap_raises` | `BookingOverlapError` / 409 |
| Nonexistent room raises error | BR-07 | `test_create_booking_nonexistent_room_raises` | `RoomNotFoundError` / 404 |
| Cost = nights × price | BR-08 | `test_calculate_cost_3_nights` | — |
| Cost scales linearly | BR-08 | `test_calculate_cost_30_nights` | — |
| pending → confirmed allowed | BR-09 | `test_pending_to_confirmed_allowed` | — |
| pending → rejected allowed | BR-09 | `test_pending_to_rejected_allowed` | — |
| cancelled → confirmed forbidden | BR-10 | `test_cancelled_to_confirmed_raises` | `IllegalStateTransitionError` / 422 |
| rejected → confirmed forbidden | BR-10 | `test_rejected_to_confirmed_raises` | `IllegalStateTransitionError` / 422 |
