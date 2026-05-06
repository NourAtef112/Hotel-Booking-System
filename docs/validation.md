# Validation Plan

## Testing Pyramid Plan
1. **Unit Tests (Base)**: Testing individual service functions and repository logic using `pytest`. High coverage expected.
2. **Integration Tests (Middle)**: Testing API endpoints end-to-end (mocking database or using a test DB).
3. **End-to-End Tests (Top)**: UI automation using Playwright (or Appium for mobile) to verify critical user paths like registration and booking.

## Verification vs Validation
- **Verification**: "Are we building the product right?"
  - Done via code reviews, linting, and automated unit/integration tests to ensure the system matches the design specs.
- **Validation**: "Are we building the right product?"
  - Done via Gherkin scenarios and user acceptance testing (UAT) to ensure the system meets the actual needs of university students and staff.
