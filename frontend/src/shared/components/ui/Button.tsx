import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/core/utils/cn'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-forest-500 text-cream-200 hover:bg-forest-600 focus-visible:ring-forest-500 shadow-warm-sm hover:shadow-warm-md',
        secondary:
          'bg-sandstone-100 text-sandstone-800 hover:bg-sandstone-200 focus-visible:ring-forest-400 dark:bg-forest-800 dark:text-cream-200 dark:hover:bg-forest-700',
        outline:
          'border border-sandstone-200 bg-transparent text-forest-700 hover:bg-forest-50 focus-visible:ring-forest-400 dark:border-forest-700 dark:text-sage-300 dark:hover:bg-forest-800/50',
        ghost:
          'bg-transparent text-forest-700 hover:bg-forest-50 focus-visible:ring-forest-400 dark:text-sage-300 dark:hover:bg-forest-800/50',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500',
        link:
          'bg-transparent text-forest-600 hover:text-forest-700 underline-offset-4 hover:underline p-0 h-auto dark:text-sage-300',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-5',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
