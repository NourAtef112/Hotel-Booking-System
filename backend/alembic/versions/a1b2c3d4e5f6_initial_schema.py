"""initial schema

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-05-16 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=512), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("guest", "admin", name="user_role"),
            nullable=False,
            server_default="guest",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_number", sa.String(length=100), nullable=False),
        sa.Column(
            "room_type",
            sa.Enum("single", "double", "suite", "vip_suite", name="room_type"),
            nullable=False,
        ),
        sa.Column("price_per_night", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "status",
            sa.Enum("available", "booked", "maintenance", name="room_status"),
            nullable=False,
            server_default="available",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_rooms_id"), "rooms", ["id"], unique=False)
    op.create_index(op.f("ix_rooms_room_number"), "rooms", ["room_number"], unique=True)

    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.Column("check_in", sa.Date(), nullable=False),
        sa.Column("check_out", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "confirmed", "rejected", "cancelled", name="booking_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("total_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bookings_id"), "bookings", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_bookings_id"), table_name="bookings")
    op.drop_table("bookings")
    op.drop_index(op.f("ix_rooms_room_number"), table_name="rooms")
    op.drop_index(op.f("ix_rooms_id"), table_name="rooms")
    op.drop_table("rooms")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS user_role")
    op.execute("DROP TYPE IF EXISTS room_type")
    op.execute("DROP TYPE IF EXISTS room_status")
    op.execute("DROP TYPE IF EXISTS booking_status")
