import { useCallback, useEffect, useState } from "react"
import client from "@/api/client"
import type { Task, TaskListResponse } from "@/types"

export function useTasks(
  projectId: string,
  status?: string,
  assignee?: string,
  page = 1,
  limit = 20,
) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await client.get<TaskListResponse>(
        `/projects/${projectId}/tasks`,
        { params: { status, assignee, page, limit } },
      )
      setTasks(data.tasks)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [projectId, status, assignee, page, limit])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { tasks, total, loading, refetch: fetch }
}
