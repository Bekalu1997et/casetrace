import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router
from app.core.config import Settings, load_settings
from app.core.database import Database
from app.core.errors import install_error_handlers, internal_error_response
from app.core.logging import configure_logging


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or load_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        configure_logging(config.log_level)
        database = Database(config)
        application.state.database = database
        try:
            await database.initialize()
            logging.getLogger("casetrace").info("application.started")
            yield
        finally:
            await database.dispose()
            logging.getLogger("casetrace").info("application.stopped")

    application = FastAPI(
        title="CASETRACE API",
        version="1.0.0",
        lifespan=lifespan,
    )
    application.state.settings = config
    install_error_handlers(application)
    application.include_router(router)

    @application.middleware("http")
    async def request_context(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        request.state.request_id = f"req_{uuid4().hex}"
        start = perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            response = internal_error_response(request, exc)
        response.headers["X-Request-ID"] = request.state.request_id
        logging.getLogger("casetrace.http").info(
            "request.completed",
            extra={
                "request_id": request.state.request_id,
                "status": response.status_code,
                "duration_ms": round((perf_counter() - start) * 1000, 2),
            },
        )
        return response

    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_allowed_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
        expose_headers=["X-Request-ID"],
    )
    return application


app = create_app()
