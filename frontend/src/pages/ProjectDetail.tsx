import { type FormEvent, useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import axios from "axios"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  ArrowLeft,
  Calendar,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  User as UserIcon,
} from "lucide-react"
import { useAuthContext } from "@/contexts/AuthContext"
import { useProject } from "@/hooks/useProjects"
import { useUsers } from "@/hooks/useUsers"
import { toast } from "@/hooks/use-toast"
import client from "@/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { ApiError, Task, User } from "@/types"

const STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString())
}

// ─── Task Card (inner content, reused by drag overlay) ───────────
function TaskCardContent({ task, allUsers = [] }: { task: Task; allUsers?: User[] }) {
  return (
    <CardContent className="p-4">
      <p className="mb-1 font-medium leading-snug">{task.title}</p>
      {task.description && (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={PRIORITY_COLORS[task.priority]}>
          {task.priority}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {STATUS_LABELS[task.status]}
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {task.assignee_id ? (
          <span className="flex items-center gap-1">
            <UserIcon className="h-3 w-3" /> {allUsers.find((u) => u.id === task.assignee_id)?.name ?? "Assigned"}
          </span>
        ) : (
          <span className="italic">Unassigned</span>
        )}
        {task.due_date && (
          <span
            className={`flex items-center gap-1 ${isOverdue(task.due_date) && task.status !== "done" ? "font-medium text-red-600" : ""}`}
          >
            <Calendar className="h-3 w-3" />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </CardContent>
  )
}

// ─── Draggable Task Card ─────────────────────────────────────────
function DraggableTaskCard({
  task,
  onEdit,
  isDragActive,
  allUsers,
}: {
  task: Task
  onEdit: (t: Task) => void
  isDragActive: boolean
  allUsers: User[]
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  return (
    <Card
      ref={setNodeRef}
      className={`cursor-pointer transition-shadow hover:shadow-md ${
        isDragging ? "opacity-30" : ""
      } ${isDragActive && !isDragging ? "transition-transform" : ""}`}
      onClick={() => {
        if (!isDragging) onEdit(task)
      }}
    >
      <div className="flex">
        <div
          {...listeners}
          {...attributes}
          className="flex shrink-0 cursor-grab items-center px-1.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <TaskCardContent task={task} allUsers={allUsers} />
        </div>
      </div>
    </Card>
  )
}

// ─── Droppable Kanban Column ─────────────────────────────────────
function KanbanColumn({
  status,
  tasks,
  onEdit,
  isDragActive,
  allUsers,
}: {
  status: string
  tasks: Task[]
  onEdit: (t: Task) => void
  isDragActive: boolean
  allUsers: User[]
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status })

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold">{STATUS_LABELS[status]}</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex max-h-[60vh] flex-1 flex-col gap-3 overflow-y-auto rounded-lg p-3 transition-colors md:min-h-[200px] ${
          isOver
            ? "bg-accent/60 ring-2 ring-ring"
            : "bg-muted/40"
        }`}
      >
        {tasks.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {isOver ? "Drop here" : "No tasks"}
          </p>
        )}
        {tasks.map((t) => (
          <DraggableTaskCard
            key={t.id}
            task={t}
            onEdit={onEdit}
            isDragActive={isDragActive}
            allUsers={allUsers}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Create / Edit Task Modal ────────────────────────────────────
function TaskModal({
  open,
  onOpenChange,
  task,
  projectId,
  onSuccess,
  allUsers,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  task: Task | null
  projectId: string
  onSuccess: () => void
  allUsers: User[]
}) {
  const isEdit = task !== null

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<string>("todo")
  const [priority, setPriority] = useState<string>("medium")
  const [assigneeId, setAssigneeId] = useState<string>("")
  const [dueDate, setDueDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title)
        setDescription(task.description ?? "")
        setStatus(task.status)
        setPriority(task.priority)
        setAssigneeId(task.assignee_id ?? "")
        setDueDate(task.due_date ?? "")
      } else {
        setTitle("")
        setDescription("")
        setStatus("todo")
        setPriority("medium")
        setAssigneeId("")
        setDueDate("")
      }
      setError("")
      setConfirmDelete(false)
    }
  }, [open, task])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError("Title is required")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
      }
      if (isEdit) {
        await client.patch(`/tasks/${task.id}`, payload)
        toast({ title: "Task updated" })
      } else {
        await client.post(`/projects/${projectId}/tasks`, payload)
        toast({ title: "Task created" })
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError
        setError(data.error || "Something went wrong")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    setDeleting(true)
    try {
      await client.delete(`/tasks/${task.id}`)
      toast({ title: "Task deleted" })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError
        setError(data.error || "Failed to delete")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                placeholder="Task title"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description (optional)</Label>
              <Input
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                placeholder="Details about this task"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Due date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            {isEdit && !confirmDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={submitting || deleting}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            {isEdit && confirmDelete && (
              <div className="mr-auto flex items-center gap-2">
                <span className="text-sm text-destructive">Confirm?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Yes, delete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
            <Button type="submit" disabled={submitting || deleting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Project Modal ──────────────────────────────────────────
function EditProjectModal({
  open,
  onOpenChange,
  projectId,
  currentName,
  currentDescription,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  currentName: string
  currentDescription: string | null
  onSuccess: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setName(currentName)
      setDescription(currentDescription ?? "")
      setError("")
    }
  }, [open, currentName, currentDescription])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await client.patch(`/projects/${projectId}`, {
        name: name.trim(),
        description: description.trim() || null,
      })
      toast({ title: "Project updated" })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError
        setError(data.error || "Failed to update")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description (optional)</Label>
              <Input
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Project Dialog ───────────────────────────────────────
function DeleteProjectDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
}) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await client.delete(`/projects/${projectId}`)
      toast({ title: "Project deleted" })
      navigate("/projects")
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError
        toast({ title: "Error", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Error", description: "Failed to delete project", variant: "destructive" })
      }
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            Are you sure? All tasks in this project will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ───────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthContext()
  const { project, loading, refetch } = useProject(id!)
  const { users: allUsers } = useUsers()

  // Local tasks state for optimistic updates
  const [localTasks, setLocalTasks] = useState<Task[]>([])
  useEffect(() => {
    if (project) setLocalTasks(project.tasks)
  }, [project])

  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const isOwner = project && user ? project.owner_id === user.id : false

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const openCreateTask = useCallback(() => {
    setEditingTask(null)
    setTaskModalOpen(true)
  }, [])

  const openEditTask = useCallback((t: Task) => {
    setEditingTask(t)
    setTaskModalOpen(true)
  }, [])

  // Optimistic status change (used by both dropdown and drag-and-drop)
  const handleStatusChange = useCallback(
    async (task: Task, newStatus: Task["status"]) => {
      if (task.status === newStatus) return
      const prev = [...localTasks]
      setLocalTasks((ts) =>
        ts.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
      )
      try {
        await client.patch(`/tasks/${task.id}`, { status: newStatus })
      } catch {
        setLocalTasks(prev)
        toast({ title: "Failed to update status", variant: "destructive" })
      }
    },
    [localTasks],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = (event.active.data.current as { task: Task } | undefined)?.task ?? null
    setActiveTask(task)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null)
      const { active, over } = event
      if (!over) return

      const task = (active.data.current as { task: Task } | undefined)?.task
      if (!task) return

      const newStatus = over.id as Task["status"]
      if (task.status !== newStatus) {
        void handleStatusChange(task, newStatus)
      }
    },
    [handleStatusChange],
  )

  // Filter tasks
  const filtered = localTasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false
    if (assigneeFilter !== "all" && assigneeFilter !== "me" && t.assignee_id !== assigneeFilter) return false
    if (assigneeFilter === "me" && t.assignee_id !== user?.id) return false
    return true
  })

  const columns: Task["status"][] = ["todo", "in_progress", "done"]

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-2 h-8 w-1/3" />
        <Skeleton className="mb-6 h-4 w-1/2" />
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((c) => (
            <div key={c} className="space-y-3 rounded-lg bg-muted/40 p-3">
              <Skeleton className="h-5 w-20" />
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-md" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="py-20 text-center">
        <h2 className="mb-2 text-lg font-semibold">Project not found</h2>
        <Button asChild variant="outline">
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/projects"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditProjectOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteProjectOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
            <Button size="sm" onClick={openCreateTask}>
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="me">Assigned to me</SelectItem>
            {allUsers
              .filter((u) => u.id !== user?.id)
              .map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban with DnD */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((col) => (
            <KanbanColumn
              key={col}
              status={col}
              tasks={filtered.filter((t) => t.status === col)}
              onEdit={openEditTask}
              isDragActive={activeTask !== null}
              allUsers={allUsers}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <Card className="w-72 rotate-3 shadow-xl">
              <TaskCardContent task={activeTask} allUsers={allUsers} />
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        task={editingTask}
        projectId={project.id}
        onSuccess={refetch}
        allUsers={allUsers}
      />
      <EditProjectModal
        open={editProjectOpen}
        onOpenChange={setEditProjectOpen}
        projectId={project.id}
        currentName={project.name}
        currentDescription={project.description}
        onSuccess={refetch}
      />
      <DeleteProjectDialog
        open={deleteProjectOpen}
        onOpenChange={setDeleteProjectOpen}
        projectId={project.id}
      />
    </div>
  )
}
