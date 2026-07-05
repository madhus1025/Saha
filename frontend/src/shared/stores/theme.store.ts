import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme: Theme) => {
        set({ theme })
        applyTheme(theme)
      },
    }),
    {
      name: 'saha-theme',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', isDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

// Apply on store initialization
const { theme } = useThemeStore.getState()
applyTheme(theme)
