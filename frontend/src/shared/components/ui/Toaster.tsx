import {
  Provider as ToastProvider,
  Root as ToastRoot,
  Title as ToastTitle,
  Description as ToastDescription,
  Close as ToastClose,
  Viewport as ToastViewport,
} from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { useToast } from '@/shared/hooks/use-toast'
import { cn } from '@/core/utils/cn'

const variantStyles = {
  default: 'bg-white dark:bg-sandstone-800 border-sandstone-200 dark:border-sandstone-700',
  success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
}

const titleStyles = {
  default: 'text-sandstone-900 dark:text-sandstone-100',
  success: 'text-green-800 dark:text-green-200',
  error: 'text-red-800 dark:text-red-200',
  warning: 'text-amber-800 dark:text-amber-200',
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map((toast) => (
        <ToastRoot
          key={toast.id}
          className={cn(
            'pointer-events-auto relative flex w-full items-start gap-3 rounded-xl border p-4 shadow-warm transition-all',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[swipe=end]:animate-out data-[state=closed]:fade-out-80',
            'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-right-full',
            variantStyles[toast.variant ?? 'default'],
          )}
          duration={toast.duration ?? 5000}
        >
          <div className="flex-1 space-y-0.5">
            <ToastTitle
              className={cn(
                'text-sm font-semibold',
                titleStyles[toast.variant ?? 'default'],
              )}
            >
              {toast.title}
            </ToastTitle>
            {toast.description && (
              <ToastDescription
                className={cn(
                  'text-xs opacity-80',
                  titleStyles[toast.variant ?? 'default'],
                )}
              >
                {toast.description}
              </ToastDescription>
            )}
          </div>
          <ToastClose
            className="flex-shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close notification"
          >
            <X className="h-3.5 w-3.5" />
          </ToastClose>
        </ToastRoot>
      ))}
      <ToastViewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm" />
    </ToastProvider>
  )
}

export { useToast, toast } from '@/shared/hooks/use-toast'
