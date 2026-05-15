#!/usr/bin/env python3
"""
test_webhook.py — simulate a Paymob webhook callback locally.
Usage:
  python scripts/test_webhook.py          # send success webhook to backend
  python scripts/test_webhook.py --fail   # send failed-payment webhook
  python scripts/test_webhook.py --demo   # print payload + HMAC without hitting backend
"""
import sys
import hashlib
import hmac
import json
import requests
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
WEBHOOK_URL    = "http://localhost:8000/api/payments/webhook"
HMAC_KEY       = "E708A749DBDD0C57A0EEDECC5C943EE7"
INTEGRATION_ID = "5670417"
BOOKING_ID     = 1

# ── Flags ────────────────────────────────────────────────────────────────────
demo_mode    = "--demo" in sys.argv
success_flag = "--fail" not in sys.argv and not ("--demo" in sys.argv and "--fail" in sys.argv)

# ── Build payload ─────────────────────────────────────────────────────────────

payload = {
    "id": 999001,
    "pending": False,
    "amount_cents": 25000,
    "success": success_flag,
    "is_auth": False,
    "is_capture": False,
    "is_standalone_payment": True,
    "is_voided": False,
    "is_refunded": False,
    "is_3d_secure": False,
    "order": {
        "id": 888001,
        "merchant_order_id": f"ejust-booking-{BOOKING_ID}",
    },
    "created_at": datetime.utcnow().isoformat(),
    "currency": "EGP",
    "source_data": {"type": "card", "pan": "9769"},
    "api_source": "IFRAME",
    "transaction_processed_callback_responses": [],
    "merchant_commission": 0,
}

# ── Compute HMAC (same algorithm as payment_service.verify_hmac) ──────────────
concatenated = (
    str(payload["amount_cents"])
    + str(payload["created_at"])
    + str(payload["currency"])
    + str(payload["id"])
    + INTEGRATION_ID
    + str(payload["order"]["id"])
    + str(payload["pending"]).lower()
    + str(payload["success"]).lower()
)
computed_hmac = hmac.new(
    HMAC_KEY.encode(),
    concatenated.encode(),
    hashlib.sha512,
).hexdigest()

# ── Print summary ─────────────────────────────────────────────────────────────
print(f"\n{'='*50}")
print(f"Simulating Paymob webhook — success={success_flag}")
print(f"Booking ID: {BOOKING_ID}")
print(f"Amount: {payload['amount_cents'] / 100} EGP")
print(f"HMAC (sha512, first 20 chars): {computed_hmac[:20]}...")
print(f"{'='*50}\n")

if demo_mode:
    # ── Demo mode: just print what would be sent, no network calls ────────────
    print("=== DEMO MODE — no request sent to backend ===\n")
    print(f"Webhook URL: {WEBHOOK_URL}?hmac={computed_hmac}\n")
    print("Payload that would be POSTed:")
    print(json.dumps(payload, indent=2))
    print(f"\nFull HMAC signature:\n{computed_hmac}")
    print("\nConcatenation string used for HMAC:")
    concatenated_str = (
        str(payload["amount_cents"])
        + str(payload["created_at"])
        + str(payload["currency"])
        + str(payload["id"])
        + INTEGRATION_ID
        + str(payload["order"]["id"])
        + str(payload["pending"]).lower()
        + str(payload["success"]).lower()
    )
    print(f"  {concatenated_str}")
    print("\n✅ Demo complete — HMAC computed correctly, payload ready.")
    sys.exit(0)

# ── Send request ──────────────────────────────────────────────────────────────
response = requests.post(
    f"{WEBHOOK_URL}?hmac={computed_hmac}",
    json=payload,
    headers={"Content-Type": "application/json"},
)

print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

if response.status_code == 200:
    expected_status = "confirmed" if success_flag else "failed"
    print(f"\n✅ Webhook accepted. Booking #{BOOKING_ID} → {expected_status}")
else:
    print(f"\n❌ Webhook rejected: {response.text}")

# ── Also test with bad HMAC ───────────────────────────────────────────────────
print(f"\n--- Testing HMAC rejection ---")
bad_response = requests.post(
    f"{WEBHOOK_URL}?hmac=thisisafakehmacsignature",
    json=payload,
    headers={"Content-Type": "application/json"},
)
if bad_response.status_code == 400:
    print("✅ Bad HMAC correctly rejected (400)")
else:
    print(f"❌ Bad HMAC was NOT rejected — status: {bad_response.status_code}")
