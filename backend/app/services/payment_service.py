"""
payment_service.py — el service beta3 el payment.
Ma byimport-sh men fastapi khales — pure Python + httpx.
El secret key mesh byit3adar yeshofha ay 7ad gher el backend.
"""

from __future__ import annotations

import hashlib
import hmac as hmac_lib

import httpx

from app.core.config import settings
from app.schemas.payment import CheckoutRequest, CheckoutResponse, PaymobWebhookPayload


class PaymobService:
    """
    Byit3amel ma3 Paymob Intention API.
    No FastAPI imports. No SQLAlchemy. Pure Python.
    Testable bel 3ein el mogarrada ma3 respx mock.
    """

    def __init__(self) -> None:
        # kol el keys beitgebo men settings — mesh hardcoded 7aga
        self._secret  = settings.PAYMOB_SECRET_KEY
        self._public  = settings.PAYMOB_PUBLIC_KEY
        self._hmac    = settings.PAYMOB_HMAC_KEY
        self._int_id  = settings.PAYMOB_INTEGRATION_ID
        self._base    = settings.PAYMOB_BASE_URL
        self._our_url = settings.BASE_URL

    async def create_intention(
        self, payload: CheckoutRequest
    ) -> CheckoutResponse:
        """
        el step el wa7ed — POST le Paymob /v1/intention/
        el secret key betro7 fe el Authorization header bass.
        el frontend mesh shayef el secret key 7aga.
        """
        _headers = {
            "Authorization": f"Token {self._secret}",
            "Content-Type": "application/json",
        }
        _body = {
                    "amount": payload.amount_cents,
                    "currency": payload.currency,
                    "payment_methods": [int(self._int_id)],
                    "items": [
                        {
                            "name": f"E-JUST Guest House — Booking #{payload.booking_id}",
                            "amount": payload.amount_cents,
                            "description": "University guest room reservation",
                            "quantity": 1,
                        }
                    ],
                    "billing_data": {
                        "first_name":   payload.guest_first_name,
                        "last_name":    payload.guest_last_name,
                        "phone_number": payload.guest_phone,
                        "email":        payload.guest_email,
                        "apartment":    "N/A",
                        "street":       "E-JUST Campus Road",
                        "building":     "Guest House",
                        "city":         "Alexandria",
                        "country":      "EGY",
                        "floor":        "N/A",
                        "state":        "Alexandria",
                    },
                    "special_reference": f"ejust-booking-{payload.booking_id}",
                    "extras": {"booking_id": payload.booking_id},
                    "notification_url": f"{self._our_url}/api/payments/webhook",
                    "redirection_url":  f"{self._our_url}/booking/confirmation",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self._base}/v1/intention/",
                headers=_headers,
                json=_body,
            )
            resp.raise_for_status()
            data = resp.json()

        client_secret = data["client_secret"]

        # el URL di betro7 lel frontend — public key bass, mesh secret
        payment_url = (
            f"{self._base}/unifiedcheckout/"
            f"?publicKey={self._public}"
            f"&clientSecret={client_secret}"
        )

        return CheckoutResponse(
            client_secret=client_secret,
            payment_url=payment_url,
            booking_id=payload.booking_id,
        )

    def verify_hmac(
        self,
        payload: PaymobWebhookPayload,
        received_hmac: str,
    ) -> bool:
        """
        da el guard beta3 el webhook — law HMAC mish valid → reject.
        Paymob byi3mel sha512 3ala el fields di bel tartib da bass.
        compare_digest lazem 3ashan timing attacks — mesh ==
        """
        # el order da fixed men Paymob — mesh te3del 7aga
        concatenated = (
            str(payload.amount_cents)
            + str(payload.created_at)
            + str(payload.currency)
            + str(payload.id)
            + str(self._int_id)
            + str(payload.order.get("id", ""))
            + str(payload.pending).lower()
            + str(payload.success).lower()
        )
        expected = hmac_lib.new(
            self._hmac.encode(),
            concatenated.encode(),
            hashlib.sha512,
        ).hexdigest()

        # compare_digest prevents timing side-channel attacks
        return hmac_lib.compare_digest(expected, received_hmac)


# module-level singleton — same pattern as booking_service
paymob_service = PaymobService()
