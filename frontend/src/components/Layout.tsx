import { Outlet } from "react-router-dom"
import Navbar from "@/components/Navbar"

export default function Layout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
