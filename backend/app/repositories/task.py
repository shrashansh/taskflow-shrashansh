import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.models.user import User


class TaskRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, task_id: uuid.UUID) -> Task | None:
        result = await self.session.execute(
            select(Task).where(Task.id == task_id)
        )
        return result.scalar_one_or_none()

    async def list_by_project(
        self,
        project_id: uuid.UUID,
        status_filter: str | None,
        assignee_filter: uuid.UUID | None,
        page: int,
        limit: int,
    ) -> tuple[list[Task], int]:
        base = select(Task).where(Task.project_id == project_id)
        count_base = (
            select(func.count())
            .select_from(Task)
            .where(Task.project_id == project_id)
        )

        if status_filter:
            base = base.where(Task.status == status_filter)
            count_base = count_base.where(Task.status == status_filter)
        if assignee_filter:
            base = base.where(Task.assignee_id == assignee_filter)
            count_base = count_base.where(Task.assignee_id == assignee_filter)

        total = (await self.session.execute(count_base)).scalar_one()

        offset = (page - 1) * limit
        result = await self.session.execute(
            base.order_by(Task.created_at.desc()).offset(offset).limit(limit)
        )
        tasks = list(result.scalars().all())
        return tasks, total

    async def create(
        self,
        title: str,
        description: str | None,
        status: str,
        priority: str,
        project_id: uuid.UUID,
        assignee_id: uuid.UUID | None,
        due_date: date | None,
        created_by: uuid.UUID | None = None,
    ) -> Task:
        task = Task(
            title=title,
            description=description,
            status=status,
            priority=priority,
            project_id=project_id,
            assignee_id=assignee_id,
            due_date=due_date,
            created_by=created_by,
        )
        self.session.add(task)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def update(self, task: Task, **fields: object) -> Task:
        for key, value in fields.items():
            setattr(task, key, value)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def delete(self, task: Task) -> None:
        await self.session.delete(task)
        await self.session.commit()

    async def get_stats_by_project(self, project_id: uuid.UUID) -> dict:
        # Count by status
        status_result = await self.session.execute(
            select(Task.status, func.count())
            .where(Task.project_id == project_id)
            .group_by(Task.status)
        )
        by_status = {row[0]: row[1] for row in status_result.all()}

        # Count by assignee with name
        assignee_result = await self.session.execute(
            select(User.id, User.name, func.count())
            .join(Task, Task.assignee_id == User.id)
            .where(Task.project_id == project_id)
            .group_by(User.id, User.name)
        )
        by_assignee = [
            {"user_id": row[0], "name": row[1], "count": row[2]}
            for row in assignee_result.all()
        ]

        return {"by_status": by_status, "by_assignee": by_assignee}
