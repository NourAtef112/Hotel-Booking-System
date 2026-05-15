"""
ws_availability.py — Real-time room availability via WebSocket.
El client byi-connect w byestanna events — kol ma 7agz yt3amal aw yit-cancel,
el server yeb3at update le kol el connected clients automatically.
"""

from __future__ import annotations

import json
from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """
    Da el manager beta3 el WebSocket connections.
    Bey-track kol el clients el mwasleen w byeb3at le kollohom lama feeh update.
    """

    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_room_update(self, room_id: int, is_available: bool) -> None:
        # beb3at le kol el clients el connected — law maffish 7ad connected, maffish mashakil
        payload = json.dumps({
            "event": "room_availability_update",
            "room_id": room_id,
            "available": is_available,
        })
        dead: list[WebSocket] = []
        for ws in self.active_connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


# singleton — imported by booking_service to broadcast on every booking event
ws_manager = ConnectionManager()


@router.websocket("/ws/availability")
async def availability_socket(websocket: WebSocket) -> None:
    """
    WebSocket endpoint — el client yi-connect w yestanna room availability events.
    On connect: sends a snapshot of all room availability from the mock repo.
    On each booking create/cancel: receives a broadcast from booking_service.
    """
    await ws_manager.connect(websocket)
    try:
        # send current snapshot so the client doesn't start blind
        from app.repositories.booking_repository import mock_booking_repo
        from app.mocks.seed_rooms import ROOMS

        snapshot = [
            {"room_id": r["id"], "room_number": r["room_number"], "available": r["available"]}
            for r in ROOMS
        ]
        await websocket.send_text(json.dumps({"event": "snapshot", "rooms": snapshot}))

        # keep connection alive — client can close when done
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
