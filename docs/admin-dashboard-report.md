# E-JUST Guest House — Admin Dashboard
## Technical Report — Version 2

| Field | Value |
|---|---|
| **Project** | Hotel Booking System |
| **Component** | Admin Dashboard (Web Application) |
| **Branch** | `feature/admin-dashboard-web` → `master` |
| **Institution** | Egypt-Japan University of Science & Technology |

---

## Abstract

This report documents the design, architecture, and implementation of the E-JUST Guest House Admin Dashboard — a modern, full-stack web application enabling administrators to manage room bookings, monitor revenue, handle guest information, and export structured reports.

Version 2 extends the original dashboard with six major operational additions: an **Occupancy Calendar** with variable-width today highlighting, a **Guest Directory** derived from booking history, a **Housekeeping Kanban Board** with HTML5 drag-and-drop, and **Bulk Booking Actions** with multi-select and batch status updates. Three new shared UI components were also introduced: a custom **DatePicker**, a **PhoneInput** with live country-code validation, and a **RoomPickerSelect** that prevents double-booking at the point of entry. Interactive click-through modals were added to the Today's Agenda widget and the Rooms inventory table.

---

## Table of Contents

1. [What's New in Version 2](#1-whats-new-in-version-2)
2. [Introduction](#2-introduction)
3. [Architecture Overview](#3-architecture-overview)
4. [Data Model](#4-data-model)
5. [REST API Reference](#5-rest-api-reference)
6. [New Operational Modules (v2)](#6-new-operational-modules-v2)
   - [Occupancy Calendar](#61-occupancy-calendar)
   - [Guest Directory](#62-guest-directory)
   - [Housekeeping Board](#63-housekeeping-board)
   - [Bulk Booking Actions](#64-bulk-booking-actions)
7. [New Shared UI Components (v2)](#7-new-shared-ui-components-v2)
   - [DatePicker](#71-datepicker)
   - [PhoneInput](#72-phoneinput)
   - [RoomPickerSelect](#73-roompickerselect)
   - [AgendaPreviewModal](#74-agendapreviewmodal)
   - [RoomDetailModal](#75-roomdetailmodal)
8. [Frontend Modules (Existing Pages)](#8-frontend-modules-existing-pages)
   - [Application Shell](#81-application-shell)
   - [Overview Page](#82-overview-page)
   - [Bookings Page (updated)](#83-bookings-page-updated)
   - [Rooms Page (updated)](#84-rooms-page-updated)
9. [Shared Infrastructure](#9-shared-infrastructure)
10. [Excel Export System](#10-excel-export-system)
11. [Known Limitations & Future Work](#11-known-limitations--future-work)
12. [Conclusion](#12-conclusion)
13. [Appendix A — File Structure](#appendix-a--file-structure)
14. [Appendix B — Environment Configuration](#appendix-b--environment-configuration)

---

## 1. What's New in Version 2

Version 2 of the Admin Dashboard introduces six major features and four new shared UI components, all merged into the `master` branch.

### 1.1 New Pages

| Page | Route | Description |
|---|---|---|
| Occupancy Calendar | `/admin/calendar` | Month-view room × day grid |
| Guest Directory | `/admin/guests` | Aggregated guest records from bookings |
| Housekeeping Board | `/admin/housekeeping` | Kanban with HTML5 drag-and-drop |

### 1.2 New Shared Components

| Component | Purpose |
|---|---|
| `DatePicker` | Unified custom date picker replacing native `<input type="date">` |
| `PhoneInput` | Country-code picker + digit-length validation for 20 countries |
| `RoomPickerSelect` | Rich room dropdown that excludes rooms with overlapping bookings |
| `AgendaPreviewModal` | Booking detail overlay triggered from Today's Agenda |
| `RoomDetailModal` | Room statistics overlay triggered from Rooms inventory table |

### 1.3 Enhancements to Existing Pages

- **Bookings page**:
  - Date-range filter bar (previously a known limitation — now resolved).
  - Bulk selection with header checkbox (indeterminate state), floating action bar: *Confirm All*, *Cancel All*, *Export Selected*.
  - Room picker dropdown replaces the raw numeric room-ID input.
  - `PhoneInput` component in both the new-booking form and the booking detail modal.
- **Overview page**: Guest rows in Today's Agenda are now clickable, opening `AgendaPreviewModal` with full booking details, cost, and contact links.
- **Rooms page**: Room rows are now clickable, opening `RoomDetailModal` with occupancy stats, upcoming reservations list, revenue total, and shortcuts to Edit or Remove.
- **Sidebar**: Calendar, Guests, and Housekeeping navigation items added with distinct SVG icons.

---

## 2. Introduction

### 2.1 Project Context

The E-JUST Guest House (officially the University Guest Housing Booking System) is an institutional accommodation platform for Egypt-Japan University of Science and Technology. It provides a guest-facing booking portal and a dedicated admin-only dashboard for managing the full lifecycle of room reservations.

This report focuses exclusively on the **Admin Dashboard** — the management interface accessible only to authorised staff. It covers the product scope, technical architecture, individual feature modules, data models, API contract, and the decisions made during development.

### 2.2 Goals and Scope

The Admin Dashboard was designed to satisfy the following requirements:

1. **Unified overview** — a single-screen summary of all key metrics (total bookings, occupancy rate, revenue pipeline, pending approvals, today's check-in/check-out schedule) with animated visualisations.
2. **Booking management** — list, search, filter, create, edit, and update the status of reservations; capture full guest contact details; bulk-confirm or bulk-cancel selected reservations.
3. **Room management** — view the room inventory and create new rooms with type classification and pricing; inspect per-room statistics.
4. **Occupancy planning** — a month-view calendar grid showing which rooms are booked on which days, with status-colour coding and interactive booking popups.
5. **Guest intelligence** — a searchable directory of unique guests derived from booking history, with expandable stay records and revenue totals.
6. **Housekeeping operations** — a drag-and-drop Kanban board that tracks the cleaning status of each room throughout the day, seeded automatically from that day's checkouts.
7. **Data export** — generate styled `.xlsx` workbooks for reservations, monthly booking counts, revenue trends, and ad-hoc selected-booking subsets.
8. **Real-time UX** — optimistic UI updates, smooth CSS transitions, and skeleton loading states throughout.
9. **Adaptive theming** — full dark-mode and light-mode support with a shared brand colour scheme.

---

## 3. Architecture Overview

### 3.1 High-Level Architecture

The system follows a classic client–server separation:

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend SPA | Vite + React 18 + TypeScript | UI, state, routing |
| API Client | Axios + TanStack Query v5 | HTTP, caching, mutations |
| Backend API | FastAPI (Python 3.11) | Business logic, auth |
| Database | PostgreSQL (async SQLAlchemy) | Persistence |

The frontend is served on port **5173** (Vite dev server) and communicates with the backend on port **8003** via a typed REST API. All admin routes are mounted at the `/api/admin` prefix in the FastAPI application.

### 3.2 Frontend Stack

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

### 3.3 Backend Stack

| Package | Role |
|---|---|
| FastAPI | Async Python web framework; auto-generates OpenAPI docs at `/docs` |
| SQLAlchemy 2 (async) | ORM with `AsyncSession`; Core `select()` query style |
| Pydantic v2 | Request/response validation; `from_attributes=True` for ORM conversion |
| PostgreSQL | Relational database; GiST exclusion constraint prevents double-bookings |
| Uvicorn | ASGI server |

### 3.4 Request Lifecycle

A typical admin action (e.g. confirming a booking) follows this path:

1. Admin clicks **Confirm** in the UI.
2. TanStack Query's `useMutation` fires `onMutate`: the local cache is updated immediately (**optimistic UI**).
3. Axios sends `PATCH /api/admin/bookings/{id}/status` to the FastAPI backend.
4. FastAPI validates the payload with Pydantic, calls `AdminRepository.update_booking_status()`, commits to PostgreSQL, and returns the updated `BookingResponse`.
5. On success, `onSuccess` replaces the optimistic record with the server response; `onSettled` invalidates the bookings query to trigger a background refetch.
6. On failure, `onError` rolls back the cache to the `snapshot` captured in `onMutate`.

---

## 4. Data Model

### 4.1 `rooms` Table

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `SERIAL` | NO | Primary key |
| `room_number` | `VARCHAR` | NO | e.g. "A101" |
| `room_type` | `VARCHAR` | NO | single / double / suite / family |
| `capacity` | `INTEGER` | NO | Persons |
| `price_per_night` | `NUMERIC(10,2)` | NO | EGP |
| `is_active` | `BOOLEAN` | NO | Soft-delete flag |
| `created_at` | `TIMESTAMPTZ` | NO | Server default |

### 4.2 `bookings` Table

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

### 4.3 API Schemas (Pydantic)

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

## 5. REST API Reference

All admin endpoints are mounted at `/api/admin` and require no authentication token in the current development build.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/rooms` | Return list of active rooms |
| `POST` | `/api/admin/rooms` | Create a new room |
| `PATCH` | `/api/admin/rooms/{id}` | Edit room number, type, or price |
| `DELETE` | `/api/admin/rooms/{id}` | Soft-delete a room (`is_active = false`) |
| `GET` | `/api/admin/bookings` | Return all bookings with guest info decoded |
| `POST` | `/api/admin/bookings/manual` | Create a booking on behalf of a guest |
| `PATCH` | `/api/admin/bookings/{id}` | Edit guest name, email, phone, or dates |
| `PATCH` | `/api/admin/bookings/{id}/status` | Transition booking status |

### 5.1 Status Transition Rules

| Current Status | Allowed Transitions |
|---|---|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `completed`, `cancelled` |
| `cancelled` | `confirmed` (re-confirm) |
| `completed` | none |

---

## 6. New Operational Modules (v2)

### 6.1 Occupancy Calendar

#### Overview

The Calendar page (`/admin/calendar`) provides a month-view occupancy grid. Rooms are displayed as sticky left-column rows; each of the month's days occupies a column that scrolls horizontally. Booking blocks span their full date range and are colour-coded by status.

#### Grid Layout

| Dimension | Value | Notes |
|---|---|---|
| Normal day column | 72 px | `DAY_W` constant |
| Today column | 108 px | Wider to make the current day prominent |
| Row height | 56 px | `ROW_H` constant |
| Room label column | 168 px | Sticky; alternating `#111`/`#0d0d0d` |

The total grid width is computed dynamically as `LEFT_W + Σ dayW(d)` for each day `d` in the month, where `dayW(d)` returns `TODAY_W` for today and `DAY_W` for every other day.

#### Today Column

The today column is 50% wider than a normal day (108 px vs. 72 px). Its header displays:
- The abbreviated day-of-week name.
- The date number inside a larger red circle with a glow shadow (`0 0 12px rgba(179,0,0,0.5)`).
- A small *"Today"* label below the number.

Body cells in the today column have a stronger red tint (`rgba(179,0,0,0.055)`) and a `border-primary/20` column rule.

#### Auto-scroll to Today

On mount and when the *Today* button is pressed, the component calculates the today column's left-pixel offset (summing all column widths from day 1 to day before today) and scrolls the container to centre that column:

```
scrollLeft = LEFT_W + Σ(i=1 to today-1) dayW(i) − clientWidth/2 + dayW(today)/2
```

#### Booking Blocks

Each booking block spans from its `start_date` to the day before `end_date` (check-out day is not shaded). Rendering rules:

- **First-day cell**: 3 px coloured left border, 6 px left border-radius; guest's first name displayed in 11 pt semi-bold.
- **Middle cells**: zero left/right borders, no radius.
- **Last-day cell**: 1 px coloured right border, 6 px right border-radius.

| Status | Background | Text / Border |
|---|---|---|
| Confirmed | `rgba(16,185,129,0.18)` | `#34d399` emerald |
| Pending | `rgba(245,158,11,0.18)` | `#fbbf24` amber |
| Completed | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.35)` |
| Cancelled | `rgba(239,68,68,0.08)` | `rgba(239,68,68,0.5)` |

#### Booking Popup

Clicking a block opens a floating card positioned at the cursor. The popup implements smart vertical positioning: if the card would overflow the viewport bottom it is flipped above the cursor. It shows guest name, status, room number, check-in/out dates, duration, total cost, and email (if available).

#### Month Navigation and Filters

- Previous / Next chevron buttons change the displayed month.
- The *Today* button also scrolls to today's column (not just changes the month).
- A status filter pill-group (*All / Confirmed / Pending / Completed / Cancelled*) filters the `roomDayMap` computation.
- An occupancy stat badge shows the percentage of room-days that are booked in the current month.

---

### 6.2 Guest Directory

#### Overview

The Guests page (`/admin/guests`) aggregates all bookings into unique guest records, keyed by email address (falling back to normalised guest name when no email is present).

#### Guest Record

Each `GuestRecord` aggregates across all matching bookings:

| Field | Computation |
|---|---|
| `name` | From the first matching booking |
| `email` | From any booking that has an email |
| `phone` | From any booking that has a phone |
| `totalNights` | Sum of nights across all bookings |
| `totalSpent` | Sum of `nights × price_per_night` |
| `lastVisit` | Maximum `start_date` across all bookings |
| `firstVisit` | Minimum `start_date` across all bookings |

#### Guest Card

Each guest is rendered as a collapsible card:

- **Avatar** — initials in a hue-from-name coloured circle (`hue = charCode sum % 360`), providing a distinctive visual identity per guest.
- **Summary row** — name, email, phone, total stays, nights, revenue, and last-visit date, all visible at a glance.
- **Status chips** — compact pills showing confirmed / pending booking counts.
- **Expanded history** — clicking opens a sorted list of all bookings for that guest: booking ID, room, dates, nights, status badge, and cost.

#### Search and Sort

A search input filters by name, email, or phone (case-insensitive). A sort pill-group supports: *Last Visit*, *Stays*, *Nights*, *Spent*, *Name* — each toggleable between ascending and descending. The direction is indicated by a chevron beside the active sort label.

A top-bar summary shows: unique guest count, total bookings, and total revenue across all guests currently displayed.

---

### 6.3 Housekeeping Board

#### Overview

The Housekeeping page (`/admin/housekeeping`) provides a Kanban board for tracking room cleaning status throughout the day.

#### Columns

| Column | Colour | Initial Contents |
|---|---|---|
| Needs Cleaning | Red | Rooms whose `end_date` equals today |
| Being Cleaned | Amber | Empty (moved there by staff during the day) |
| Ready | Emerald | All other non-occupied rooms |

Currently occupied rooms (confirmed booking where `start_date ≤ today < end_date`) are excluded from the board and displayed in a separate notice bar.

#### Drag and Drop

The board uses the HTML5 Drag and Drop API (`draggable`, `onDragStart`, `onDragOver`, `onDrop`). A `draggingId` ref tracks which room is in flight. When a card is dropped on a column, that room's status is updated and the board state is persisted to `localStorage`.

#### State Persistence

Board state is stored in `localStorage` under the key `hk_board_YYYY-MM-DD`, where the date is today's ISO string. This means:

- State survives page reloads and tab refreshes within the same day.
- On a new calendar day the key changes, so the board resets to its derived initial state automatically.
- The previous day's key is removed when a new board is saved, keeping `localStorage` clean.

The *Reset Today* button re-derives the initial state from live booking data and overwrites `localStorage`.

---

### 6.4 Bulk Booking Actions

#### Multi-Select Mechanism

A `selectedIds: Set<number>` state tracks which booking IDs are currently selected. Each table row gains a checkbox in a new leftmost column:

- **Header checkbox** — selects or deselects all bookings on the current page. Uses the DOM `indeterminate` property when only some rows are selected.
- **Row checkbox** — uses `e.stopPropagation()` so that ticking a box does not also open the booking detail modal.

#### Bulk Action Bar

When `selectedIds.size > 0`, a floating action bar appears above the table:

| Action | Colour | Scope |
|---|---|---|
| Confirm All | Emerald | Only pending and cancelled bookings |
| Cancel All | Red | Only pending and confirmed bookings |
| Export Selected | Muted | Generates `.xlsx` for selected rows only |
| Clear selection | Muted | Deselects all |

Bulk mutations use `Promise.allSettled` to fire all status updates in parallel. The selection is cleared after all requests complete.

---

## 7. New Shared UI Components (v2)

### 7.1 DatePicker

The `DatePicker` component replaces all native `<input type="date">` elements across the dashboard, ensuring a consistent glassmorphic appearance in both dark and light modes. It renders a custom trigger button that opens a calendar dropdown, supporting `value`, `onChange`, `placeholder`, `min`, and `className` props. Clicking outside the dropdown closes it via a `mousedown` document listener.

---

### 7.2 PhoneInput

A composite field component for collecting international mobile numbers.

#### Country Database

| Country | Code | Min digits | Max digits |
|---|---|---|---|
| Egypt | +20 | 10 | 10 |
| Saudi Arabia | +966 | 9 | 9 |
| UAE | +971 | 9 | 9 |
| Kuwait | +965 | 8 | 8 |
| Qatar | +974 | 8 | 8 |
| Jordan | +962 | 9 | 9 |
| Bahrain | +973 | 8 | 8 |
| Libya | +218 | 9 | 9 |
| Japan | +81 | 10 | 11 |
| USA/Canada | +1 | 10 | 10 |
| UK | +44 | 10 | 10 |
| Germany | +49 | 10 | 11 |
| France | +33 | 9 | 9 |
| Turkey | +90 | 10 | 10 |
| China | +86 | 11 | 11 |
| India | +91 | 10 | 10 |
| Russia | +7 | 10 | 10 |
| Italy | +39 | 9 | 10 |
| Spain | +34 | 9 | 9 |
| South Korea | +82 | 9 | 10 |

#### Behaviour

- A flag + code button opens a searchable dropdown (auto-focuses the search input on open via `setTimeout`).
- As the user types, a validity indicator shows a green tick or red cross based on digit count.
- An error hint clarifies whether the issue is non-digit characters or an incorrect digit count for the selected country.
- The emitted value is a full phone string: `"+20 1234567890"` or `""` if empty.
- The parser `parsePhone()` tries country codes sorted by length descending to correctly split values like `+966...` (3-char code) before `+96...` (ambiguous prefix).

---

### 7.3 RoomPickerSelect

A rich dropdown that replaces the raw numeric room-ID input in the new-booking form. Each option shows:

- A type-colour indicator dot.
- Room number and type label.
- Price per night.

Rooms with overlapping confirmed or pending bookings for the selected date range are grayed out and marked *(booked)* — computed via a `useMemo` that cross-references the global bookings cache:

```typescript
const unavailableRoomIds = useMemo(() => {
  if (!form.start_date || !form.end_date) return new Set()
  const busy = new Set()
  for (const b of bookings ?? []) {
    if (b.status !== 'pending' && b.status !== 'confirmed') continue
    if (b.start_date < form.end_date && b.end_date > form.start_date)
      busy.add(b.room_id)
  }
  return busy
}, [bookings, form.start_date, form.end_date])
```

---

### 7.4 AgendaPreviewModal

Clicking a guest row in the Overview's Today's Agenda section opens a modal overlay showing a mini booking review:

- Guest initials avatar with status-coloured background.
- Status badge (pending / confirmed / etc.).
- Room card with type-coloured icon.
- Check-in and check-out date boxes.
- Total nights and estimated cost.
- Email and phone contact blocks (if present).

The modal uses the same slide-in animation pattern (`requestAnimationFrame` enter, 280 ms `setTimeout` exit) as all other modals in the dashboard.

---

### 7.5 RoomDetailModal

Clicking a room row in the Rooms inventory table opens a detail panel without leaving the page:

- **Three stat boxes**: today's occupancy status (Available / Booked Soon / Occupied), total bookings ever, total revenue earned.
- **Upcoming reservations list**: all future confirmed or pending bookings, showing guest initials, check-in/out dates, nights, and status badge.
- **Recent history**: the 5 most recent completed or cancelled bookings in a compact list.
- **Footer actions**: Close, Edit Room (opens the edit modal), and Remove (opens the delete confirmation modal).

The action cells in the table use `e.stopPropagation()` so that the inline Edit and Delete buttons do not trigger the row-click modal.

---

## 8. Frontend Modules (Existing Pages)

### 8.1 Application Shell

#### AdminLayout

The `AdminLayout` component wraps every admin page and provides:

- **Sidebar** — navigation links to Overview, Bookings, Rooms, **Calendar**, **Guests**, and **Housekeeping** (v2 additions); the E-JUST logo with a CSS `brightness` filter that inverts it for light mode.
- **Top bar** — notification bell and user avatar.
- **Theme toggle** — switches between `dark`, `light`, and `system` modes; persisted in `localStorage`.

#### Notification System

A global `NotificationContext` (React Context API) maintains a list of in-memory notifications. Three event types are emitted:

| Event | Trigger |
|---|---|
| `new_booking` | Manual booking created successfully |
| `status_change` | Booking status updated |
| `new_room` | Room created successfully |

The `NotificationBell` component renders a dropdown with unread counts, colour-coded icons, and relative timestamps. It is fully adapted for both dark and light modes.

#### Theming

Tailwind's `dark:` variants are activated by toggling the `.dark` class on the `<html>` element. Global overrides for light mode are applied in `index.css` using the `html:not(.dark)` selector.

The design language is **glassmorphism**: translucent card backgrounds (`backdrop-blur`), subtle white/black border opacities, and a brand-red (`#B30000`) accent colour. Cards also feature a **cursor-tracked border glow** via the `useGlowCard()` hook, which sets CSS custom properties `--mx` / `--my` and a `::before` radial-gradient pseudo-element on hover.

---

### 8.2 Overview Page

The Overview page is the dashboard landing screen, providing a comprehensive snapshot of the guest house's operational state.

#### Stat Cards

Four animated stat cards using `useCountUp()` (ease-out quartic over 1.1 s):

| Card | Value | Accent Colour |
|---|---|---|
| Total Bookings | `counts.total` | White |
| Confirmed | `counts.confirmed` | Emerald |
| Pending | `counts.pending` | Amber |
| Cancelled | `counts.cancelled` | Red |

#### Today's Agenda (updated)

Guest rows are now `<button>` elements. Clicking opens `AgendaPreviewModal` with the full booking breakdown. A right-pointing chevron appears on hover to indicate interactivity.

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

**Monthly Bookings Bar Chart** — An inline SVG bar chart spanning the last 6 calendar months. Bars grow upwards on mount using a CSS `barGrow` keyframe.

**Status Breakdown** — A horizontal stacked progress bar followed by per-status rows with mini bars animating to the correct proportion.

**Revenue Trend Line Chart** — An SVG polyline/polygon chart showing monthly confirmed revenue. The line is drawn using a `stroke-dashoffset` animation (`lineDrawIn`) over 1.2 seconds.

**Revenue by Room Type** — Horizontal progress bars per room type (Single `#60a5fa`, Double `#a78bfa`, Suite `#fbbf24`, Family `#34d399`).

#### Recent Activity Feed

The 7 most recently created bookings listed with guest initials avatar, room number, nights, check-in date, status badge, and cost estimate.

#### Export Functions

| Button | Output file |
|---|---|
| Export Report (header) | `ejust-overview-report-YYYY-MM-DD.xlsx` |
| Export chart data (bar chart) | `ejust-monthly-bookings-YYYY-MM-DD.xlsx` |
| Export revenue data (line chart) | `ejust-revenue-trend-YYYY-MM-DD.xlsx` |

---

### 8.3 Bookings Page (updated)

#### Date-Range Filter

Two `DatePicker` components (*From date* / *To date*) filter the bookings table by check-in date range. A clear button removes both values. (This was a known limitation in v1 — now resolved.)

#### Reservation Table

Now has 8 columns (checkbox prepended): ☐, ID, Guest Name, Room, Check-in, Check-out, Status, Actions. Features:

- **Search** — real-time filtering by guest name (case-insensitive).
- **Status filter** — dropdown built on `CustomSelect`.
- **Skeleton loading** — three animated skeleton rows (8-column) while the API request is in flight.
- **Inline quick actions** — per-row Confirm / Cancel buttons appear on row hover.
- **Row click** — opens the Booking Detail Modal (suppressed when clicking the checkbox).

#### Booking Detail Modal

A full-featured slide-in modal with smooth entry/exit animations.

**Editable Fields**

| Field | Type | Validation |
|---|---|---|
| Guest Name | Text input | Non-empty |
| Email | Email input | Optional |
| Mobile | `PhoneInput` | Country-code picker + digit validation |
| Check-in | `DatePicker` | Must be before check-out |
| Check-out | `DatePicker` | Must be after check-in |

The **Save Changes** button is disabled until at least one field differs from the server value (`isDirty`), and again if dates are invalid (`datesInvalid`).

#### Manual Booking Form (updated)

| Field | v1 | v2 |
|---|---|---|
| Room | Numeric `<input>` | `RoomPickerSelect` (shows availability) |
| Mobile | Text `<input>` | `PhoneInput` with country code |

---

### 8.4 Rooms Page (updated)

Clicking a room row now opens `RoomDetailModal` (see Section 7.5). Action column cells use `e.stopPropagation()` to prevent the row-click handler from firing when Edit or Delete is pressed.

The count summary strip above the table shows totals broken down by type. Filtering by room number and type remains unchanged.

---

## 9. Shared Infrastructure

### 9.1 Custom Hooks

| Hook | Purpose |
|---|---|
| `useAdminBookings()` | Fetch all bookings (cached) |
| `useAdminRooms()` | Fetch all rooms (cached) |
| `useCreateManualBooking()` | Mutation with optimistic insert |
| `useUpdateBooking()` | Mutation with optimistic field patch |
| `useUpdateBookingStatus()` | Mutation with optimistic status flip |
| `useCreateRoom()` | Mutation with optimistic insert |
| `useUpdateRoom()` | Mutation with optimistic field patch |
| `useDeleteRoom()` | Mutation with optimistic removal |
| `useGlowCard()` | Cursor-tracked border glow |

### 9.2 Type Definitions (`types/admin.ts`)

```typescript
interface Booking {
  id: number
  guest_name: string
  guest_email?: string
  guest_phone?: string
  room_id: number
  start_date: string   // YYYY-MM-DD
  end_date: string     // YYYY-MM-DD
  status: BookingStatus
}

interface Room {
  id: number
  room_number: string
  type: RoomType
  price_per_night: number
}

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
type RoomType      = 'single' | 'double' | 'suite' | 'family'
```

---

## 10. Excel Export System

All data exports use ExcelJS to generate `.xlsx` files entirely in the browser, without any server-side involvement. The `lib/exportExcel.ts` module exposes four async functions:

| Function | Output |
|---|---|
| `exportBookingsExcel(bookings, roomMap, filename)` | Full reservation sheet (12 cols) |
| `exportOverviewExcel()` | Multi-section overview report |
| `exportMonthlyChartExcel()` | Monthly booking counts + revenue |
| `exportRevenueTrendExcel()` | Revenue trend + by-type breakdown |

> **Export Selected Bookings** — `exportBookingsExcel` accepts any subset of bookings. The Bookings page passes only the `selectedIds`-filtered subset when the *Export Selected* bulk action is triggered, enabling targeted workbook generation without a dedicated API endpoint.

### 10.1 Colour Palette (ARGB)

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

### 10.2 Workbook Title Block Structure

| Row | Content | Style |
|---|---|---|
| 1 | "E-JUST GUEST HOUSE" | Brand red, 16 pt bold, 44 px height |
| 2 | Report subtitle | Dark BG, 11 pt bold |
| 3 | Generation timestamp | Muted italic, 9 pt |
| 4 | Spacer | Empty |
| 5 | Column headers | Brand red (bookings) or section BG |

Rows 1–5 are frozen in all workbooks. Auto-filter applied on the header row.

---

## 11. Known Limitations & Future Work

### 11.1 Resolved in v2

| v1 Limitation | Resolution |
|---|---|
| No date-range filter on bookings | `DatePicker` from/to filter bar added to Bookings page |
| No room editing or deletion | `useUpdateRoom` and `useDeleteRoom` hooks; `RoomDetailModal` provides Edit and Remove shortcuts |
| No pagination UI | Bookings page now has a full pagination strip with ellipsis |

### 11.2 Remaining Limitations

| # | Limitation | Notes |
|---|---|---|
| 1 | **No authentication on admin routes** | `/api/admin` endpoints accept requests without token verification — must be secured before production |
| 2 | **Guest contact in `special_requests`** | Email and phone stored as pipe-encoded string rather than dedicated DB columns |
| 3 | **Housekeeping board is local-only** | Board state lives in `localStorage`; multiple staff members cannot collaborate without shared backend state |
| 4 | **Calendar name truncation** | Guest names clipped to the first given name within each booking block; long names may be cut when stay is short |

### 11.3 Recommended Future Enhancements

1. Add JWT/session authentication to all `/api/admin` routes, enforcing `role = 'admin'`.
2. Migrate guest contact fields to dedicated DB columns via an Alembic migration.
3. Persist housekeeping board state to the database so all staff see the same view.
4. Implement server-sent events or WebSocket push for real-time booking notifications.
5. Add a printable/PDF booking confirmation generator.
6. Introduce server-side pagination and date-range filtering.
7. Internationalise the interface (Arabic/English switcher).
8. Add a weekly/day view option to the Calendar.

---

## 12. Conclusion

Version 2 of the E-JUST Guest House Admin Dashboard significantly expands the operational toolset available to staff. The three new pages — Occupancy Calendar, Guest Directory, and Housekeeping Board — address core daily workflows: visualising room availability at a glance, understanding guest history and loyalty, and coordinating room turnover between checkouts and new arrivals.

Bulk booking actions reduce the per-booking effort for mass confirmations or cancellations, while the targeted export feature gives staff the flexibility to extract exactly the records they need. The new shared UI components — `DatePicker`, `PhoneInput`, and `RoomPickerSelect` — bring interface consistency and input quality across all booking entry points.

The underlying architecture remains unchanged: all new pages are powered by the same `useAdminBookings()` and `useAdminRooms()` TanStack Query hooks, so data is shared and cache-coherent across every view with no additional API endpoints required for the new features.

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
│       │   ├── booking.py
│       │   └── room.py
│       ├── repositories/
│       │   └── admin_repo.py
│       ├── schemas/
│       │   └── admin.py             # Pydantic DTOs
│       └── main.py
└── web-app/
    └── src/
        ├── components/
        │   ├── DatePicker.tsx        # NEW — custom date picker
        │   ├── PhoneInput.tsx        # NEW — country-code phone field
        │   ├── CustomSelect.tsx
        │   ├── ExportButton.tsx
        │   ├── NotificationBell.tsx
        │   └── ScrollArea.tsx
        ├── contexts/
        │   ├── NotificationContext.tsx
        │   └── ThemeContext.tsx
        ├── hooks/
        │   ├── useAdminApi.ts        # TanStack Query hooks
        │   └── useGlowCard.ts
        ├── layouts/
        │   └── AdminLayout.tsx       # Updated — 3 new nav items
        ├── lib/
        │   ├── apiClient.ts
        │   ├── exportExcel.ts
        │   └── exportCsv.ts
        ├── pages/admin/
        │   ├── Overview.tsx          # Updated — AgendaPreviewModal
        │   ├── Bookings.tsx          # Updated — bulk actions, DatePicker, PhoneInput, RoomPicker
        │   ├── Rooms.tsx             # Updated — RoomDetailModal
        │   ├── Calendar.tsx          # NEW — occupancy calendar
        │   ├── Guests.tsx            # NEW — guest directory
        │   └── Housekeeping.tsx      # NEW — housekeeping kanban
        └── types/
            └── admin.ts
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
