import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import ProtectedRoute from "@/components/ProtectedRoute"
import Layout from "@/components/Layout"
import Login from "@/pages/Login"
import Register from "@/pages/Register"
import Projects from "@/pages/Projects"
import ProjectDetail from "@/pages/ProjectDetail"
import NotFound from "@/pages/NotFound"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
