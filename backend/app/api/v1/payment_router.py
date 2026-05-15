"""
payment_router.py — HTTP layer for payment endpoints.
El service layer mesh shayef FastAPI. El router bass byit3amel ma3 HTTP.
"""

from fastapi import APIRouter, HTTPException, Query
import httpx

from app.repositories.booking_repository import mock_booking_repo
from app.schemas.payment import CheckoutRequest, CheckoutResponse, PaymobWebhookPayload
from app.services.payment_service import paymob_service

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/checkout", response_model=CheckoutResponse, status_code=200)
async def checkout(payload: CheckoutRequest):
    """
    el guest by-click 'Proceed to Payment' →
    el backend byi3mel intention ma3 Paymob →
    byirga3 el payment_url lel frontend 3ashan yi3mel iframe.
    El secret key mesh byit3adar yeshofha el browser 7aga.
    """
    try:
        return await paymob_service.create_intention(payload)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error_code": "PAYMENT_GATEWAY_ERROR",
                "message": "Paymob gateway returned an error",
                "details": {"paymob_response": exc.response.text},
            },
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail={
                "error_code": "PAYMENT_GATEWAY_TIMEOUT",
                "message": "Paymob did not respond in time. Try again.",
            },
        )


@router.post("/webhook", status_code=200)
async def webhook(
    payload: PaymobWebhookPayload,
    hmac_value: str = Query(alias="hmac"),
):
    """
    PUBLIC endpoint — Paymob byet3amel POST hena ba3d el payment.
    Mesh protected bel JWT 3ashan Paymob mesh byet-login.
    Step 1: verify HMAC — law fail → 400, mesh ta3mel 7aga.
    Step 2: update el booking status fe el repo.
    Return 200 fast — Paymob retries on timeout.
    """
    # el HMAC el gatekeeper — mesh ta3mel 7aga law mish valid
    if not paymob_service.verify_hmac(payload, hmac_value):
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "HMAC_VERIFICATION_FAILED",
                "message": "Webhook signature invalid — rejected",
            },
        )

    # extract booking_id from the special_reference set during intention creation
    merchant_ref = payload.order.get("merchant_order_id", "")
    booking_id_str = merchant_ref.replace("ejust-booking-", "")

    if not booking_id_str.isdigit():
        # mish booking beta3na — ignore silently
        return {"status": "ignored"}

    new_status = "confirmed" if payload.success else "failed"
    mock_booking_repo.update_payment_status(int(booking_id_str), new_status)

    return {"status": "ok", "booking_id": booking_id_str, "new_status": new_status}
