import { Menu, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/shared/stores/theme.store'
import { useAuthStore } from '@/shared/stores/auth.store'
import { CoupleAvatar } from '@/shared/components/ui/CoupleAvatar'
import { NavLink } from 'react-router'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { theme, setTheme } = useThemeStore()
  // `partnerName` is the *signed-in* partner's own display name (the field name is misleading).
  // The shell identifies a person, so it uses their name — `username` is a login credential.
  const { partnerName, profilePictureUrl, role } = useAuthStore()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-sandstone-900/80 backdrop-blur-md border-b border-sandstone-100 dark:border-sandstone-800">
      <div className="flex items-center justify-between px-6 h-16">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-copy-muted hover:text-sandstone-900 dark:hover:text-sandstone-100 hover:bg-sandstone-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden lg:block" />

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-copy-muted hover:text-sandstone-900 hover:bg-sandstone-100 dark:hover:text-sandstone-100 dark:hover:bg-sandstone-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <NavLink
            to="/profile"
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-sandstone-100 dark:hover:bg-sandstone-800 transition-colors"
          >
            <CoupleAvatar src={profilePictureUrl} name={partnerName ?? ''} role={role} size="sm" />
            <span className="hidden sm:block text-sm font-medium text-sandstone-700 dark:text-sandstone-300 pr-1">
              {partnerName}
            </span>
          </NavLink>
        </div>
      </div>
    </header>
  )
}
