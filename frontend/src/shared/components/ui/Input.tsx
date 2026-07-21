import { forwardRef } from 'react'
import { cn } from '@/core/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: LucideIcon
  rightElement?: React.ReactNode
  /**
   * `gentle` drops red as the error signal — the auth screens state consequences plainly and
   * never scold. Errors stay announced to assistive tech either way.
   */
  tone?: 'default' | 'gentle'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, hint, leftIcon: LeftIcon, rightElement, id, tone = 'default', ...props },
    ref,
  ) => {
    const gentle = tone === 'gentle'
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-sandstone-700 dark:text-sandstone-300"
          >
            {label}
            {props.required && (
              <span className="ml-0.5 text-red-500" aria-hidden>*</span>
            )}
          </label>
        )}

        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sandstone-400 pointer-events-none">
              <LeftIcon className="w-4 h-4" />
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'input-warm',
              LeftIcon && 'pl-10',
              rightElement && 'pr-12',
              error && (gentle ? 'border-sandstone-500' : 'border-red-400 focus:ring-red-400'),
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className={cn(
              'text-xs flex items-center gap-1',
              gentle
                ? 'text-sandstone-700 dark:text-sandstone-300'
                : 'text-red-600 dark:text-red-400',
            )}
            role="alert"
          >
            {error}
          </p>
        )}

        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="text-xs text-sandstone-500 dark:text-sandstone-400"
          >
            {hint}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
