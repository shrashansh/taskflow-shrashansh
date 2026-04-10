import { useCallback, useEffect, useState } from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

let toastCount = 0
const listeners: Array<(toasts: Toast[]) => void> = []
let memoryToasts: Toast[] = []

function dispatch(toasts: Toast[]) {
  memoryToasts = toasts
  for (const listener of listeners) {
    listener(toasts)
  }
}

export function toast({ title, description, variant = "default" }: Omit<Toast, "id">) {
  const id = String(toastCount++)
  const newToast: Toast = { id, title, description, variant }
  dispatch([...memoryToasts, newToast])

  setTimeout(() => {
    dispatch(memoryToasts.filter((t) => t.id !== id))
  }, 4000)
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryToasts)

  useEffect(() => {
    listeners.push(setToasts)
    return () => {
      const idx = listeners.indexOf(setToasts)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    dispatch(memoryToasts.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}
