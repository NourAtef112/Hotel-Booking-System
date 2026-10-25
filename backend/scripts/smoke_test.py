"""
End-to-end smoke test against a running deployment.

    python -m scripts.smoke_test --base-url http://localhost:8000 \
        --admin-email housing@ejust.edu.eg --admin-password '...'

Creates a test room and test guests, then checks: public room listing, guest
booking, overlap rejection, back-to-back booking, a 20-way concurrent booking
race (exactly one may win), admin access control, and admin confirmation.
Run it on a staging copy, or delete the test room afterwards: it writes data.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
import uuid
from datetime import date, timedelta

import httpx

RESULTS: list[tuple[bool, str]] = []


def check(ok: bool, label: str) -> None:
    RESULTS.append((ok, label))
    print(f"  {'PASS' if ok else 'FAIL'}  {label}")


def day(n: int) -> str:
    return (date.today() + timedelta(days=n)).isoformat()


async def register(c: httpx.AsyncClient) -> dict:
    email = f"smoke-{uuid.uuid4().hex[:10]}@example.com"
    r = await c.post("/api/v1/auth/register", json={"name": "Smoke Guest", "email": email, "password": "smoke-pass-123"})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def run(base_url: str, admin_email: str, admin_password: str) -> int:
    async with httpx.AsyncClient(base_url=base_url, timeout=30) as c:
        print(f"Smoke test against {base_url}")

        r = await c.get("/health")
        check(r.status_code == 200, "health endpoint responds")

        r = await c.post("/api/v1/auth/login", json={"email": admin_email, "password": admin_password})
        check(r.status_code == 200, "admin can log in")
        if r.status_code != 200:
            return 1
        admin = {"Authorization": f"Bearer {r.json()['access_token']}"}

        room_no = f"SMOKE-{uuid.uuid4().hex[:6].upper()}"
        r = await c.post("/api/admin/rooms", headers=admin, json={"room_number": room_no, "type": "single", "price_per_night": 500})
        check(r.status_code == 201, "admin creates a room")
        room_id = r.json()["id"]

        r = await c.get("/api/v1/rooms/", params={"page_size": 100})
        check(r.status_code == 200 and any(x["id"] == room_id for x in r.json()["rooms"]),
              "room appears in public listing without login")

        r = await c.get("/api/admin/bookings")
        check(r.status_code == 401, "admin API rejects anonymous caller (401)")

        guest = await register(c)
        r = await c.get("/api/admin/bookings", headers=guest)
        check(r.status_code == 403, "admin API rejects a guest (403)")

        r = await c.post("/api/v1/bookings/", headers=guest, json={"room_id": room_id, "start_date": day(10), "end_date": day(13)})
        check(r.status_code == 201, "guest books 3 nights")
        booking = r.json() if r.status_code == 201 else {}
        check(booking.get("total_cost") == 1500, "cost = 3 nights x 500 EGP = 1500")
        check(booking.get("status") == "pending", "new booking starts as pending")

        r = await c.post("/api/v1/bookings/", headers=guest, json={"room_id": room_id, "start_date": day(11), "end_date": day(14)})
        check(r.status_code == 409, "overlapping booking rejected (409)")

        r = await c.post("/api/v1/bookings/", headers=guest, json={"room_id": room_id, "start_date": day(13), "end_date": day(15)})
        check(r.status_code == 201, "back-to-back booking allowed (check-out day = check-in day)")

        r = await c.post("/api/v1/bookings/", headers=guest, json={"room_id": room_id, "start_date": day(-1), "end_date": day(2)})
        check(r.status_code == 422, "past check-in date rejected (422)")

        guests = await asyncio.gather(*[register(c) for _ in range(20)])
        racers = await asyncio.gather(*[
            c.post("/api/v1/bookings/", headers=g, json={"room_id": room_id, "start_date": day(30), "end_date": day(32)})
            for g in guests
        ])
        codes = sorted(x.status_code for x in racers)
        winners = codes.count(201)
        check(winners == 1, f"20 simultaneous bookings for the same dates: exactly 1 succeeds (got {winners})")
        check(all(code in (201, 409) for code in codes), "race losers get a clean 409, no server errors")

        r = await c.patch(f"/api/admin/bookings/{booking['id']}/status", headers=admin, json={"status": "confirmed"})
        check(r.status_code == 200 and r.json().get("status") == "confirmed", "admin confirms the booking")

        r = await c.get("/api/v1/bookings/me", headers=guest)
        mine = {b["id"]: b for b in r.json()} if r.status_code == 200 else {}
        check(mine.get(booking["id"], {}).get("status") == "confirmed", "guest sees the confirmed status")

    failed = [label for ok, label in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} checks passed")
    return 1 if failed else 0


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--base-url", default="http://localhost:8000")
    p.add_argument("--admin-email", required=True)
    p.add_argument("--admin-password", required=True)
    a = p.parse_args()
    sys.exit(asyncio.run(run(a.base_url, a.admin_email, a.admin_password)))


if __name__ == "__main__":
    main()
