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
    op.add_column("bookings", sa.Column("special_requests", sa.Text(),        nullable=True))
    op.add_column("bookings", sa.Column("phone_number",     sa.String(30),    nullable=True))
    op.add_column("bookings", sa.Column("university_id",    sa.String(50),    nullable=True))
    op.add_column("bookings", sa.Column("national_id",      sa.String(50),    nullable=True))


def downgrade() -> None:
    for col in ("national_id", "university_id", "phone_number", "special_requests"):
        op.drop_column("bookings", col)
