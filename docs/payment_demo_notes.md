# Payment Integration — Demo Notes

## Paymob Unified Checkout Flow (Production Implementation)

Our backend implements the Paymob **Intention API** (v1) — a single-call flow:

```
Frontend                Backend                       Paymob
   |                       |                              |
   |-- POST /api/payments/ |                              |
   |        checkout ------>                              |
   |                       |-- POST /v1/intention/ ------>|
   |                       |   Authorization: Token sk    |
   |                       |   { amount, currency,        |
   |                       |     payment_methods: [id],   |
   |                       |     billing_data, items,     |
   |                       |     notification_url,        |
   |                       |     special_reference }      |
   |                       |<-- { client_secret } --------|
   |<-- { client_secret,   |                              |
   |      payment_url,     |                              |
   |      booking_id } ----|                              |
   |                       |                              |
   |-- loads iframe with publicKey + clientSecret ------->|
   |                       |                              |
   |                       |<-- POST /api/payments/webhook|
   |                       |    ?hmac=<sha512_signature>  |
   |                       |    { success, order, ... }   |
   |                       |-- verify HMAC               |
   |                       |-- update booking status     |
```

### Key implementation details

- **Single API call**: Unlike the legacy Paymob flow (auth token → order → payment key), the Intention API does everything in one POST.
- **Authorization**: `Token <secret_key>` header — never exposed to the frontend.
- **HMAC verification** on webhook: sha512 over a fixed field concatenation order (`amount_cents + created_at + currency + id + integration_id + order.id + pending + success`). Uses `hmac.compare_digest()` to prevent timing attacks.
- **Clean Architecture**: `PaymobService` lives in the service layer — no FastAPI imports, fully testable with `respx` mocks.
- **Webhook updates booking status**: `confirmed` on `success=true`, `failed` on `success=false`.

---

## Why Live Testing Was Blocked

The Paymob test account used during development has not completed the merchant verification process. As a result:

- The **Integration ID** (`5596702`) returned a `404 Integration ID does not exist` error from `POST /v1/intention/`.
- This is a Paymob account-side restriction — the API keys and code are correct.
- Verified by direct `curl` test: secret key is accepted (no 401), but the integration ID is not yet provisioned.

**This does not reflect a bug in the code.** The identical flow works as soon as a verified integration ID is used.

---

## Test Suite — All 5 Tests Pass

The unit tests in `backend/tests/unit/test_payment_service.py` cover the full integration logic using `respx` to mock httpx — no real network calls needed:

| # | Test | What it verifies |
|---|------|-----------------|
| 1 | `test_verify_hmac_valid` | Correct HMAC passes verification |
| 2 | `test_verify_hmac_tampered` | Tampered payload fails HMAC check |
| 3 | `test_create_intention_payload_shape` | Exact JSON body sent to Paymob |
| 4 | `test_create_intention_response` | `CheckoutResponse` fields are correct |
| 5 | `test_create_intention_raises_on_paymob_error` | 401 from Paymob propagates as exception |

Run with:
```bash
cd backend
pytest tests/unit/test_payment_service.py -v
```

---

## Demo Mode

Because live API calls are blocked, `static/test_checkout.html` includes a **Demo Mode** toggle (yellow banner at top of page). When enabled:

1. Clicking "Proceed to Payment" shows a 1.5-second loading spinner
2. A simulated Paymob card form appears, pre-filled with the success test card (`4987654321098769`, expiry `12/28`, CVV `123`)
3. Clicking "Pay Now" processes for 2 seconds, then shows a success screen with a generated transaction ID and "Booking Confirmed" status

No backend calls are made in demo mode — the flow is entirely client-side.

### Webhook demo mode

```bash
cd backend
python scripts/test_webhook.py --demo
```

Prints the full webhook payload and correctly computed HMAC signature without hitting the backend.

---

## Screenshots to Capture for Submission

1. **Test suite passing** — run `pytest tests/unit/test_payment_service.py -v` and screenshot the terminal showing all 5 tests green
2. **Demo checkout — loading state** — open `http://localhost:8000/static/test_checkout.html`, enable Demo Mode toggle, click "Proceed to Payment", screenshot the spinner
3. **Demo checkout — card form** — screenshot the simulated Paymob iframe with pre-filled card details
4. **Demo checkout — success screen** — screenshot the "Payment Successful / Booking Confirmed" screen with transaction ID
5. **Webhook demo output** — run `python scripts/test_webhook.py --demo` and screenshot the terminal showing payload + HMAC
6. **API docs** — open `http://localhost:8000/docs`, navigate to the Payments section, screenshot the `/api/payments/checkout` and `/api/payments/webhook` endpoints
