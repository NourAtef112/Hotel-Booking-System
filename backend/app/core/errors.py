from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.schemas.common import ErrorResponse


def _serializable_errors(errors: list) -> list:
    """Strip non-JSON-serializable values (e.g. ValueError in ctx) from pydantic errors."""
    clean = []
    for err in errors:
        e = {k: v for k, v in err.items() if k != "ctx"}
        if "ctx" in err:
            e["ctx"] = {k: str(v) for k, v in err["ctx"].items()}
        clean.append(e)
    return clean


async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error_code="VALIDATION_ERROR",
            message="Request validation failed",
            details={"errors": _serializable_errors(exc.errors())},
        ).model_dump(),
    )


async def generic_exception_handler(
    _request: Request, _exc: Exception
) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error_code="INTERNAL_ERROR",
            message="An unexpected error occurred",
        ).model_dump(),
    )
