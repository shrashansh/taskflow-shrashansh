import { useCallback, useEffect, useState } from "react"
import client from "@/api/client"
import type { Project, ProjectDetail, ProjectListResponse } from "@/types"

export function useProjects(page = 1, limit = 20) {
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await client.get<ProjectListResponse>("/projects", {
        params: { page, limit },
      })
      setProjects(data.projects)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { projects, total, loading, refetch: fetch }
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await client.get<ProjectDetail>(`/projects/${projectId}`)
      setProject(data)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { project, loading, refetch: fetch }
}
