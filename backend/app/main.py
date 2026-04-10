from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.exceptions import register_exception_handlers

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting TaskFlow API")
    yield
    await engine.dispose()
    logger.info("Shut down TaskFlow API")


app = FastAPI(title="TaskFlow API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

from app.routes.auth import router as auth_router
from app.routes.projects import router as projects_router
from app.routes.tasks import router as tasks_router
from app.routes.users import router as users_router

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(tasks_router)
app.include_router(users_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
