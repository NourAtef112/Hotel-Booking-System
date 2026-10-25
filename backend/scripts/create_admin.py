"""
Create (or promote) an administrator account.

Run once after installation so housing staff can sign in to the admin dashboard:

    docker compose -f docker-compose.prod.yml exec backend \
        python -m scripts.create_admin --email housing@ejust.edu.eg --name "Housing Office"

The password is read interactively (never passed on the command line, where it
would end up in shell history). For automation, set ADMIN_PASSWORD instead.

If the email already belongs to a guest account, that account is promoted to
admin and its password is reset to the one provided.
"""
from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import sys

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.models import User

MIN_PASSWORD_LENGTH = 12


def read_password() -> str:
    env_pw = os.environ.get("ADMIN_PASSWORD")
    if env_pw:
        return env_pw
    first = getpass.getpass("Admin password: ")
    second = getpass.getpass("Repeat password: ")
    if first != second:
        sys.exit("Passwords do not match.")
    return first


async def upsert_admin(email: str, name: str, password: str) -> str:
    # Tables come from Alembic migrations, which the backend runs on start.
    async with AsyncSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user is None:
            session.add(User(
                email=email,
                full_name=name,
                hashed_password=hash_password(password),
                role="admin",
                is_active=True,
            ))
            action = "Created"
        else:
            user.role = "admin"
            user.is_active = True
            user.hashed_password = hash_password(password)
            if name:
                user.full_name = name
            action = "Promoted"
        await session.commit()
    return action


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or promote an admin account.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", default="Housing Administrator")
    args = parser.parse_args()

    password = read_password()
    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")

    action = asyncio.run(upsert_admin(args.email.strip().lower(), args.name.strip(), password))
    print(f"{action} admin account: {args.email.strip().lower()}")


if __name__ == "__main__":
    main()
