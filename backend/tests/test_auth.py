from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(async_client: AsyncClient):
    unique = uuid4().hex[:8]
    payload = {
        "name": "Alice",
        "email": f"alice_{unique}@example.com",
        "password": "secret123",
    }
    resp = await async_client.post("/auth/register", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "token" in data
    assert "user" in data
    assert "id" in data["user"]
    assert data["user"]["name"] == "Alice"
    assert data["user"]["email"] == payload["email"]


@pytest.mark.asyncio
async def test_register_duplicate_email(async_client: AsyncClient):
    unique = uuid4().hex[:8]
    payload = {
        "name": "Bob",
        "email": f"bob_{unique}@example.com",
        "password": "secret123",
    }
    resp1 = await async_client.post("/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = await async_client.post("/auth/register", json=payload)
    assert resp2.status_code == 409
    assert resp2.json() == {"error": "email already registered"}


@pytest.mark.asyncio
async def test_register_validation_error(async_client: AsyncClient):
    resp = await async_client.post("/auth/register", json={})
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"] == "validation failed"
    assert "fields" in data
    assert isinstance(data["fields"], dict)


@pytest.mark.asyncio
async def test_login_success(async_client: AsyncClient):
    unique = uuid4().hex[:8]
    register_payload = {
        "name": "Carol",
        "email": f"carol_{unique}@example.com",
        "password": "secret123",
    }
    await async_client.post("/auth/register", json=register_payload)

    login_payload = {
        "email": register_payload["email"],
        "password": "secret123",
    }
    resp = await async_client.post("/auth/login", json=login_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert "user" in data
    assert data["user"]["email"] == register_payload["email"]


@pytest.mark.asyncio
async def test_login_invalid_password(async_client: AsyncClient):
    unique = uuid4().hex[:8]
    register_payload = {
        "name": "Dave",
        "email": f"dave_{unique}@example.com",
        "password": "secret123",
    }
    await async_client.post("/auth/register", json=register_payload)

    login_payload = {
        "email": register_payload["email"],
        "password": "wrong_password",
    }
    resp = await async_client.post("/auth/login", json=login_payload)
    assert resp.status_code == 401
    assert resp.json() == {"error": "invalid credentials"}
