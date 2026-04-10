# TaskFlow

Full stack task management app. FastAPI backend, React frontend, Postgres database, all running in Docker.

## What It Does

Users sign up, create projects, then manage tasks on a Kanban board (drag cards between Todo, In Progress, Done). Has JWT auth, project ownership controls, dark mode, and optimistic UI so status changes feel instant.

## Tech

Backend is Python 3.12 with FastAPI, async SQLAlchemy, Alembic migrations, and PostgreSQL 16. Frontend is React 19, TypeScript, Vite, Tailwind CSS with shadcn/ui components, and dnd-kit for drag and drop. Everything runs in Docker Compose with Nginx reverse proxying the frontend.

## Quick Start

```bash
git clone https://github.com/shrashansh/taskflow-shrashansh.git
cd taskflow-shrashansh
cp .env.example .env
docker compose up --build
```

Then open http://localhost:3000. A demo account gets seeded automatically on first boot:

Email: `test@example.com`
Password: `password123`

The backend API is at http://localhost:8000 and Swagger docs are at http://localhost:8000/docs.

## Why These Choices

I went with FastAPI over Flask because I didn't want to bolt on a bunch of extensions just to get async support, request validation, and API docs. FastAPI gives you all three out of the box. Pydantic handles validation right in the route signatures, and Swagger docs generate themselves from the type hints. Less plumbing, more building.

The backend follows a routes/services/repositories split. Routes deal with HTTP, services hold the actual logic, repositories handle database queries. I like this because it keeps each piece focused on one job. If I need to change how tasks are fetched from the database, I only touch the repository. The service layer doesn't care. It also makes testing straightforward since you can test business logic without spinning up a database.

I used Alembic for migrations instead of letting SQLAlchemy auto create tables. Auto create works fine until you need to add a column to a table that already has data in it, and then you're stuck. With Alembic I have explicit migration files I can review, and each one has an upgrade and downgrade path. The second migration (adding created_by to tasks) is a good example of why this matters.

For the frontend, I picked shadcn/ui because the components copy directly into your project. You're not locked into some library's API or fighting overrides when you need to tweak something. They're built on Radix primitives so accessibility is handled, and they work well with Tailwind which I was already using for styling.

The Kanban board uses optimistic updates. When you drag a card or click a status button, the UI moves immediately and fires the API call in the background. If the call fails, it snaps back. Without this the board feels slow because you're waiting on a network round trip for every card move.

I stored auth tokens in localStorage. This is the simpler approach for an SPA. In production you'd want httpOnly cookies with refresh token rotation to protect against XSS, but for the scope of this project localStorage keeps the auth flow straightforward.

Pagination is offset based (page number + page size). Cursor based pagination scales better for large datasets, but with the data volumes in a task management app this is fine. If the task list grew to thousands of items I'd switch to cursors.

## Project Layout

```
backend/
  app/
    main.py           FastAPI app setup, CORS, lifespan
    config.py          Pydantic settings loaded from env
    database.py        Async SQLAlchemy engine and sessions
    exceptions.py      Custom error classes and handlers
    models/            SQLAlchemy models (User, Project, Task)
    schemas/           Pydantic request/response schemas
    routes/            Thin route handlers
    services/          Business logic
    repositories/      Database queries
    middleware/        JWT auth dependency
  alembic/             Migration files
  seeds/               Demo data seeder
  tests/               Integration tests

frontend/
  src/
    api/               Axios client with auth interceptors
    contexts/          React auth context
    hooks/             useAuth, useProjects, useTasks
    components/        UI components and shadcn primitives
    pages/             Login, Register, Projects, ProjectDetail
    types/             TypeScript interfaces
```

## API

**Auth (no token needed)**
- POST /auth/register creates an account, returns JWT
- POST /auth/login validates credentials, returns JWT

**Projects (token required)**
- GET /projects returns the current user's projects (owned or assigned tasks)
- POST /projects creates a project
- GET /projects/:id returns project with all its tasks
- PATCH /projects/:id updates name/description (owner only)
- DELETE /projects/:id deletes project and all tasks (owner only)
- GET /projects/:id/stats returns task counts by status and assignee

**Tasks (token required)**
- GET /projects/:id/tasks lists tasks with optional status/assignee filters
- POST /projects/:id/tasks creates a task
- PATCH /tasks/:id updates any task fields
- DELETE /tasks/:id deletes a task (project owner or task creator only)

**Health**
- GET /health returns {"status": "ok"}

## Database

Three tables, all with UUID primary keys:

**users** has name, email (unique, indexed), password (bcrypt hash), and created_at.

**projects** has name, description, owner_id pointing to users, and created_at.

**tasks** has title, description, status (todo/in_progress/done), priority (low/medium/high), project_id (cascading delete), assignee_id, created_by, due_date, created_at, updated_at. Status column is indexed for filtering.

Two Alembic migrations: 0001 creates the initial schema, 0002 adds the created_by column to tasks.

## Environment Variables

```
POSTGRES_USER=shrashansh
POSTGRES_PASSWORD=shrashansh_secret
POSTGRES_DB=shrashansh
DATABASE_URL=postgresql://shrashansh:shrashansh_secret@db:5432/shrashansh
JWT_SECRET=change-me-to-a-long-random-string-in-production
JWT_EXPIRY_HOURS=24
BCRYPT_COST=12
VITE_API_URL=/api
```

Copy .env.example to .env before running. Change JWT_SECRET for anything beyond local dev.

## Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Covers registration (success, duplicate emails, validation), login (success, wrong password), authorization (401 without token), and a full task lifecycle test that creates a project, adds a task, updates its status, verifies through the API, and deletes it.

## Features

JWT auth with bcrypt password hashing. Kanban board with drag and drop between columns. Optimistic status updates that revert on failure. Dark mode with system preference detection. Responsive from 375px mobile to 1280px desktop. Role based access where project owners can edit/delete projects and only owners or task creators can delete tasks. Auto seeded demo data on first boot.

## What I'd Do With More Time

The biggest thing I'd add is proper role based access control. Right now it's just "owner or not owner" for projects. In a real app you'd want roles like admin, editor, viewer with granular permissions per project.

I'd also add WebSocket support so that if two people are looking at the same project board, task updates show up in real time without refreshing. Right now you have to reload to see changes someone else made.

The test coverage is decent for the core flows but I'd want end to end tests with Playwright that actually click through the UI. Integration tests catch API issues but miss things like a broken modal or a redirect that doesn't fire.

Rate limiting on the auth endpoints is something I skipped entirely. In production you'd want to throttle login attempts to prevent brute forcing. A sliding window with Redis would be the way to go.

I'd set up a CI pipeline with GitHub Actions to run linting, type checks, and tests on every push. Right now you have to run tests manually.

For deployment, the app is already fully Dockerized so hosting it on something like Railway with a managed Postgres would be pretty straightforward. The environment variable setup is already there, it's really just a matter of pointing the services at a cloud database instead of the local one.

Task comments and an activity log would be nice too. Being able to see who changed what and when gives you accountability and makes it easier to understand why a task is in its current state.
