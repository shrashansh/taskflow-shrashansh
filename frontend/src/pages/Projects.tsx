import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { FolderOpen, Loader2, Plus } from "lucide-react"
import { useProjects } from "@/hooks/useProjects"
import { toast } from "@/hooks/use-toast"
import client from "@/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import type { ApiError, Project } from "@/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function Projects() {
  const { projects, loading, refetch } = useProjects()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await client.post<Project>("/projects", {
        name: name.trim(),
        description: description.trim() || null,
      })
      setOpen(false)
      setName("")
      setDescription("")
      toast({ title: "Project created" })
      await refetch()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as ApiError
        setError(data.error || "Failed to create project")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="mb-3 h-5 w-3/4" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-1 text-lg font-semibold">No projects yet</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first project to get started
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-base">{p.name}</CardTitle>
                {p.description && (
                  <CardDescription className="line-clamp-2">
                    {p.description}
                  </CardDescription>
                )}
                <p className="pt-2 text-xs text-muted-foreground">
                  Created {formatDate(p.created_at)}
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-2">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="project-name">Name</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  placeholder="My Project"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-desc">Description (optional)</Label>
                <Input
                  id="project-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  placeholder="What is this project about?"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
