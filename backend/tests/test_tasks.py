from uuid import uuid4

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project_unauthorized(async_client: AsyncClient):
    resp = await async_client.post(
        "/projects", json={"name": "Unauthorized Project"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_full_task_lifecycle(async_client: AsyncClient):
    # Register a user and get token
    unique = uuid4().hex[:8]
    reg_resp = await async_client.post(
        "/auth/register",
        json={
            "name": f"Lifecycle User {unique}",
            "email": f"lifecycle_{unique}@example.com",
            "password": "secret123",
        },
    )
    assert reg_resp.status_code == 201
    token = reg_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create a project
    project_resp = await async_client.post(
        "/projects",
        json={"name": "Lifecycle Project", "description": "Testing full lifecycle"},
        headers=headers,
    )
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    # Create a task
    task_resp = await async_client.post(
        f"/projects/{project_id}/tasks",
        json={
            "title": "Lifecycle Task",
            "priority": "high",
        },
        headers=headers,
    )
    assert task_resp.status_code == 201
    task_data = task_resp.json()
    task_id = task_data["id"]
    assert task_data["status"] == "todo"
    assert task_data["priority"] == "high"

    # Update the task status to "done"
    update_resp = await async_client.patch(
        f"/tasks/{task_id}",
        json={"status": "done"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "done"

    # Get the project and verify the task status
    get_resp = await async_client.get(
        f"/projects/{project_id}",
        headers=headers,
    )
    assert get_resp.status_code == 200
    project_detail = get_resp.json()
    tasks = project_detail["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["status"] == "done"

    # Delete the task
    delete_resp = await async_client.delete(
        f"/tasks/{task_id}",
        headers=headers,
    )
    assert delete_resp.status_code == 204
