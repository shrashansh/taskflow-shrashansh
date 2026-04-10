from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


class NotFoundException(AppException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=404, detail=detail)


class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(status_code=401, detail=detail)


class ForbiddenException(AppException):
    def __init__(self, detail: str = "Not authorized"):
        super().__init__(status_code=403, detail=detail)


class ConflictException(AppException):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(status_code=409, detail=detail)


class ValidationException(AppException):
    def __init__(self, detail: str = "Validation error"):
        super().__init__(status_code=422, detail=detail)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        fields: dict[str, str] = {}
        for err in exc.errors():
            loc = err.get("loc", ())
            # Skip the first element ("body") to get the field name
            field_parts = [str(part) for part in loc if part != "body"]
            field_name = ".".join(field_parts) if field_parts else "unknown"
            fields[field_name] = err.get("msg", "invalid")
        return JSONResponse(
            status_code=400,
            content={"error": "validation failed", "fields": fields},
        )
