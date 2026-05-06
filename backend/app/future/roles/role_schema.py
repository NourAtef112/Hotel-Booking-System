"""
role_schema.py — Future role-based access control (RBAC) contracts.
Interface definition only. No implementation.
"""

from pydantic import BaseModel
from enum import Enum
from typing import List


class Permission(str, Enum):
    # Booking permissions
    BOOK_ROOM = "book_room"
    VIEW_OWN_BOOKINGS = "view_own_bookings"
    CANCEL_OWN_BOOKING = "cancel_own_booking"

    # Admin permissions
    VIEW_ALL_BOOKINGS = "view_all_bookings"
    APPROVE_BOOKING = "approve_booking"
    MANAGE_ROOMS = "manage_rooms"
    MANAGE_USERS = "manage_users"

    # Finance permissions
    VIEW_PAYMENTS = "view_payments"
    ISSUE_REFUND = "issue_refund"


class RoleDefinition(BaseModel):
    """
    Defines a role and its associated permissions.
    TODO: Store in DB and enforce via middleware
    """
    name: str
    description: str
    permissions: List[Permission]


# Default role definitions (TODO: persist to DB)
ROLE_DEFINITIONS = {
    "student": RoleDefinition(
        name="student",
        description="University student — can browse and book rooms",
        permissions=[Permission.BOOK_ROOM, Permission.VIEW_OWN_BOOKINGS, Permission.CANCEL_OWN_BOOKING],
    ),
    "staff": RoleDefinition(
        name="staff",
        description="University staff — same as student with priority",
        permissions=[Permission.BOOK_ROOM, Permission.VIEW_OWN_BOOKINGS, Permission.CANCEL_OWN_BOOKING],
    ),
    "admin": RoleDefinition(
        name="admin",
        description="System administrator — full access",
        permissions=list(Permission),
    ),
}
