import { useToast } from "@/hooks/use-toast"
import { Toast } from "@/components/ui/toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={dismiss} />
      ))}
    </div>
  )
}
