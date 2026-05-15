import hashlib
import hmac as hmac_lib
import json

import pytest
import respx
from httpx import Response

from app.schemas.payment import CheckoutRequest, PaymobWebhookPayload
from app.services.payment_service import PaymobService


# ── Fake settings — tests never need a real .env ──────────────────────────────

_FAKE = type("S", (), {
    "PAYMOB_SECRET_KEY":    "sk_test_fake",
    "PAYMOB_PUBLIC_KEY":    "pk_test_fake",
    "PAYMOB_HMAC_KEY":      "hmac_test_fake",
    "PAYMOB_INTEGRATION_ID": "9999",
    "PAYMOB_BASE_URL":      "https://accept.paymob.com",
    "BASE_URL":             "http://localhost:8000",
})()


@pytest.fixture
def service(monkeypatch):
    monkeypatch.setattr("app.services.payment_service.settings", _FAKE)
    svc = PaymobService.__new__(PaymobService)
    svc._secret  = _FAKE.PAYMOB_SECRET_KEY
    svc._public  = _FAKE.PAYMOB_PUBLIC_KEY
    svc._hmac    = _FAKE.PAYMOB_HMAC_KEY
    svc._int_id  = _FAKE.PAYMOB_INTEGRATION_ID
    svc._base    = _FAKE.PAYMOB_BASE_URL
    svc._our_url = _FAKE.BASE_URL
    return svc


@pytest.fixture
def sample_request():
    return CheckoutRequest(
        booking_id=42,
        amount_cents=25000,
        currency="EGP",
        guest_first_name="Moamen",
        guest_last_name="Fouad",
        guest_email="moamen@ejust.edu.eg",
        guest_phone="+201288277193",
    )


@pytest.fixture
def sample_webhook():
    return PaymobWebhookPayload(
        id=999,
        pending=False,
        amount_cents=25000,
        success=True,
        is_auth=False,
        is_capture=False,
        is_standalone_payment=True,
        is_voided=False,
        is_refunded=False,
        is_3d_secure=False,
        order={"id": 888},
        created_at="2026-05-15T17:00:00",
        currency="EGP",
        api_source="IFRAME",
    )


# ── Test 1: valid HMAC ─────────────────────────────────────────────────────────

def test_verify_hmac_valid(service, sample_webhook):
    concatenated = (
        str(sample_webhook.amount_cents)
        + str(sample_webhook.created_at)
        + str(sample_webhook.currency)
        + str(sample_webhook.id)
        + "9999"
        + str(sample_webhook.order.get("id", ""))
        + str(sample_webhook.pending).lower()
        + str(sample_webhook.success).lower()
    )
    expected = hmac_lib.new(
        "hmac_test_fake".encode(),
        concatenated.encode(),
        hashlib.sha512,
    ).hexdigest()

    assert service.verify_hmac(sample_webhook, expected) is True


# ── Test 2: tampered HMAC ─────────────────────────────────────────────────────

def test_verify_hmac_tampered(service, sample_webhook):
    concatenated = (
        str(sample_webhook.amount_cents)
        + str(sample_webhook.created_at)
        + str(sample_webhook.currency)
        + str(sample_webhook.id)
        + "9999"
        + str(sample_webhook.order.get("id", ""))
        + str(sample_webhook.pending).lower()
        + "true"   # HMAC was computed for success=True
    )
    original_hmac = hmac_lib.new(
        "hmac_test_fake".encode(),
        concatenated.encode(),
        hashlib.sha512,
    ).hexdigest()

    # tamper: flip the success flag after signing
    sample_webhook.success = False
    assert service.verify_hmac(sample_webhook, original_hmac) is False


# ── Test 3: create_intention sends correct JSON body to Paymob ─────────────────

@respx.mock
async def test_create_intention_payload_shape(service, sample_request):
    route = respx.post("https://accept.paymob.com/v1/intention/").mock(
        return_value=Response(200, json={"client_secret": "cs_test_abc"})
    )
    await service.create_intention(sample_request)

    assert route.called
    parsed = json.loads(route.calls[0].request.content)

    assert parsed["amount"] == 25000
    assert parsed["currency"] == "EGP"
    assert parsed["payment_methods"] == [9999]
    assert parsed["billing_data"]["city"] == "Alexandria"
    assert parsed["billing_data"]["country"] == "EGY"
    assert parsed["special_reference"] == "ejust-booking-42"


# ── Test 4: create_intention returns correct CheckoutResponse ──────────────────

@respx.mock
async def test_create_intention_response(service, sample_request):
    respx.post("https://accept.paymob.com/v1/intention/").mock(
        return_value=Response(200, json={"client_secret": "cs_test_xyz"})
    )
    result = await service.create_intention(sample_request)

    assert result.client_secret == "cs_test_xyz"
    assert "publicKey=pk_test_fake" in result.payment_url
    assert "clientSecret=cs_test_xyz" in result.payment_url
    assert result.booking_id == 42


# ── Test 5: create_intention raises on Paymob 401 ─────────────────────────────

@respx.mock
async def test_create_intention_raises_on_paymob_error(service, sample_request):
    respx.post("https://accept.paymob.com/v1/intention/").mock(
        return_value=Response(401, json={"detail": "Invalid token"})
    )
    with pytest.raises(Exception):
        await service.create_intention(sample_request)
