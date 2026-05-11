import { test, expect } from '@playwright/test';

/**
 * history.spec.ts — E2E API tests for booking history flow.
 *
 * Gherkin mapping:
 *   features/cancel_booking.feature → "View bookings list"
 *   features/booking.feature        → "View booked room in history"
 *
 * Routes under test (actual routes — no /api prefix; see BUG-001 in qa_report.md):
 *   GET /bookings/              — list all bookings for authenticated user
 *   GET /bookings/{booking_id}  — get a specific booking by ID
 *
 * Each test is fully independent and self-contained.
 * JWT token would normally be retrieved from POST /auth/login first and reused.
 * Since auth is stubbed, a placeholder token is used.
 * Tests marked "Expected FAIL" will fail until Moamen implements the backend logic.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH_HEADER = { Authorization: 'Bearer placeholder_jwt_token' };

// ---------------------------------------------------------------------------
// View booking history
// ---------------------------------------------------------------------------

test.describe('GET /bookings — Booking History', () => {

  /**
   * Gherkin: booking.feature → "I should see a booking confirmation screen"
   *          (implies user can later view their booked room in history)
   * Expected FAIL: stub not implemented yet
   */
  test('History: authenticated user receives booking list with 200', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.get('/bookings/', {
      headers: AUTH_HEADER,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('bookings');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.bookings)).toBeTruthy();
  });

  /**
   * Empty state: a new user with no bookings should return empty list, not an error.
   * Gherkin: (implied by booking.feature — new user sees no history before booking)
   * Expected FAIL: stub not implemented yet
   */
  test('History: new user with no bookings returns empty list', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.get('/bookings/', {
      headers: { Authorization: 'Bearer new_user_placeholder_token' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    // Must return structured empty list — NOT 404 or 500
    expect(body).toHaveProperty('bookings');
    expect(body).toHaveProperty('total', 0);
    expect(body.bookings).toHaveLength(0);
  });

  /**
   * Unauthenticated request should be rejected.
   * Expected FAIL: stub not implemented yet (no auth middleware)
   * Related: BUG-003 — no authentication middleware on booking routes
   */
  test('History: unauthenticated request returns 401', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.get('/bookings/');
    // No Authorization header

    expect(response.status()).toBe(401);
  });

});

// ---------------------------------------------------------------------------
// View specific booking
// ---------------------------------------------------------------------------

test.describe('GET /bookings/{booking_id} — Booking Detail', () => {

  /**
   * Retrieve a specific booking by ID.
   * Expected FAIL: stub not implemented yet
   */
  test('History: get specific booking by ID returns 200 + booking object', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.get('/bookings/1', {
      headers: AUTH_HEADER,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('id', 1);
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('room_id');
    expect(body).toHaveProperty('check_in_date');
    expect(body).toHaveProperty('check_out_date');
  });

  /**
   * Not found: requesting a non-existent booking ID.
   * Expected FAIL: stub not implemented yet
   */
  test('History: non-existent booking ID returns 404', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.get('/bookings/99999999', {
      headers: AUTH_HEADER,
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

});
