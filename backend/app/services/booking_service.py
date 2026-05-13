"""
booking_service.py — Business logic layer for bookings.
"""

from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.schemas.booking_schemas import BookingRequest
from app.repositories import booking_repository, room_repository


async def create_booking(session: AsyncSession, user_id: int, payload: BookingRequest) -> dict:
    """Create a new booking with row-level locking to prevent double bookings."""
    # 1. Lock the room row to prevent concurrent bookings for the same room
    room = await room_repository.find_by_id_for_update(session, payload.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    # 2. Check room availability
    overlaps = await booking_repository.find_overlapping(
        session, payload.room_id, payload.check_in_date, payload.check_out_date
    )
    if overlaps:
        raise HTTPException(status_code=409, detail="Room is not available for the requested dates")
        
    # 3. Calculate total price
    nights = (payload.check_out_date - payload.check_in_date).days
    if nights <= 0:
        raise HTTPException(status_code=400, detail="Check-out date must be after check-in date")
        
    total_price = float(nights * room.price_per_night)
    
    # 4. Create the booking
    booking_data = {
        "user_id": user_id,
        "room_id": payload.room_id,
        "check_in_date": payload.check_in_date,
        "check_out_date": payload.check_out_date,
        "total_price": total_price,
        "status": "confirmed" # Or 'pending' depending on payment flow
    }
    
    booking = await booking_repository.create(session, booking_data)
    await session.commit()
    
    return booking


async def get_user_bookings(session: AsyncSession, user_id: int) -> list:
    """Retrieve all bookings for a specific user."""
    return await booking_repository.find_by_user_id(session, user_id)


async def get_booking_by_id(session: AsyncSession, booking_id: int, user_id: int) -> dict:
    """Retrieve a single booking, with ownership check."""
    booking = await booking_repository.find_by_id(session, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this booking")
        
    return booking


async def cancel_booking(session: AsyncSession, booking_id: int, user_id: int) -> None:
    """Cancel a booking if within cancellation policy window."""
    booking = await booking_repository.find_by_id(session, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
        
    # Cancellation window check (e.g., >24h before check-in)
    today = date.today()
    days_until_check_in = (booking.check_in_date - today).days
    
    if days_until_check_in < 1:
        raise HTTPException(status_code=400, detail="Cannot cancel within 24 hours of check-in")
        
    await booking_repository.cancel(session, booking_id)
    await session.commit()


async def get_all_bookings(session: AsyncSession, page: int = 1, page_size: int = 20) -> list:
    """Admin: Retrieve all bookings across all users."""
    return await booking_repository.find_all(session, page, page_size)


async def update_booking_status(session: AsyncSession, booking_id: int, new_status: str) -> dict:
    """Admin: Approve or reject a pending booking."""
    booking = await booking_repository.find_by_id(session, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    updated_booking = await booking_repository.update_status(session, booking_id, new_status)
    await session.commit()
    return updated_booking
