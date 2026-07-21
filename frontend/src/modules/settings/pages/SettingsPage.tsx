import { Card, CardHeader } from '@/shared/components/ui/Card'
import { useThemeStore } from '@/shared/stores/theme.store'
import { Moon, Sun, Monitor, Check } from 'lucide-react'
import { cn } from '@/core/utils/cn'
import { motion } from 'framer-motion'

const themes = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
]

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-header">Settings</h1>
        <p className="text-sandstone-500 dark:text-sandstone-400 mt-1">Personalise your experience</p>
      </div>

      <Card>
        <CardHeader title="Appearance" subtitle="Choose how Saha looks for you" />
        {/*
          A single-choice control, so it is a radiogroup: the selected option must be exposed to
          assistive technology, not carried by colour alone (SAHA-D10). Arrow keys move the
          selection and only the active option is a tab stop — the roving tab stop of the ARIA
          radiogroup pattern, matching RoleToggle in the registration wizard.
        */}
        <div
          role="radiogroup"
          aria-label="Appearance"
          className="flex gap-3"
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            const current = themes.findIndex((t) => t.value === theme)
            const delta = event.key === 'ArrowRight' ? 1 : -1
            const next = themes[(current + delta + themes.length) % themes.length]
            if (next) setTheme(next.value)
          }}
        >
          {themes.map(({ value, label, icon: Icon }) => {
            const selected = theme === value
            return (
              <motion.button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                whileTap={{ scale: 0.97 }}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                  selected
                    ? 'border-gold-400 bg-gold-50 dark:bg-gold-900/20'
                    : 'border-sandstone-100 dark:border-sandstone-800 hover:border-sandstone-200 dark:hover:border-sandstone-700',
                )}
              >
                <Icon className={cn('w-5 h-5', selected ? 'text-gold-600 dark:text-gold-400' : 'text-sandstone-400')} />
                <span className={cn('text-xs font-medium', selected ? 'text-gold-600 dark:text-gold-400' : 'text-sandstone-500')}>
                  {label}
                </span>
                {/* Non-colour indicator: forced-colors and colour-blind users lose the gold tint. */}
                <Check
                  aria-hidden
                  className={cn('w-3.5 h-3.5 text-gold-600 dark:text-gold-400', selected ? 'opacity-100' : 'opacity-0')}
                />
              </motion.button>
            )
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Notifications" subtitle="Coming soon" />
        <p className="text-sm text-sandstone-400 dark:text-sandstone-500">Notification preferences will be available in a future update.</p>
      </Card>

      <Card>
        <CardHeader title="Privacy & Security" subtitle="Coming soon" />
        <p className="text-sm text-sandstone-400 dark:text-sandstone-500">Advanced security settings will be available in a future update.</p>
      </Card>
    </div>
  )
}
