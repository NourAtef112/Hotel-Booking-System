"""
security.py — JWT and password hashing utilities.
Function signatures only. No implementation.
"""


def hash_password(plain_password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    TODO: return pwd_context.hash(plain_password)
    """
    pass


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against a stored hash.
    TODO: return pwd_context.verify(plain_password, hashed_password)
    """
    pass


def create_access_token(data: dict) -> str:
    """
    Generate a JWT access token with expiry.
    TODO: encode data + exp claim using SECRET_KEY and ALGORITHM
    """
    pass


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.
    TODO: Raise 401 if invalid or expired
    """
    pass
