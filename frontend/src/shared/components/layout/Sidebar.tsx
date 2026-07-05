import { NavLink, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Wallet,
  ImageIcon,
  Target,
  MessageCircle,
  Users,
  Calendar,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/core/utils/cn'
import { useAuthStore } from '@/shared/stores/auth.store'
import { authApi } from '@/core/api/auth.api'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navigation = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Finance', href: '/finance', icon: Wallet },
  { name: 'Memories', href: '/memories', icon: ImageIcon },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
  { name: 'Connect', href: '/connect', icon: Users },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
] as const

const secondaryNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
] as const

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const { togetherID, logout } = useAuthStore()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-forest-950 border-r border-sandstone-100 dark:border-forest-800">
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-sandstone-100 dark:border-forest-800">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="Saha" className="w-8 h-8 rounded-lg" />
          <div>
            <p className="font-display text-lg font-medium text-sandstone-900 dark:text-sandstone-100 leading-none">
              Saha
            </p>
            <p className="text-xs text-forest-600 dark:text-sage-300 font-mono tracking-wider mt-0.5">
              {togetherID}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-sandstone-400 hover:text-sandstone-600 hover:bg-sandstone-100 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-warm">
        {navigation.map(({ name, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            onClick={onClose}
            className={({ isActive }) =>
              cn('nav-link', isActive && 'active')
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Secondary navigation + Sign out at bottom */}
      <div className="p-4 border-t border-sandstone-100 dark:border-sandstone-800 space-y-1">
        {secondaryNavigation.map(({ name, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            onClick={onClose}
            className={({ isActive }) =>
              cn('nav-link', isActive && 'active')
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{name}</span>
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          className="nav-link w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed inset-y-0 left-0 z-30 w-64 lg:hidden"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
