# Testing Strategy for University Guest Housing Booking System

## Overview
This document outlines the testing infrastructure and strategy implemented for the project. Our goal is to ensure stability, maintainability, and code quality across both the backend and frontend components.

## Testing Pyramid
We follow the standard testing pyramid approach to achieve optimal test coverage:

1.  **Unit Tests (Base)**: Fast, isolated tests for individual components or functions. Mocks are used to prevent reliance on external systems like databases or network calls.
    *   **Backend (Pytest)**: Unit tests for services, utility functions, and business logic using mocked data.
    *   **Frontend (Jest)**: Component rendering and basic user interactions using `@testing-library/react-native`.

2.  **Integration Tests (Middle)**: Tests that combine multiple units to ensure they interact correctly (e.g., testing FastAPI endpoints with service layers).
    *   **Backend (Pytest)**: Tests leveraging test databases or mocked integrations.

3.  **End-to-End (E2E) Tests (Top)**: Full system tests simulating user workflows. Kept separate from the core backend unit test directory.

## Behavior-Driven Development (BDD)
We use a BDD structure mapped with Gherkin feature files stored in the `features/` directory.

### Gherkin Mapping
*   **Feature Files**: Written in a human-readable format (`.feature` files) detailing scenarios (Happy Paths and Edge Cases).
*   **Mapping to Tests**: These files describe the behavior that our integration and E2E tests must fulfill. By reading a feature file, a QA engineer can map the `Given/When/Then` steps directly to backend API test scenarios or frontend interaction tests.

## Running Tests

### Backend Tests
The backend uses **pytest**. All tests are located in `backend/tests/`. To run them:
```bash
cd backend
pytest
```
*Note: Make sure your virtual environment is active and dependencies from `requirements.txt` are installed.*

### Frontend Tests
The frontend (React Native/Expo) uses **Jest** with the `jest-expo` preset. To run them:
```bash
cd mobile-app
npm test
```

## Design Decisions
1.  **Clean Structure**: Root-level `tests/` and `gherkin/` directories were eliminated. Tests are now co-located with their respective applications (`backend/tests/` and `mobile-app/tests/`) to prevent duplicate directories and clarify boundaries.
2.  **Mock Utilities**: A shared `mock_data.py` exists in `backend/tests/utils/` to provide reusable mock objects across all backend tests, reducing DB dependencies and hardcoded setups.
3.  **Preserved History**: Existing tests were moved to the new location instead of deleted and recreated, preserving valuable git history.
4.  **No Node Environment Spillage**: `node_modules` and other build artifacts are strictly ignored via a comprehensive root `.gitignore`.
