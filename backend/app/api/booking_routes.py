"""
booking_routes.py — Booking creation and management endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.booking_schemas import BookingRequest, BookingResponse, BookingListResponse
from app.services import booking_service
from app.api.deps import get_db, get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=BookingResponse, status_code=201)
async def create_booking(
    payload: BookingRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    POST /bookings
    Create a new room booking for the authenticated user.
    """
    return await booking_service.create_booking(session, current_user.id, payload)


@router.get("/", response_model=BookingListResponse)
async def list_my_bookings(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /bookings
    Return all bookings for the currently authenticated user.
    """
    bookings = await booking_service.get_user_bookings(session, current_user.id)
    return {"bookings": bookings, "total": len(bookings)}


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /bookings/{booking_id}
    Return details for a specific booking.
    """
    return await booking_service.get_booking_by_id(session, booking_id, current_user.id)


@router.delete("/{booking_id}", status_code=204)
async def cancel_booking(
    booking_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    DELETE /bookings/{booking_id}
    Cancel a booking (only if within allowed cancellation window).
    """
    await booking_service.cancel_booking(session, booking_id, current_user.id)
