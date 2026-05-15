class BookingOverlapError(Exception):
    error_code = "BOOKING_OVERLAP"
    status_code = 409

    def __init__(self, message: str = "El oda di ma3andehash ta2ah lel maw3ed da — dih already book"):
        self.message = message
        super().__init__(message)

    def to_dict(self) -> dict:
        return {"error_code": self.error_code, "message": self.message}


class RoomNotFoundError(Exception):
    error_code = "ROOM_NOT_FOUND"
    status_code = 404

    def __init__(self, room_id=None):
        self.message = f"El oda {room_id} msh mawgouda" if room_id else "El oda msh mawgouda"
        super().__init__(self.message)

    def to_dict(self) -> dict:
        return {"error_code": self.error_code, "message": self.message}


class IllegalStateTransitionError(Exception):
    error_code = "ILLEGAL_STATE_TRANSITION"
    status_code = 422

    def __init__(self, from_status: str = "", to_status: str = ""):
        self.message = (
            f"Mesh momken te3mel transition men '{from_status}' le '{to_status}' — "
            "el admin 2atal el 7agz dah"
        )
        super().__init__(self.message)

    def to_dict(self) -> dict:
        return {"error_code": self.error_code, "message": self.message}
