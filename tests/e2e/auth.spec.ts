import { test, expect } from '@playwright/test';

/**
 * auth.spec.ts — E2E API tests for authentication flow.
 *
 * Gherkin mapping:
 *   features/login.feature       → "Login: success", "Login: invalid credentials"
 *   features/registration.feature → "Register: success", "Register: duplicate email"
 *
 * Routes under test (actual routes — no /api prefix; see BUG-001 in qa_report.md):
 *   POST /auth/register
 *   POST /auth/login
 *
 * Each test is fully independent and self-contained.
 * Tests marked "Expected FAIL" will fail until Moamen implements the backend logic.
 */

// ---------------------------------------------------------------------------
// Shared payload factories (no shared state between tests)
// ---------------------------------------------------------------------------

const makeUser = (suffix: string) => ({
  full_name: 'QA Test User',
  email: `qa_test_${suffix}@university.edu`,
  password: 'SecurePass123!',
  role: 'guest',
});

// ---------------------------------------------------------------------------
// Registration tests
// ---------------------------------------------------------------------------

test.describe('POST /auth/register — User Registration', () => {

  /**
   * Gherkin: registration.feature → "Successful registration as a guest"
   * Expected FAIL: stub not implemented yet (handler returns None → FastAPI 500)
   */
  test('Register: success — valid payload returns 201 + user object', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const payload = makeUser(Date.now().toString());

    const response = await request.post('/auth/register', { data: payload });

    // When implemented, expects 201 with RegisterResponse shape
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('user');
    expect(body.user).toHaveProperty('email', payload.email);
    expect(body.user).toHaveProperty('id');
    expect(body.user).not.toHaveProperty('password');
  });

  /**
   * Edge case: duplicate email
   * Expected FAIL: stub not implemented yet
   */
  test('Register: duplicate email returns 409', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const payload = makeUser('duplicate');

    // First registration
    await request.post('/auth/register', { data: payload });
    // Second with same email should conflict
    const response = await request.post('/auth/register', { data: payload });

    expect(response.status()).toBe(409);
  });

  /**
   * Edge case: missing required fields.
   * PASSES NOW — FastAPI schema validation fires before the stub handler.
   */
  test('Register: missing fields returns 422 ✅ PASSES', async ({ request }) => {
    const response = await request.post('/auth/register', {
      data: { full_name: 'No Email' }, // missing email + password
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

  /**
   * Edge case: invalid email format.
   * PASSES NOW — FastAPI EmailStr validation fires before the stub handler.
   */
  test('Register: invalid email format returns 422 ✅ PASSES', async ({ request }) => {
    const response = await request.post('/auth/register', {
      data: {
        full_name: 'Bad Email',
        email: 'not-an-email',
        password: 'SecurePass123!',
        role: 'guest',
      },
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

});

// ---------------------------------------------------------------------------
// Login tests
// ---------------------------------------------------------------------------

test.describe('POST /auth/login — User Login', () => {

  /**
   * Gherkin: login.feature → "Successful login"
   * Expected FAIL: stub not implemented yet
   */
  test('Login: success — valid credentials return 200 + access_token', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.post('/auth/login', {
      data: {
        email: 'john@example.com',
        password: 'Password123',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('access_token');
    expect(body).toHaveProperty('token_type', 'bearer');
    expect(body).toHaveProperty('user');
    expect(typeof body.access_token).toBe('string');
    expect(body.access_token.length).toBeGreaterThan(10);
  });

  /**
   * Gherkin: login.feature → "Invalid credentials"
   * Expected FAIL: stub not implemented yet
   */
  test('Login: invalid credentials return 401', async ({ request }) => {
    // Expected FAIL: stub not implemented yet
    const response = await request.post('/auth/login', {
      data: {
        email: 'john@example.com',
        password: 'WrongPassword',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

  /**
   * Edge case: invalid email format.
   * PASSES NOW — FastAPI EmailStr validation fires before the stub handler.
   */
  test('Login: invalid email format returns 422 ✅ PASSES', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: {
        email: 'not-a-valid-email',
        password: 'Password123',
      },
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

  /**
   * Edge case: missing password field.
   * PASSES NOW — FastAPI schema validation fires before the stub handler.
   */
  test('Login: missing password returns 422 ✅ PASSES', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: { email: 'john@example.com' }, // no password
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

});
