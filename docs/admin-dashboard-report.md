# E-JUST Guest House — Admin Dashboard
## Technical Report

| Field | Value |
|---|---|
| **Project** | Hotel Booking System |
| **Component** | Admin Dashboard (Web Application) |
| **Branch** | `feature/admin-dashboard-web` |
| **Institution** | Egypt-Japan University of Science & Technology |

---

## Abstract

This report documents the design, architecture, and implementation of the E-JUST Guest House Admin Dashboard — a modern, full-stack web application enabling administrators to manage room bookings, monitor revenue, handle guest information, and export structured reports. The system comprises a React 18 single-page application backed by a FastAPI/PostgreSQL REST API, communicating over a typed Axios client. Key deliverables include real-time booking management, animated analytics charts, light/dark theming, guest contact collection (name, email, mobile), and styled Excel export powered by ExcelJS.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Model](#3-data-model)
4. [REST API Reference](#4-rest-api-reference)
5. [Frontend Modules](#5-frontend-modules)
   - [Application Shell](#51-application-shell)
   - [Overview Page](#52-overview-page)
   - [Bookings Page](#53-bookings-page)
   - [Rooms Page](#54-rooms-page)
6. [ExportButton Component](#6-exportbutton-component)
7. [Excel Export System](#7-excel-export-system)
8. [Known Limitations & Future Work](#8-known-limitations--future-work)
9. [Conclusion](#9-conclusion)
10. [Appendix A — File Structure](#appendix-a--file-structure)
11. [Appendix B — Environment Configuration](#appendix-b--environment-configuration)

---

## 1. Introduction

### 1.1 Project Context

The E-JUST Guest House (officially the University Guest Housing Booking System) is an institutional accommodation platform for Egypt-Japan University of Science and Technology. It provides a guest-facing booking portal and a dedicated admin-only dashboard for managing the full lifecycle of room reservations.

This report focuses exclusively on the **Admin Dashboard** — the management interface accessible only to authorised staff. It covers the product scope, technical architecture, individual feature modules, data models, API contract, and the decisions made during development.

### 1.2 Goals and Scope

The Admin Dashboard was designed to satisfy the following requirements:

1. **Unified overview** — a single-screen summary of all key metrics (total bookings, occupancy rate, revenue pipeline, pending approvals, today's check-in/check-out schedule) with animated visualisations.
2. **Booking management** — list, search, filter, create, edit, and update the status of reservations; capture full guest contact details.
3. **Room management** — view the room inventory and create new rooms with type classification and pricing.
4. **Data export** — generate styled `.xlsx` workbooks for reservations, monthly booking counts, and revenue trends.
5. **Real-time UX** — optimistic UI updates, smooth CSS transitions, and skeleton loading states throughout.
6. **Adaptive theming** — full dark-mode and light-mode support with a shared brand colour scheme.

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

The system follows a classic client–server separation:

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend SPA | Vite + React 18 + TypeScript | UI, state, routing |
| API Client | Axios + TanStack Query v5 | HTTP, caching, mutations |
| Backend API | FastAPI (Python 3.11) | Business logic, auth |
| Database | PostgreSQL (async SQLAlchemy) | Persistence |

The frontend is served on port **5173** (Vite dev server) and communicates with the backend on port **8003** via a typed REST API. All admin routes are mounted at the `/api/admin` prefix in the FastAPI application.

### 2.2 Frontend Stack

| Package | Version | Role |
|---|---|---|
| Vite | 5 | Build tooling, HMR dev server |
| React | 18 | Component model, concurrent rendering |
| TypeScript | 5 | Strict end-to-end type safety |
| Tailwind CSS | 3 | Utility-first styling, `dark:` variants |
| TanStack Query | 5 | Server-state, optimistic updates, cache |
| Axios | — | HTTP client, configured from `.env` |
| ExcelJS | — | Client-side `.xlsx` generation |

Custom Tailwind design tokens (brand red `#B30000`, glassmorphism helpers) are defined in `tailwind.config.js`.

### 2.3 Backend Stack

| Package | Role |
|---|---|
| FastAPI | Async Python web framework; auto-generates OpenAPI docs at `/docs` |
| SQLAlchemy 2 (async) | ORM with `AsyncSession`; Core `select()` query style |
| Pydantic v2 | Request/response validation; `from_attributes=True` for ORM conversion |
| PostgreSQL | Relational database; GiST exclusion constraint prevents double-bookings |
| Uvicorn | ASGI server |

### 2.4 Request Lifecycle

A typical admin action (e.g. confirming a booking) follows this path:

1. Admin clicks **Confirm** in the UI.
2. TanStack Query's `useMutation` fires `onMutate`: the local cache is updated immediately (**optimistic UI**).
3. Axios sends `PATCH /api/admin/bookings/{id}/status` to the FastAPI backend.
4. FastAPI validates the payload with Pydantic, calls `AdminRepository.update_booking_status()`, commits to PostgreSQL, and returns the updated `BookingResponse`.
5. On success, `onSuccess` replaces the optimistic record with the server response; `onSettled` invalidates the bookings query to trigger a background refetch.
6. On failure, `onError` rolls back the cache to the `snapshot` captured in `onMutate`.

---

## 3. Data Model

### 3.1 `rooms` Table

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `SERIAL` | NO | Primary key |
| `room_number` | `VARCHAR` | NO | e.g. "A101" |
| `room_type` | `VARCHAR` | NO | single / double / suite / family |
| `capacity` | `INTEGER` | NO | Persons |
| `price_per_night` | `NUMERIC(10,2)` | NO | EGP |
| `is_active` | `BOOLEAN` | NO | Soft-delete flag |
| `created_at` | `TIMESTAMPTZ` | NO | Server default |

### 3.2 `bookings` Table

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `SERIAL` | NO | Primary key |
| `user_id` | `INTEGER` | NO | FK → users |
| `room_id` | `INTEGER` | NO | FK → rooms |
| `check_in_date` | `DATE` | NO | |
| `check_out_date` | `DATE` | NO | Must be after check-in |
| `total_price` | `NUMERIC(10,2)` | NO | EGP |
| `status` | `booking_status_enum` | NO | pending / confirmed / cancelled / completed |
| `special_requests` | `TEXT` | YES | Encodes guest contact info |
| `created_at` | `TIMESTAMPTZ` | NO | Server default |
| `updated_at` | `TIMESTAMPTZ` | YES | `onupdate` |

> **Guest Contact Encoding**
>
> Because guest email and phone were added without a schema migration, they are encoded inside the existing `special_requests` column using a pipe-delimited format:
>
> ```
> Manual booking for guest: {name}|{email}|{phone}
> ```
>
> The backend helper `_parse_guest()` splits on `|` and is backward-compatible with old records that only contain the name segment. New records written by `_encode_guest()` always include all three fields (empty string when not provided).

### 3.3 API Schemas (Pydantic)

**BookingResponse**
```python
class BookingResponse(BaseModel):
    id: int
    guest_name: str
    guest_email: str | None = None
    guest_phone: str | None = None
    room_id: int
    start_date: str   # YYYY-MM-DD
    end_date: str     # YYYY-MM-DD
    status: str       # pending | confirmed | cancelled | completed
    model_config = {"from_attributes": True}
```

**ManualBookingCreate**
```python
class ManualBookingCreate(BaseModel):
    guest_name: str
    guest_email: str | None = None
    guest_phone: str | None = None
    room_id: int
    start_date: str   # YYYY-MM-DD
    end_date: str     # YYYY-MM-DD
```

**BookingUpdate**
```python
class BookingUpdate(BaseModel):
    guest_name:  str | None = None
    guest_email: str | None = None
    guest_phone: str | None = None
    start_date:  str | None = None
    end_date:    str | None = None
```

---

## 4. REST API Reference

All admin endpoints are mounted at `/api/admin` and require no authentication token in the current development build.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/rooms` | Return list of active rooms (paginated) |
| `POST` | `/api/admin/rooms` | Create a new room (number, type, price) |
| `GET` | `/api/admin/bookings` | Return all bookings with guest info decoded |
| `POST` | `/api/admin/bookings/manual` | Create a booking on behalf of a guest |
| `PATCH` | `/api/admin/bookings/{id}` | Edit guest name, email, phone, or dates |
| `PATCH` | `/api/admin/bookings/{id}/status` | Transition booking status |

### 4.1 Status Transition Rules

| Current Status | Allowed Transitions |
|---|---|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `completed`, `cancelled` |
| `cancelled` | `confirmed` (re-confirm) |
| `completed` | none |

---

## 5. Frontend Modules

### 5.1 Application Shell

#### AdminLayout

The `AdminLayout` component wraps every admin page and provides:

- **Sidebar** — navigation links to Overview, Bookings, and Rooms; the E-JUST logo with a CSS `brightness` filter that inverts it for light mode.
- **Top bar** — notification bell and user avatar.
- **Theme toggle** — switches between `dark`, `light`, and `system` modes; persisted in `localStorage`.

#### Notification System

A global `NotificationContext` (React Context API) maintains a list of in-memory notifications. Three event types are emitted:

| Event | Trigger |
|---|---|
| `new_booking` | Manual booking created successfully |
| `status_change` | Booking status updated |
| `new_room` | Room created successfully |

The `NotificationBell` component renders a dropdown with unread counts, colour-coded icons, and relative timestamps. It is fully adapted for both dark and light modes using the `text-gray-X dark:text-white/XX` pattern.

#### Theming

Tailwind's `dark:` variants are activated by toggling the `.dark` class on the `<html>` element. Global overrides for light mode are applied in `index.css` using the `html:not(.dark)` selector.

The design language is **glassmorphism**: translucent card backgrounds (`backdrop-blur`), subtle white/black border opacities, and a brand-red (`#B30000`) accent colour. Cards also feature a **cursor-tracked border glow** via the `useGlowCard()` hook, which sets CSS custom properties `--mx` / `--my` and a `::before` radial-gradient pseudo-element on hover.

---

### 5.2 Overview Page

The Overview page is the dashboard landing screen, providing a comprehensive snapshot of the guest house's operational state.

#### Stat Cards

Four animated stat cards:

| Card | Value | Accent Colour |
|---|---|---|
| Total Bookings | `counts.total` | White |
| Confirmed | `counts.confirmed` | Emerald |
| Pending | `counts.pending` | Amber |
| Cancelled | `counts.cancelled` | Red |

Each card uses a `useCountUp()` hook that animates the number from 0 to the target value using an ease-out quartic curve over 1.1 seconds, triggering once data has loaded.

#### Today's Agenda

Filters all bookings to find those whose `start_date` or `end_date` matches today's ISO date. Renders guest initials, room number, and a colour-coded "Check-in" / "Check-out" badge.

#### Pending Approvals

Filters bookings with `status === 'pending'` and surfaces inline **Confirm** and **Reject** action buttons. Each action fires `useUpdateBookingStatus()` with an optimistic cache update.

#### Revenue Cards

| Card | Calculation |
|---|---|
| Confirmed Revenue | Sum of `nights × price_per_night` for confirmed + completed bookings |
| Pending Revenue | Same calculation for pending bookings |
| Total Pipeline | Confirmed + pending combined |

Revenue is formatted with an Egyptian locale helper (`fmtEGP`) that abbreviates to `K` or `M EGP` when appropriate.

#### Charts

**Monthly Bookings Bar Chart**
An inline SVG bar chart spanning the last 6 calendar months. Bars grow upwards on mount using a CSS `barGrow` keyframe with a `cubic-bezier(0.34, 1.56, 0.64, 1)` spring. Grid lines and labels adapt to dark/light mode via computed colour variables.

**Status Breakdown**
A horizontal stacked progress bar followed by per-status rows, each with a mini bar animating to the correct proportion. Counts and percentages are derived from the bookings array with `useMemo`.

**Revenue Trend Line Chart**
An SVG polyline/polygon chart showing monthly confirmed revenue. The line is drawn using a `stroke-dashoffset` animation (`lineDrawIn`) over 1.2 seconds. Dots appear with a `dotPop` spring animation.

**Revenue by Room Type**
Horizontal progress bars — one per room type (Single, Double, Suite, Family) — showing the proportion of total confirmed revenue attributable to each category. Colour-coded with type-specific accent colours:

| Type | Colour |
|---|---|
| Single | `#60a5fa` (blue) |
| Double | `#a78bfa` (purple) |
| Suite | `#fbbf24` (amber) |
| Family | `#34d399` (green) |

#### Recent Activity Feed

The 7 most recently created bookings (sorted by descending ID) listed with guest initials avatar, room number, nights, check-in date, status badge, and cost estimate.

#### Export Functions

| Button | Output file |
|---|---|
| Export Report (header) | `ejust-overview-report-YYYY-MM-DD.xlsx` |
| Export chart data (bar chart) | `ejust-monthly-bookings-YYYY-MM-DD.xlsx` |
| Export revenue data (line chart) | `ejust-revenue-trend-YYYY-MM-DD.xlsx` |

---

### 5.3 Bookings Page

The Bookings page is the primary operational tool for reservation management.

#### Reservation Table

A scrollable table with columns: ID, Guest Name, Room, Check-in, Check-out, Status, Actions. Features:

- **Search** — real-time filtering by guest name (case-insensitive).
- **Status filter** — dropdown built on a custom `CustomSelect` component with dark/light adaptive styling.
- **Skeleton loading** — three animated skeleton rows while the API request is in flight.
- **Inline quick actions** — per-row Confirm / Cancel buttons appear on row hover; hidden when inapplicable.
- **Row click** — opens the Booking Detail Modal for the selected record.

#### Booking Detail Modal

A full-featured slide-in modal with smooth entry/exit animations.

**Animation Pattern**

The modal uses a two-state animation trick to ensure CSS transitions always play from a hidden state, even when the component is freshly mounted:

1. A `staleBooking` state preserves the last non-null booking so content remains visible during the close animation.
2. A `visible` state lags one `requestAnimationFrame` behind `isOpen`, giving the browser one paint cycle to render the initial hidden state before applying transition classes.
3. After close, a 320 ms `setTimeout` clears `staleBooking`, fully unmounting the DOM.

**Editable Fields**

| Field | Type | Validation |
|---|---|---|
| Guest Name | Text input | Non-empty |
| Email | Email input | Optional |
| Mobile | Tel input | Optional |
| Check-in | Date picker | Must be before check-out |
| Check-out | Date picker | Must be after check-in |

The **Save Changes** button is disabled until at least one field differs from the server value (`isDirty`), and again if dates are invalid (`datesInvalid`). On success the modal closes automatically; on failure a red error banner appears in the footer.

**Status Flow Bar**

A three-step progress indicator (Pending → Confirmed → Completed) rendered with styled div nodes. The "Cancelled" state replaces the flow bar with a red cancellation badge.

**Live Cost Summary**

When the date range is valid, a live cost calculation is shown:

```
cost = nights × price_per_night
```

where `price_per_night` is looked up from the room map.

#### Manual Booking Form

A modal form for creating bookings on behalf of guests. Fields:

1. Guest Name (required)
2. Email (optional)
3. Mobile Number (optional)
4. Room ID (required, integer)
5. Check-in date (required)
6. Check-out date (required, must be after check-in)

On submission the backend creates the booking under an admin proxy user, encoding all three contact fields into `special_requests`. TanStack Query's optimistic update adds the booking to the cache instantly; the real server record replaces it on success.

#### Excel Export — Bookings Sheet

The **Export Excel** button generates a 12-column `.xlsx` workbook:

| Col | Header | Notes |
|---|---|---|
| 1 | ID | Centred |
| 2 | Guest Name | |
| 3 | Email | Blue font |
| 4 | Mobile | |
| 5 | Room No. | Centred |
| 6 | Room Type | Centred |
| 7 | Check-in | Centred |
| 8 | Check-out | Centred |
| 9 | Nights | Bold, centred |
| 10 | Status | Cell fill colour matches status |
| 11 | Price/Night (EGP) | Right-aligned, `#,##0` format, green font |
| 12 | Total Cost (EGP) | Right-aligned, `#,##0` format, green font |

Auto-filter on row 5. Rows 1–5 frozen. Alternating row stripes (`#F7F7F7`).

---

### 5.4 Rooms Page

The Rooms page presents the accommodation inventory and supports room creation.

#### Room Inventory Table

Columns: ID, Room Number, Type (colour-coded badge), Price/Night. Filtering by room number (text search) and type (dropdown). The count summary strip above the table shows totals broken down by type.

#### Add Room Modal

Three fields:

| Field | Type | Validation |
|---|---|---|
| Room Number | Text | Required |
| Room Type | Dropdown (Single/Double/Suite/Family) | Required |
| Price per Night (EGP) | Numeric | Must be > 0 |

`useCreateRoom()` handles optimistic insertion with a temporary negative ID, replaced by the real server ID on success.

---

## 6. ExportButton Component

A reusable component providing a consistent export interaction pattern. It wraps any async export function and manages three visual states:

| State | Icon | Appearance |
|---|---|---|
| `idle` | Download arrow | Muted, hover-lightens |
| `loading` | Spinning loader | Muted, `cursor-wait` |
| `done` | Check mark | Emerald, "Exported!" label for 2.4 s |

**Variants:**

- `default` — labelled button with icon + text (page-header placement)
- `icon` — compact 32×32 px square (inside chart card headers)

Both variants are fully adaptive for dark and light modes.

---

## 7. Excel Export System

All data exports use ExcelJS to generate `.xlsx` files entirely in the browser, without any server-side involvement. The `lib/exportExcel.ts` module exposes four async functions:

| Function | Output |
|---|---|
| `exportBookingsExcel()` | Full reservation sheet (12 cols) |
| `exportOverviewExcel()` | Multi-section overview report |
| `exportMonthlyChartExcel()` | Monthly booking counts + revenue |
| `exportRevenueTrendExcel()` | Revenue trend + by-type breakdown |

### 7.1 Colour Palette (ARGB)

| Name | ARGB | Usage |
|---|---|---|
| Brand Red | `FFB30000` | Hero title row, column headers |
| Dark BG | `FF181818` | Subtitle row |
| Section BG | `FF2A2A2A` | Section heading rows |
| Stripe BG | `FFF7F7F7` | Odd data rows |
| Confirmed | `FFD1FAE5` / `FF065F46` | Status fill / font |
| Pending | `FFFEF3C7` / `FF92400E` | Status fill / font |
| Cancelled | `FFFEE2E2` / `FF991B1B` | Status fill / font |
| Completed | `FFF3F4F6` / `FF374151` | Status fill / font |

### 7.2 Workbook Title Block Structure

| Row | Content | Style |
|---|---|---|
| 1 | "E-JUST GUEST HOUSE" | Brand red, 16pt bold, 44 px height |
| 2 | Report subtitle | Dark BG, 11pt bold |
| 3 | Generation timestamp | Muted italic, 9pt |
| 4 | Spacer | Empty |
| 5 | Column headers | Brand red (bookings) or section BG |

Rows 1–5 are frozen in all workbooks. Auto-filter applied on the header row.

---

## 8. Known Limitations & Future Work

### 8.1 Current Limitations

| # | Limitation | Notes |
|---|---|---|
| 1 | **No authentication on admin routes** | `/api/admin` endpoints accept requests without token verification — intentional for dev, must be secured before production |
| 2 | **Guest contact in `special_requests`** | Email and phone stored as pipe-encoded string rather than dedicated DB columns |
| 3 | **No pagination UI** | API supports `skip`/`limit` but frontend fetches all records in one request |
| 4 | **No room editing or deletion** | Rooms page only supports creation |
| 5 | **No date-range filter on bookings** | Search limited to guest name and status |

### 8.2 Recommended Future Enhancements

1. Add JWT/session authentication to all `/api/admin` routes, enforcing `role = 'admin'`.
2. Migrate guest contact fields to proper database columns via an Alembic migration.
3. Implement server-sent events or WebSocket push for real-time booking notifications.
4. Add a printable/PDF booking confirmation generator.
5. Introduce server-side pagination and date-range filtering.
6. Add room editing and soft-delete (toggle `is_active`).
7. Internationalise the interface (Arabic/English switcher).

---

## 9. Conclusion

The E-JUST Guest House Admin Dashboard delivers a complete administrative interface built on modern web standards. The combination of React 18's concurrent model, TanStack Query's server-state primitives, and FastAPI's async I/O produces a responsive, reliable experience with predictable optimistic updates and graceful error handling.

The visual design — glassmorphic cards, animated statistics, cursor-tracked glows, and a brand-red accent — reflects the E-JUST institutional identity while meeting contemporary SaaS dashboard expectations. Full light/dark mode support ensures the interface is usable across a range of display environments.

The Excel export system, powered entirely by ExcelJS in the browser, produces professionally styled `.xlsx` workbooks that operational staff can immediately use for record-keeping, auditing, and reporting — without any server-side rendering overhead.

The codebase is structured for maintainability: strict TypeScript types throughout, a clean hook/component separation, and a thin API client layer that isolates HTTP concerns from UI logic. Future work — authentication, server-push notifications, pagination, and a proper guest contact schema migration — can be layered onto this foundation without architectural changes.

---

## Appendix A — File Structure

```
Hotel-Booking-System/
├── backend/
│   └── app/
│       ├── api/
│       │   ├── admin_routes.py      # Admin REST endpoints
│       │   └── deps.py              # get_db dependency
│       ├── models/
│       │   ├── booking.py           # SQLAlchemy Booking model
│       │   └── room.py              # SQLAlchemy Room model
│       ├── repositories/
│       │   └── admin_repo.py        # DB access layer
│       ├── schemas/
│       │   └── admin.py             # Pydantic DTOs
│       └── main.py                  # FastAPI app + router registration
└── web-app/
    └── src/
        ├── components/
        │   ├── ExportButton.tsx     # Async export button (idle/loading/done)
        │   └── NotificationBell.tsx # Notification dropdown
        ├── contexts/
        │   ├── NotificationContext.tsx
        │   └── ThemeContext.tsx
        ├── hooks/
        │   ├── useAdminApi.ts       # TanStack Query hooks
        │   └── useGlowCard.ts       # Cursor-tracked glow
        ├── layouts/
        │   └── AdminLayout.tsx      # Sidebar + top bar shell
        ├── lib/
        │   ├── apiClient.ts         # Axios instance + adminApi
        │   ├── exportCsv.ts         # Legacy CSV helper
        │   └── exportExcel.ts       # ExcelJS export functions
        ├── pages/admin/
        │   ├── Overview.tsx         # Dashboard overview page
        │   ├── Bookings.tsx         # Booking management page
        │   └── Rooms.tsx            # Room inventory page
        └── types/
            └── admin.ts             # TypeScript interfaces
```

---

## Appendix B — Environment Configuration

**`web-app/.env`**
```env
VITE_API_BASE_URL=http://localhost:8003
```

**Starting the development servers**
```bash
# Backend (port 8003)
cd backend
venv/Scripts/python -m uvicorn app.main:app --port 8003

# Frontend (port 5173)
cd web-app
npm run dev
```

**API documentation**

Once the backend is running, interactive API docs are available at:
- Swagger UI: `http://localhost:8003/docs`
- ReDoc: `http://localhost:8003/redoc`
