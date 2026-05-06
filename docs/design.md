# Design Document

## High-Level Architecture
The system follows a classic **Client-Server** architecture.
- **Frontend**: React Native mobile application for end-user interaction.
- **Backend**: Python FastAPI providing a RESTful JSON API.
- **Database**: PostgreSQL for persistent storage of users, rooms, and bookings.

## Layered Backend Explanation
The backend is structured into layers to separate concerns:
1. **API Layer (`app/api`)**: Handles HTTP requests, routing, and input validation via Pydantic.
2. **Service Layer (`app/services`)**: Contains the business logic (e.g., availability checks, price calculations).
3. **Repository Layer (`app/repositories`)**: Encapsulates data access logic, interacting with the DB.
4. **Models Layer (`app/models`)**: Defines the database schema using SQLAlchemy ORM.

## API Contract Philosophy
We use **Information Hiding** and strict **Schemas**.
- Internal database models are never exposed directly to the client.
- Pydantic schemas define the exact request and response shapes.
- This decoupling allows the database schema to change without breaking the mobile app.
