import { Card, CardHeader } from '@/shared/components/ui/Card'
import { useThemeStore } from '@/shared/stores/theme.store'
import { Moon, Sun, Monitor } from 'lucide-react'
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
        <div className="flex gap-3">
          {themes.map(({ value, label, icon: Icon }) => (
            <motion.button
              key={value}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTheme(value)}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                theme === value
                  ? 'border-gold-400 bg-gold-50 dark:bg-gold-900/20'
                  : 'border-sandstone-100 dark:border-sandstone-800 hover:border-sandstone-200 dark:hover:border-sandstone-700',
              )}
            >
              <Icon className={cn('w-5 h-5', theme === value ? 'text-gold-600 dark:text-gold-400' : 'text-sandstone-400')} />
              <span className={cn('text-xs font-medium', theme === value ? 'text-gold-600 dark:text-gold-400' : 'text-sandstone-500')}>{label}</span>
            </motion.button>
          ))}
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
