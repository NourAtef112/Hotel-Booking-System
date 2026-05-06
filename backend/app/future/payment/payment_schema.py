"""
payment_schema.py — Future payment integration contracts.
Interface definition only. No implementation.
"""

from pydantic import BaseModel
from typing import Optional
from enum import Enum


class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    BANK_TRANSFER = "bank_transfer"
    UNIVERSITY_ACCOUNT = "university_account"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentRequest(BaseModel):
    """
    Contract for initiating a payment.
    TODO: Integrate with payment gateway (Stripe / Fawry / etc.)
    """
    booking_id: int
    amount: float
    currency: str = "EGP"
    method: PaymentMethod


class PaymentResponse(BaseModel):
    """
    Contract for payment confirmation response.
    """
    payment_id: str
    booking_id: int
    amount: float
    status: PaymentStatus
    transaction_ref: Optional[str]


# TODO: Define payment service interface
# class IPaymentService:
#     async def initiate_payment(self, request: PaymentRequest) -> PaymentResponse: ...
#     async def verify_payment(self, payment_id: str) -> PaymentResponse: ...
#     async def refund_payment(self, payment_id: str) -> PaymentResponse: ...
