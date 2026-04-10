from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.task import (
    CreateTaskRequest,
    TaskListResponse,
    TaskResponse,
    UpdateTaskRequest,
)
from app.services.task import TaskService

router = APIRouter(tags=["tasks"])


@router.get("/projects/{project_id}/tasks", response_model=TaskListResponse)
async def list_tasks(
    project_id: UUID,
    status: str | None = Query(None),
    assignee: UUID | None = None,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    service = TaskService(session)
    return await service.list_tasks(project_id, status, assignee, page, limit)


@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_task(
    project_id: UUID,
    body: CreateTaskRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    service = TaskService(session)
    return await service.create_task(
        project_id=project_id,
        title=body.title,
        description=body.description,
        status=body.status,
        priority=body.priority,
        assignee_id=body.assignee_id,
        due_date=body.due_date,
        created_by=current_user.id,
    )


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    body: UpdateTaskRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    service = TaskService(session)
    return await service.update_task(
        task_id,
        current_user.id,
        title=body.title,
        description=body.description,
        status=body.status,
        priority=body.priority,
        assignee_id=body.assignee_id,
        due_date=body.due_date,
    )


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    service = TaskService(session)
    await service.delete_task(task_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
