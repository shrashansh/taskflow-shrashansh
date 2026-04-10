import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.user import Base


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (Index("ix_tasks_status", "status"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="todo")
    priority: Mapped[str] = mapped_column(String, nullable=False, default="medium")
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    project = relationship("Project", back_populates="tasks", lazy="selectin")
    assignee = relationship("User", foreign_keys=[assignee_id], backref="assigned_tasks", lazy="selectin")
    creator = relationship("User", foreign_keys=[created_by], backref="created_tasks", lazy="selectin")
