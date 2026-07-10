import { cn } from '@/core/utils/cn'
import type { PartnerRole } from '@/core/types/api.types'

const ROLES: PartnerRole[] = ['Wife', 'Husband']

interface RoleToggleProps {
  value?: PartnerRole
  onChange: (role: PartnerRole) => void
  error?: string
}

/**
 * Segmented control. Arrow keys move between options, as a radio group should — a `<div>` with
 * click handlers would be unreachable by keyboard.
 */
export function RoleToggle({ value, onChange, error }: RoleToggleProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    const currentIndex = value ? ROLES.indexOf(value) : -1
    const nextIndex = event.key === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1
    const next = ROLES[(nextIndex + ROLES.length) % ROLES.length]
    if (next) onChange(next)
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-sandstone-700 dark:text-sandstone-300">
        Role
      </span>

      <div
        role="radiogroup"
        aria-label="Role"
        aria-invalid={!!error}
        onKeyDown={handleKeyDown}
        className="flex rounded-xl bg-sandstone-100 dark:bg-sandstone-800 p-1"
      >
        {ROLES.map((role) => {
          const selected = value === role
          return (
            <button
              key={role}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (!value && role === ROLES[0]) ? 0 : -1}
              onClick={() => onChange(role)}
              className={cn(
                'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600',
                selected
                  ? 'bg-white dark:bg-sandstone-700 text-sandstone-900 dark:text-cream-100 shadow-warm-sm'
                  : 'text-sandstone-500 dark:text-sandstone-400 hover:text-sandstone-700',
              )}
            >
              {role}
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-xs text-sandstone-700 dark:text-sandstone-300" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
