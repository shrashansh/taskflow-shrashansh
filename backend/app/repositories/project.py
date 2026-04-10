import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.models.task import Task


class ProjectRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, project_id: uuid.UUID) -> Project | None:
        result = await self.session.execute(
            select(Project)
            .options(selectinload(Project.tasks))
            .where(Project.id == project_id)
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self, user_id: uuid.UUID, page: int, limit: int
    ) -> tuple[list[Project], int]:
        # Projects where user is owner OR has tasks assigned
        base_filter = or_(
            Project.owner_id == user_id,
            Project.id.in_(
                select(Task.project_id).where(Task.assignee_id == user_id)
            ),
        )

        count_result = await self.session.execute(
            select(func.count()).select_from(Project).where(base_filter)
        )
        total = count_result.scalar_one()

        offset = (page - 1) * limit
        result = await self.session.execute(
            select(Project)
            .where(base_filter)
            .order_by(Project.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        projects = list(result.scalars().all())
        return projects, total

    async def create(
        self, name: str, description: str | None, owner_id: uuid.UUID
    ) -> Project:
        project = Project(name=name, description=description, owner_id=owner_id)
        self.session.add(project)
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def update(self, project: Project, **fields: object) -> Project:
        for key, value in fields.items():
            setattr(project, key, value)
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def delete(self, project: Project) -> None:
        await self.session.delete(project)
        await self.session.commit()
