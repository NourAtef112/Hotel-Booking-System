from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class CheckoutRequest(BaseModel):
    booking_id: int
    amount_cents: int = Field(..., gt=0,
        description="Amount in Egyptian piastres. EGP 100 = 10000")
    currency: str = "EGP"
    guest_first_name: str
    guest_last_name: str
    guest_email: str
    guest_phone: str = Field(...,
        description="Egyptian mobile format: +201XXXXXXXXX")


class CheckoutResponse(BaseModel):
    client_secret: str
    payment_url: str
    booking_id: int


class PaymobWebhookPayload(BaseModel):
    """
    el model da byista2bal el callback men Paymob ba3d el payment.
    kol field lazem strongly typed — mesh dict — 3ashan el HMAC verification.
    """
    id: int
    pending: bool
    amount_cents: int
    success: bool
    is_auth: bool
    is_capture: bool
    is_standalone_payment: bool
    is_voided: bool
    is_refunded: bool
    is_3d_secure: bool
    order: dict
    created_at: str
    transaction_processed_callback_responses: list = []
    currency: str
    source_data: dict = {}
    api_source: str = ""
    terminal_id: Optional[int] = None
    merchant_commission: int = 0
    installment: Optional[str] = None
