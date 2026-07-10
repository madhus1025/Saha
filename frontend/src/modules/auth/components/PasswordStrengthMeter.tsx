import { cn } from '@/core/utils/cn'
import { assessPassphrase } from '../utils/passphrase'

interface PasswordStrengthMeterProps {
  password: string
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { score, label } = assessPassphrase(password)

  if (!password) return null

  return (
    <div className="space-y-1.5" data-testid="password-strength">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              segment <= score ? 'bg-sage-500' : 'bg-sandstone-200 dark:bg-sandstone-700',
            )}
          />
        ))}
      </div>

      {/* Text, not colour, carries the meaning \u2014 the meter is decorative. */}
      <p
        aria-live="polite"
        className={cn(
          'text-xs',
          score === 0
            ? 'text-sandstone-700 dark:text-sandstone-300'
            : 'text-forest-600 dark:text-sage-300',
        )}
      >
        {label}
      </p>
    </div>
  )
}
