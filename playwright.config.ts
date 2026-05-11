import { defineConfig } from '@playwright/test';

/**
 * playwright.config.ts
 *
 * E2E API test configuration for the University Guest Housing Booking System.
 * Tests target the FastAPI backend directly using Playwright's request API.
 * No browser is launched — this is pure HTTP-level API validation.
 *
 * Base URL: http://localhost:8000
 * Routes: /auth/*, /rooms/*, /bookings/*
 *
 * NOTE: The /api prefix documented in the task spec does NOT match the actual
 * router prefixes in backend/main.py. Tests use the actual routes.
 * This mismatch is logged as BUG-001 in docs/qa_report.md.
 */

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0, // Zero retries — no flaky tests allowed per spec
  workers: 1, // Sequential to avoid race conditions on shared backend state
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:8000',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  },

  projects: [
    {
      name: 'api',
      // No browser context — using request fixture only
    },
  ],

  // Automatically starts the FastAPI backend before running tests.
  // Requires: cd backend && pip install -r requirements.txt
  webServer: {
    command: 'cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000',
    port: 8000,
    reuseExistingServer: true, // Reuse if already running locally
    timeout: 30_000,
  },
});
