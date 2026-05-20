"""add contact fields to bookings

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-05-18

"""
from alembic import op
import sqlalchemy as sa

revision = "c4d5e6f7a8b9"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests TEXT")
    op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30)")
    op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS university_id VARCHAR(50)")
    op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS national_id VARCHAR(50)")


def downgrade() -> None:
    for col in ("national_id", "university_id", "phone_number", "special_requests"):
        op.drop_column("bookings", col)
