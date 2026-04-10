import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import ForbiddenException, NotFoundException
from app.repositories.project import ProjectRepository
from app.schemas.project import (
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectResponse,
)


class ProjectService:
    def __init__(self, session: AsyncSession):
        self.repo = ProjectRepository(session)

    async def list_projects(
        self, user_id: uuid.UUID, page: int = 1, limit: int = 20
    ) -> ProjectListResponse:
        projects, total = await self.repo.list_for_user(user_id, page, limit)
        return ProjectListResponse(
            projects=[ProjectResponse.model_validate(p) for p in projects],
            total=total,
            page=page,
            limit=limit,
        )

    async def get_project(self, project_id: uuid.UUID) -> ProjectDetailResponse:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("project not found")
        return ProjectDetailResponse.model_validate(project)

    async def create_project(
        self, name: str, description: str | None, owner_id: uuid.UUID
    ) -> ProjectResponse:
        project = await self.repo.create(name, description, owner_id)
        return ProjectResponse.model_validate(project)

    async def update_project(
        self, project_id: uuid.UUID, user_id: uuid.UUID, **fields: object
    ) -> ProjectResponse:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("project not found")
        if project.owner_id != user_id:
            raise ForbiddenException("not project owner")
        # Filter out None values so we only update provided fields
        updates = {k: v for k, v in fields.items() if v is not None}
        if updates:
            project = await self.repo.update(project, **updates)
        return ProjectResponse.model_validate(project)

    async def delete_project(
        self, project_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("project not found")
        if project.owner_id != user_id:
            raise ForbiddenException("not project owner")
        await self.repo.delete(project)
