import { useState, useCallback } from 'react'

export interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([])

  const toast = useCallback(({ title, description, variant = 'default' }: ToastProps) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { id, title, description, variant }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
    
    // For now, just log to console - in a real implementation you'd show a toast UI
    console.log(`Toast [${variant}]: ${title}${description ? ` - ${description}` : ''}`)
  }, [])

  return { toast, toasts }
}
