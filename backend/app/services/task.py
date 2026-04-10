import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import ForbiddenException, NotFoundException
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.schemas.project import ProjectStatsResponse
from app.schemas.task import TaskListResponse, TaskResponse


class TaskService:
    def __init__(self, session: AsyncSession):
        self.repo = TaskRepository(session)
        self.project_repo = ProjectRepository(session)

    async def list_tasks(
        self,
        project_id: uuid.UUID,
        status: str | None = None,
        assignee_id: uuid.UUID | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> TaskListResponse:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("project not found")
        tasks, total = await self.repo.list_by_project(
            project_id, status, assignee_id, page, limit
        )
        return TaskListResponse(
            tasks=[TaskResponse.model_validate(t) for t in tasks],
            total=total,
            page=page,
            limit=limit,
        )

    async def create_task(
        self,
        project_id: uuid.UUID,
        title: str,
        description: str | None,
        status: str | None,
        priority: str | None,
        assignee_id: uuid.UUID | None,
        due_date: date | None,
        created_by: uuid.UUID | None = None,
    ) -> TaskResponse:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("project not found")
        task = await self.repo.create(
            title=title,
            description=description,
            status=status or "todo",
            priority=priority or "medium",
            project_id=project_id,
            assignee_id=assignee_id,
            due_date=due_date,
            created_by=created_by,
        )
        return TaskResponse.model_validate(task)

    async def update_task(
        self, task_id: uuid.UUID, user_id: uuid.UUID, **fields: object
    ) -> TaskResponse:
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("task not found")
        updates = {k: v for k, v in fields.items() if v is not None}
        if updates:
            task = await self.repo.update(task, **updates)
        return TaskResponse.model_validate(task)

    async def delete_task(
        self, task_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("task not found")
        if task.project.owner_id != user_id and task.created_by != user_id:
            raise ForbiddenException("not authorized to delete this task")
        await self.repo.delete(task)

    async def get_project_stats(
        self, project_id: uuid.UUID
    ) -> ProjectStatsResponse:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("project not found")
        stats = await self.repo.get_stats_by_project(project_id)
        return ProjectStatsResponse(**stats)
