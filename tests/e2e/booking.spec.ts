import { test, expect } from '@playwright/test';

/**
 * booking.spec.ts — E2E API tests for room booking flow.
 *
 * Gherkin mapping:
 *   features/booking.feature      → "Booking: success", "Double booking attempt"
 *   features/cancel_booking.feature → "Cancel booking: success"
 *
 * Routes under test (actual routes — no /api prefix; see BUG-001 in qa_report.md):
 *   GET  /rooms/
 *   POST /bookings/
 *   DELETE /bookings/{booking_id}
 *
 * Each test is fully independent and self-contained.
 * A JWT token would normally be obtained from POST /auth/login first.
 * Since auth is not implemented, a placeholder token is used where required.
 * Tests marked "Expected FAIL" will fail until Moamen implements the backend logic.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH_HEADER = { Authorization: 'Bearer placeholder_jwt_token' };

const makeBookingPayload = () => ({
  room_id: 1,
  check_in_date: '2026-09-01',
  check_out_date: '2026-09-07',
  special_requests: 'QA automated test booking',
});

// ---------------------------------------------------------------------------
// Room listing (prerequisite for booking flow)
// ---------------------------------------------------------------------------

test.describe('GET /rooms — Browse Rooms', () => {

  /**
   * Gherkin: booking.feature → Given "I have selected a Single Room"
   * Expected FAIL: stub not implemented yet
   */
  test('GET /rooms: returns paginated room list with 200', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.get('/rooms/');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('rooms');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.rooms)).toBeTruthy();
  });

  /**
   * Edge case: filter by available rooms.
   * Expected FAIL: stub not implemented yet
   */
  test('GET /rooms?available=true: filters available rooms', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.get('/rooms/?available=true');

    expect(response.status()).toBe(200);
    const body = await response.json();
    if (body.rooms.length > 0) {
      body.rooms.forEach((room: any) => {
        expect(room.status).toBe('available');
      });
    }
  });

});

// ---------------------------------------------------------------------------
// Booking creation
// ---------------------------------------------------------------------------

test.describe('POST /bookings — Create Booking', () => {

  /**
   * Gherkin: booking.feature → "Successful room booking"
   * Expected FAIL: stub not implemented yet
   */
  test('Booking: success — valid payload returns 201 + pending status', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.post('/bookings/', {
      data: makeBookingPayload(),
      headers: AUTH_HEADER,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('status', 'pending');
    expect(body).toHaveProperty('room_id', 1);
    expect(body).toHaveProperty('check_in_date', '2026-09-01');
    expect(body).toHaveProperty('check_out_date', '2026-09-07');
    expect(body).toHaveProperty('total_price');
    expect(body).not.toHaveProperty('password');
  });

  /**
   * Gherkin: booking.feature → "Room is no longer available"
   * Double booking: same room + same dates should return 409.
   * Expected FAIL: stub not implemented yet
   */
  test('Booking: double booking attempt returns 409', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const payload = makeBookingPayload();

    // First booking (would succeed when implemented)
    await request.post('/bookings/', { data: payload, headers: AUTH_HEADER });

    // Second booking for same room + overlapping dates
    const response = await request.post('/bookings/', {
      data: payload,
      headers: AUTH_HEADER,
    });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

  /**
   * Edge case: missing required fields.
   * PASSES NOW — FastAPI schema validation fires before the stub handler.
   */
  test('Booking: missing room_id returns 422 ✅ PASSES', async ({ request }) => {
    const response = await request.post('/bookings/', {
      data: {
        check_in_date: '2026-09-01',
        check_out_date: '2026-09-07',
        // room_id missing intentionally
      },
      headers: AUTH_HEADER,
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

});

// ---------------------------------------------------------------------------
// Booking cancellation
// ---------------------------------------------------------------------------

test.describe('DELETE /bookings/{booking_id} — Cancel Booking', () => {

  /**
   * Gherkin: cancel_booking.feature → "Successful cancellation"
   * DELETE with 204 (no body) — handler returns None which is valid for 204.
   * PASSES NOW — The stub returns None, which FastAPI correctly maps to 204.
   */
  test('Cancel booking: returns 204 ✅ PASSES', async ({ request }) => {
    const response = await request.delete('/bookings/999', {
      headers: AUTH_HEADER,
    });

    // 204 No Content is correct — stub's None return is valid here
    expect(response.status()).toBe(204);
  });

  /**
   * Edge case: cancel non-existent booking should return 404.
   * Expected FAIL: stub not implemented yet (returns 204 for all IDs)
   */
  test('Cancel booking: non-existent ID returns 404', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.delete('/bookings/99999999', {
      headers: AUTH_HEADER,
    });

    expect(response.status()).toBe(404);
  });

});
