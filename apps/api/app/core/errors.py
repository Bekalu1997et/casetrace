import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.schemas.errors import ErrorDetail, ErrorResponse

logger = logging.getLogger("casetrace.errors")


def error_response(request: Request, status: int, code: str, message: str) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
            request_id=request.state.request_id,
        )
    )
    return JSONResponse(status_code=status, content=body.model_dump())


def internal_error_response(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "request.failed",
        extra={
            "request_id": request.state.request_id,
            "status": 500,
            "error_type": type(exc).__name__,
        },
    )
    return error_response(request, 500, "INTERNAL_ERROR", "An internal error occurred.")


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        response = error_response(
            request,
            exc.status_code,
            "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR",
            "The requested resource was not found."
            if exc.status_code == 404
            else "The request could not be completed.",
        )
        if exc.headers:
            response.headers.update(exc.headers)
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        return error_response(request, 422, "VALIDATION_ERROR", "Request validation failed.")

    @app.exception_handler(Exception)
    async def internal_error(request: Request, exc: Exception) -> JSONResponse:
        response = internal_error_response(request, exc)
        response.headers["X-Request-ID"] = request.state.request_id
        return response
