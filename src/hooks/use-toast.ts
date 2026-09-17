'use client'

import { useState, useCallback } from 'react'

type ToastVariant = 'default' | 'destructive' | 'success'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

let toastState: Toast[] = []
let listeners: Array<(toasts: Toast[]) => void> = []

function notify() {
  listeners.forEach((l) => l([...toastState]))
}

export function toast(options: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  toastState = [...toastState, { ...options, id }]
  notify()
  setTimeout(() => {
    toastState = toastState.filter((t) => t.id !== id)
    notify()
  }, 5000)
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastState)

  const subscribe = useCallback((listener: (toasts: Toast[]) => void) => {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  useState(() => {
    const unsubscribe = subscribe(setToasts)
    return unsubscribe
  })

  const dismiss = useCallback((id: string) => {
    toastState = toastState.filter((t) => t.id !== id)
    notify()
  }, [])

  return { toasts, dismiss }
}
