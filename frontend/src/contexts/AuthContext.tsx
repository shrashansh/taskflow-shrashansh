import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useNavigate } from "react-router-dom"
import client from "@/api/client"
import type { AuthResponse, User } from "@/types"

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user")
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser) as User)
      } catch {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
      }
    }
    setLoading(false)
  }, [])

  const saveAuth = useCallback((data: AuthResponse) => {
    localStorage.setItem("token", data.token)
    localStorage.setItem("user", JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await client.post<AuthResponse>("/auth/login", {
        email,
        password,
      })
      saveAuth(data)
    },
    [saveAuth],
  )

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { data } = await client.post<AuthResponse>("/auth/register", {
        name,
        email,
        password,
      })
      saveAuth(data)
    },
    [saveAuth],
  )

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
    navigate("/login")
  }, [navigate])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      loading,
      login,
      register,
      logout,
    }),
    [user, token, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider")
  return ctx
}
