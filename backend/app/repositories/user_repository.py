"""
user_repository.py — Data access layer for User entities.
All functions are stubs. No DB logic implemented.
"""


async def create_user(user_data: dict) -> dict:
    """
    Insert a new user record into the database.
    TODO: Use SQLAlchemy async session
    TODO: Return the created user object
    """
    pass


async def get_by_email(email: str) -> dict | None:
    """
    Find a user by their email address.
    TODO: SELECT * FROM users WHERE email = :email
    """
    pass


async def get_by_id(user_id: int) -> dict | None:
    """
    Find a user by their primary key ID.
    TODO: SELECT * FROM users WHERE id = :user_id
    """
    pass


async def update_user(user_id: int, update_data: dict) -> dict:
    """
    Update user fields.
    TODO: UPDATE users SET ... WHERE id = :user_id
    """
    pass


async def delete_user(user_id: int) -> None:
    """
    Soft-delete a user record.
    TODO: SET is_active = false WHERE id = :user_id
    """
    pass
