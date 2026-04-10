from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.task import TaskResponse


class CreateProjectRequest(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None


class UpdateProjectRequest(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    owner_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectDetailResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    owner_id: UUID
    created_at: datetime
    tasks: list[TaskResponse]

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
    page: int
    limit: int


class AssigneeStats(BaseModel):
    user_id: UUID
    name: str
    count: int


class ProjectStatsResponse(BaseModel):
    by_status: dict[str, int]
    by_assignee: list[AssigneeStats]
