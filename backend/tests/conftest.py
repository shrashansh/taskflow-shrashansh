from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.main import app


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def registered_user(async_client: AsyncClient) -> dict:
    unique = uuid4().hex[:8]
    payload = {
        "name": f"User {unique}",
        "email": f"test_{unique}@example.com",
        "password": "password123",
    }
    resp = await async_client.post("/auth/register", json=payload)
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture
async def auth_headers(registered_user: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {registered_user['token']}"}
