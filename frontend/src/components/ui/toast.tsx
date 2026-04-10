import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import type { Toast as ToastType } from "@/hooks/use-toast"

interface ToastProps extends ToastType {
  onDismiss: (id: string) => void
}

export function Toast({ id, title, description, variant = "default", onDismiss }: ToastProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 shadow-lg transition-all",
        variant === "destructive"
          ? "border-destructive bg-destructive text-white"
          : "border bg-background text-foreground",
      )}
    >
      <div className="grid gap-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="rounded-md p-1 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
