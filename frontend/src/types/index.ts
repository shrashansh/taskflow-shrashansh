export interface User {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Project {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
}

export interface ProjectDetail extends Project {
  tasks: Task[]
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: "todo" | "in_progress" | "done"
  priority: "low" | "medium" | "high"
  project_id: string
  assignee_id: string | null
  created_by: string
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  total: number
  page: number
  limit: number
  items?: T[]
}

export interface ProjectListResponse extends PaginatedResponse<Project> {
  projects: Project[]
}

export interface TaskListResponse extends PaginatedResponse<Task> {
  tasks: Task[]
}

export interface ProjectStats {
  by_status: Record<string, number>
  by_assignee: { user_id: string; name: string; count: number }[]
}

export interface ApiError {
  error: string
  fields?: Record<string, string>
}
