import { useCallback, useEffect, useState } from "react"
import client from "@/api/client"
import type { User } from "@/types"

interface UserListResponse {
  users: User[]
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await client.get<UserListResponse>("/users")
      setUsers(data.users)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { users, loading }
}
