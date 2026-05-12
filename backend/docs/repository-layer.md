# Repository Layer — Technical Documentation

## Overview

The repository layer is the **only place in the codebase that talks to the database**. Every function takes an `AsyncSession` as its first argument and returns typed model instances. Business logic (services) calls these functions; routes never touch the database directly.

This pattern is called the **Repository Pattern**. It means:
- Services don't need to know SQL — they call `find_by_id`, `create`, etc.
- If we ever swap PostgreSQL for another DB, only this layer changes.
- Every DB call is in one place, making it easy to audit and test.

---

## Architecture

```
HTTP Request
    │
    ▼
API Route (app/api/)           ← validates input, returns HTTP response
    │
    ▼
Service Layer (app/services/)  ← business logic, owns the transaction
    │
    ▼
Repository Layer (app/repositories/) ← SQL queries, no business logic
    │
    ▼
SQLAlchemy AsyncSession        ← connection pool, async/await
    │
    ▼
PostgreSQL
```

The service layer wraps repository calls in a single `async with session.begin():` block. If anything fails inside that block, the entire transaction rolls back automatically. Repositories call `await session.flush()` (writes to the DB buffer within the current transaction) but **never** `session.commit()` — committing is the service's job.

---

## Database Session

**File:** `app/db/session.py`

```python
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,         # baseline connections kept open
    max_overflow=10,      # extra connections allowed during bursts
    pool_timeout=30,      # seconds before giving up on a connection from the pool
    pool_recycle=1800,    # recycle connections after 30 min to prevent stale DB connections
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
```

`get_db` is a FastAPI dependency. Declare it as a route parameter and FastAPI automatically opens a session before the route runs and closes it after:

```python
@router.get("/rooms/{room_id}")
async def get_room(room_id: int, session: AsyncSession = Depends(get_db)):
    return await room_service.get_room_by_id(session, room_id)
```

`expire_on_commit=False` means ORM objects remain usable after a transaction ends — important for returning response data without triggering extra DB round-trips.

---

## Models

### User (`app/models/user.py`)

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    role: Mapped[str] = mapped_column(Enum("student", "staff", "guest", "admin"))
    university_id: Mapped[Optional[str]] = mapped_column(String(50))
    is_verified: Mapped[bool] = mapped_column(default=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    bookings: Mapped[List["Booking"]] = relationship(back_populates="user")
```

**Key design decisions:**
- `email` has a unique constraint + index — lookups by email (login) are O(log n).
- `is_active` enables **soft deletes**: users are never physically removed. Historical booking records stay intact.
- `university_id` is nullable — external (non-university) guests won't have one.
- A partial index `ix_active_users` covers only rows where `is_active = True`, keeping admin user-list queries fast.

---

### Room (`app/models/room.py`)

```python
class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_number: Mapped[str] = mapped_column(String(100), unique=True)
    room_type: Mapped[str] = mapped_column(Enum("single", "double", "suite", "family"))
    capacity: Mapped[int]
    price_per_night: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(Enum("available", "occupied", "maintenance"), default="available")
    amenities: Mapped[List[str]] = mapped_column(ARRAY(String), default=[])
    description: Mapped[Optional[str]] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    bookings: Mapped[List["Booking"]] = relationship(back_populates="room")
```

**Key design decisions:**
- `amenities` uses PostgreSQL's native **ARRAY** type — the list is stored as a single column, no join table needed.
- A partial index `ix_available_rooms` covers only `status = 'available'` rows. Guest-facing room listings query only available rooms, so this index is hit on nearly every read.
- `is_active` enables soft deletes — archived rooms remain attached to historical booking records.
- `Numeric(10, 2)` stores price as an exact decimal (no floating-point rounding errors).

---

### Booking (`app/models/booking.py`)

```python
class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    check_in_date: Mapped[date]
    check_out_date: Mapped[date]
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(
        Enum("pending", "confirmed", "cancelled", "completed"), default="pending"
    )
    special_requests: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(onupdate=func.now())

    __table_args__ = (
        CheckConstraint("check_out_date > check_in_date", name="chk_valid_dates"),
        ExcludeConstraint(
            (Column("room_id"), "="),
            (func.daterange(Column("check_in_date"), Column("check_out_date")), "&&"),
            where=Column("status").in_(["pending", "confirmed"]),
            using="gist",
        ),
    )
```

**Key design decisions:**
- The **GiST exclusion constraint** is the double-booking prevention mechanism. It tells PostgreSQL: "no two rows can exist where `room_id` is equal AND date ranges overlap AND status is pending or confirmed." This is enforced at the DB level — even under concurrent requests, the database itself prevents double bookings.
- `ondelete="CASCADE"` means deleting a user or room automatically removes all their bookings. No orphan rows.
- `CheckConstraint` prevents `check_out_date <= check_in_date` from ever being inserted. The DB rejects invalid dates before any code sees them.
- `updated_at` uses `onupdate=func.now()` — SQLAlchemy automatically sets this whenever the row is updated.

---

## Repository Functions

### `user_repository` (`app/repositories/user_repository.py`)

| Function | Signature | Purpose |
|---|---|---|
| `create_user` | `(session, user_data: dict) → User` | Insert a new user |
| `get_by_email` | `(session, email: str) → User \| None` | Look up user for login |
| `get_by_id` | `(session, user_id: int) → User \| None` | Fetch by primary key (auth token validation) |
| `update_user` | `(session, user_id: int, data: dict) → User \| None` | Edit profile fields |
| `delete_user` | `(session, user_id: int) → None` | Soft-delete (sets `is_active=False`) |
| `get_all_users` | `(session, page: int, page_size: int) → List[User]` | Admin: paginated active user list |

**Pattern — insert:**
```python
async def create_user(session: AsyncSession, user_data: dict) -> User:
    user = User(**user_data)    # build ORM object from the dict
    session.add(user)           # stage for INSERT — no SQL sent yet
    await session.flush()       # send INSERT to DB buffer within current transaction
    await session.refresh(user) # reload row to get DB-generated id and timestamps
    return user
```
`flush()` sends the SQL but does not commit. The transaction is still open and can be rolled back by the service if a later step fails.

**Pattern — query:**
```python
async def get_by_email(session: AsyncSession, email: str) -> Optional[User]:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()
    # scalar_one_or_none: returns the single result, None if not found, raises if >1 match
```

**Pattern — update with RETURNING:**
```python
async def update_user(session, user_id, update_data) -> Optional[User]:
    stmt = update(User).where(User.id == user_id).values(**update_data).returning(User)
    result = await session.execute(stmt)
    await session.flush()
    return result.scalar_one_or_none()
```
`.returning(User)` tells PostgreSQL to return the updated row inline — no second SELECT needed. If `user_id` doesn't exist, `scalar_one_or_none()` returns `None`.

---

### `room_repository` (`app/repositories/room_repository.py`)

| Function | Signature | Purpose |
|---|---|---|
| `find_all` | `(session, status, room_type, page, page_size) → dict` | Paginated, filtered room list |
| `find_by_id` | `(session, room_id: int) → Room \| None` | Single room lookup |
| `create` | `(session, room_data: dict) → Room` | Admin: add a new room |
| `update_room` | `(session, room_id: int, data: dict) → Room \| None` | Admin: edit room details |
| `delete_room` | `(session, room_id: int) → None` | Admin: soft-delete a room |
| `update_room_status` | `(session, room_id: int, new_status: str) → Room \| None` | Mark room occupied/available/maintenance |

**Pagination pattern (used in `find_all`):**
```python
# Step 1 — count total matching rows (the frontend needs this for "Page N of M")
count_query = select(func.count()).select_from(query.subquery())
total = (await session.execute(count_query)).scalar_one()

# Step 2 — fetch only the current page
query = query.offset((page - 1) * page_size).limit(page_size)
rooms = (await session.execute(query)).scalars().all()

return {"rooms": rooms, "total": total}
```
Two queries are issued: one for the count, one for the data. This is intentional — SQLAlchemy can't do `COUNT(*)` and `SELECT *` in the same round-trip without a subquery.

**Why `update_room_status` is separate from `update_room`:**
`update_room` is for admin edits (change capacity, price, description). `update_room_status` is called by the booking flow to mark a room `occupied` when confirmed or `available` when a booking is cancelled. Keeping them separate prevents accidentally triggering a full-room-update from the booking flow.

---

### `booking_repository` (`app/repositories/booking_repository.py`)

| Function | Signature | Purpose |
|---|---|---|
| `create` | `(session, booking_data: dict) → Booking` | Insert a new booking |
| `find_by_id` | `(session, booking_id: int) → Booking \| None` | Single booking lookup |
| `find_by_user_id` | `(session, user_id: int) → List[Booking]` | User's booking history (most recent first) |
| `find_all` | `(session, page, page_size) → List[Booking]` | Admin: all bookings paginated |
| `find_overlapping` | `(session, room_id, check_in, check_out) → List[Booking]` | Availability conflict detection |
| `update_status` | `(session, booking_id: int, new_status: str) → Booking \| None` | Confirm / cancel / complete a booking |

**Overlap detection — how it works:**
```python
async def find_overlapping(session, room_id, check_in, check_out):
    result = await session.execute(
        select(Booking).where(
            and_(
                Booking.room_id == room_id,
                Booking.status.in_(["pending", "confirmed"]),  # ignore cancelled/completed
                Booking.check_in_date < check_out,   # existing check-in is before new check-out
                Booking.check_out_date > check_in,   # existing check-out is after new check-in
            )
        )
    )
    return result.scalars().all()
```

The overlap logic: two date ranges `[A, B)` and `[C, D)` overlap when `A < D AND B > C`. In plain English:
- The existing booking starts **before** the requested stay ends.
- The existing booking ends **after** the requested stay starts.

If this returns any rows, the room is unavailable for those dates. The service layer checks this before creating a booking.

**Why only `pending` and `confirmed` are checked:** A `cancelled` booking has freed the room — future guests should be able to book it. A `completed` booking is in the past and irrelevant. Only active reservations block availability.

---

## Transaction Flow (End-to-End Example)

Here is how a `POST /bookings` request travels through all layers:

```
1. Route: parse request body into BookingRequest schema
2. Route: call booking_service.create_booking(session, user_id, payload)
3. Service: call room_repository.find_by_id(session, room_id)
           → if None, raise 404
4. Service: call booking_repository.find_overlapping(session, room_id, check_in, check_out)
           → if non-empty, raise 409 Conflict
5. Service: calculate total_price = room.price_per_night * (check_out - check_in).days
6. Service: call booking_repository.create(session, {...})
           → flush() sends INSERT within current transaction
7. Service: call room_repository.update_room_status(session, room_id, "occupied")
           → flush() sends UPDATE within same transaction
8. Service: commit (the FastAPI `get_db` dependency closes the transaction)
9. Route: return BookingResponse
```

If step 7 fails (e.g., room not found), `get_db` catches the exception and calls `session.rollback()` — the booking INSERT from step 6 is also undone. The database stays consistent.

---

## Testing

Tests live in `backend/tests/`. Each file covers one repository module.

### Test approach — mocked session

```python
# tests/conftest.py
@pytest.fixture
def session():
    mock = AsyncMock(spec=AsyncSession)
    mock.flush = AsyncMock()
    mock.refresh = AsyncMock()
    mock.add = MagicMock()
    return mock
```

We mock `AsyncSession` rather than spinning up a real DB because:
1. **Speed**: Tests run in milliseconds with no external dependencies.
2. **Focus**: Repository functions are data-mapping code. The logic under test is query construction and result handling — not PostgreSQL internals.
3. **Isolation**: Integration tests (hitting a real DB) belong in a separate CI stage. Unit tests should run anywhere, instantly.

### Mocking patterns

**Mocking a `SELECT` query:**
```python
expected_user = User(id=1, email="alice@example.com")
mock_result = MagicMock()
mock_result.scalar_one_or_none.return_value = expected_user
session.execute.return_value = mock_result

result = await user_repository.get_by_id(session, 1)
assert result is expected_user
```

**Mocking two sequential `execute` calls (count + data):**
```python
count_result = MagicMock()
count_result.scalar_one.return_value = 5

data_result = MagicMock()
data_result.scalars.return_value.all.return_value = [Room(...), Room(...)]

session.execute.side_effect = [count_result, data_result]
```

**Asserting SQL filter values (for `IN` clauses):**
```python
call_args = session.execute.call_args[0][0]
compiled = call_args.compile(compile_kwargs={"literal_binds": True})
assert "pending" in str(compiled) and "confirmed" in str(compiled)
```
`literal_binds=True` inlines all bind parameters so you can assert on the actual SQL string.

### Running tests

```bash
cd backend

# Run all tests
pytest -v

# Run one file
pytest tests/test_user_repository.py -v

# Run one test by name
pytest -k "test_find_overlapping" -v

# Run with coverage (requires pytest-cov)
pytest --cov=app/repositories --cov-report=html
```

---

## File Reference

| File | Lines | Role |
|---|---|---|
| `app/repositories/user_repository.py` | ~70 | User CRUD + admin list |
| `app/repositories/room_repository.py` | ~70 | Room CRUD + status update |
| `app/repositories/booking_repository.py` | ~65 | Booking CRUD + overlap detection |
| `app/models/user.py` | ~40 | User ORM model |
| `app/models/room.py` | ~45 | Room ORM model |
| `app/models/booking.py` | ~55 | Booking ORM model + DB constraints |
| `app/db/session.py` | ~35 | Async engine + session factory + `get_db` |
| `tests/conftest.py` | ~12 | Shared `session` fixture |
| `tests/test_user_repository.py` | ~115 | 10 tests for user repo |
| `tests/test_room_repository.py` | ~125 | 10 tests for room repo |
| `tests/test_booking_repository.py` | ~130 | 10 tests for booking repo |
