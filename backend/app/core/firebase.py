import asyncio
import json

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.core.config import settings


def _init_firebase() -> None:
    if firebase_admin._apps:
        return
    cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)  # project_id is embedded in the service account JSON


def verify_firebase_token(id_token: str) -> dict:
    _init_firebase()
    return firebase_auth.verify_id_token(id_token, check_revoked=False)


async def verify_firebase_token_async(id_token: str) -> dict:
    return await asyncio.to_thread(verify_firebase_token, id_token)
