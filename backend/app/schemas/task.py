from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CreateTaskRequest(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    status: Literal["todo", "in_progress", "done"] | None = None
    priority: Literal["low", "medium", "high"] | None = None
    assignee_id: UUID | None = None
    due_date: date | None = None


class UpdateTaskRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    status: Literal["todo", "in_progress", "done"] | None = None
    priority: Literal["low", "medium", "high"] | None = None
    assignee_id: UUID | None = None
    due_date: date | None = None


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    status: str
    priority: str
    project_id: UUID
    assignee_id: UUID | None
    created_by: UUID
    due_date: date | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int
    page: int
    limit: int
