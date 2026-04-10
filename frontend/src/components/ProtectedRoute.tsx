import { Navigate, Outlet } from "react-router-dom"
import { useAuthContext } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
