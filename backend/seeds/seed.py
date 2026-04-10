"""Seed script — creates initial test data."""

import asyncio
import sys
from datetime import date
from pathlib import Path

# Ensure the backend directory is on sys.path so `app` is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from passlib.context import CryptContext
from sqlalchemy import select

from app.database import async_session_factory, engine
from app.models.project import Project
from app.models.task import Task
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


async def seed() -> None:
    print("Seeding...")

    async with async_session_factory() as session:
        # Check if seed data already exists
        result = await session.execute(
            select(User).where(User.email == "test@example.com")
        )
        if result.scalar_one_or_none() is not None:
            print("Seed data already exists, skipping.")
            return

        # Create user
        hashed_password = pwd_context.hash("password123")
        user = User(
            name="Test User",
            email="test@example.com",
            password=hashed_password,
        )
        session.add(user)
        await session.flush()

        # Create project
        project = Project(
            name="Sample Project",
            description="A demo project for testing",
            owner_id=user.id,
        )
        session.add(project)
        await session.flush()

        # Create tasks
        task1 = Task(
            title="Design mockups",
            status="todo",
            priority="high",
            project_id=project.id,
            assignee_id=user.id,
            created_by=user.id,
            due_date=date(2026, 4, 20),
        )
        task2 = Task(
            title="Build API",
            status="in_progress",
            priority="medium",
            project_id=project.id,
            assignee_id=user.id,
            created_by=user.id,
        )
        task3 = Task(
            title="Write docs",
            status="done",
            priority="low",
            project_id=project.id,
            created_by=user.id,
        )
        session.add_all([task1, task2, task3])
        await session.commit()

    await engine.dispose()
    print("Done.")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
