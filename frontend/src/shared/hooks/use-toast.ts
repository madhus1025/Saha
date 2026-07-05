import { useState, useCallback } from 'react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

let toastCount = 0
const listeners: Array<(state: ToastState) => void> = []
let memoryState: ToastState = { toasts: [] }

function dispatch(toast: Toast) {
  memoryState = { toasts: [...memoryState.toasts, toast] }
  listeners.forEach((l) => l(memoryState))

  setTimeout(() => {
    memoryState = { toasts: memoryState.toasts.filter((t) => t.id !== toast.id) }
    listeners.forEach((l) => l(memoryState))
  }, toast.duration ?? 5000)
}

export function toast(props: Omit<Toast, 'id'>) {
  dispatch({ ...props, id: String(++toastCount) })
}

export function useToast() {
  const [state, setState] = useState<ToastState>(memoryState)

  const subscribe = useCallback(() => {
    listeners.push(setState)
    return () => {
      const idx = listeners.indexOf(setState)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  useState(subscribe)

  return {
    toasts: state.toasts,
    toast,
  }
}
