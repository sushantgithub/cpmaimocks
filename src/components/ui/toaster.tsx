'use client'

import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'relative flex items-start gap-3 rounded-lg border p-4 shadow-lg bg-white text-sm animate-in slide-in-from-bottom-4',
            toast.variant === 'destructive' && 'border-red-200 bg-red-50 text-red-900',
            toast.variant === 'success' && 'border-green-200 bg-green-50 text-green-900'
          )}
        >
          <div className="flex-1">
            {toast.title && <p className="font-semibold">{toast.title}</p>}
            {toast.description && <p className="mt-0.5 text-muted-foreground">{toast.description}</p>}
          </div>
          <button onClick={() => dismiss(toast.id)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
