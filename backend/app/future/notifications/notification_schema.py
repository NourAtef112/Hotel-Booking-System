"""
notification_schema.py — Future notification system contracts.
Interface definition only. No implementation.
"""

from pydantic import BaseModel
from enum import Enum
from typing import Optional


class NotificationType(str, Enum):
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_CANCELLED = "booking_cancelled"
    BOOKING_REMINDER = "booking_reminder"
    PAYMENT_RECEIVED = "payment_received"
    ACCOUNT_VERIFIED = "account_verified"


class NotificationChannel(str, Enum):
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"


class NotificationRequest(BaseModel):
    """
    Contract for sending a notification.
    TODO: Integrate with email provider (SendGrid / SES)
    TODO: Integrate with push notification service (FCM / APNS)
    """
    user_id: int
    notification_type: NotificationType
    channel: NotificationChannel
    payload: dict  # Template-specific data


# TODO: Define notification service interface
# class INotificationService:
#     async def send(self, request: NotificationRequest) -> None: ...
#     async def send_bulk(self, requests: list[NotificationRequest]) -> None: ...
