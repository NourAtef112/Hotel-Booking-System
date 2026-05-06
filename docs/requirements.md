# Requirements Specification

## Actor Classification

### Primary Actors
- **Students**: University students needing short-term housing.
- **Staff**: Faculty or university employees booking for themselves or guests.
- **Guests**: External visitors or families visiting students.

### Supporting Actors
- **Administrators**: University staff managing housing availability and approvals.
- **Payment Gateway**: External service for processing credit card payments (Future).
- **Email Service**: For sending confirmations and notifications.

### Offstage Actors
- **University Finance Department**: Receives reports on housing revenue.

## Functional Requirements
1. Users must register and log in to book a room.
2. Students and staff must provide a valid University ID for priority/discounted rates.
3. Users can view a list of available rooms with details (type, price, amenities).
4. Users can create, view, and cancel bookings.
5. Administrators can view all bookings and manage room inventory.

## Edge Cases
1. **Double Booking**: Attempting to book a room for dates that overlap with an existing confirmed booking.
2. **University ID Verification**: Handling invalid or expired University IDs during registration for staff/students.
3. **Cancellation Window**: Users trying to cancel a booking less than 24 hours before check-in.
4. **Capacity Limits**: Booking a room for more people than its rated capacity.
5. **Session Expiry**: User session expiring while in the middle of a multi-step booking process.
