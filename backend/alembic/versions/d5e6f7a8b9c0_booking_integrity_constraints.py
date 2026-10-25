"""booking integrity: no-overlap exclusion constraint, completed status

Makes double-booking impossible at the database level, independent of
application code. Two active (pending or confirmed) bookings for the same room
can never have overlapping [check_in, check_out) ranges; PostgreSQL rejects the
second insert or update with an exclusion violation, which the API maps to 409.

Half-open ranges '[)' mean back-to-back stays (one guest's check-out day is the
next guest's check-in day) are allowed, matching ranges_overlap().

Also adds the 'completed' booking status (guest has checked out), used by the
admin dashboard.

If this migration fails on an existing database, it already contains
overlapping active bookings. Find them with:

    SELECT a.id, b.id, a.room_id FROM bookings a JOIN bookings b
      ON a.room_id = b.room_id AND a.id < b.id
     AND a.status IN ('pending','confirmed') AND b.status IN ('pending','confirmed')
     AND a.check_in < b.check_out AND b.check_in < a.check_out;

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
"""
from alembic import op

revision = "d5e6f7a8b9c0"
down_revision = "c4d5e6f7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enum values must be committed before use, so add it outside the migration transaction.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed'")

    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    op.execute(
        "ALTER TABLE bookings ADD CONSTRAINT bookings_dates_valid "
        "CHECK (check_out > check_in)"
    )
    op.execute(
        "ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap "
        "EXCLUDE USING gist ("
        "  room_id WITH =,"
        "  daterange(check_in, check_out, '[)') WITH &&"
        ") WHERE (status IN ('pending', 'confirmed'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap")
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_dates_valid")
    # PostgreSQL cannot drop an enum value; 'completed' stays in booking_status.
