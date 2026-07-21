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
      // `applyTheme` on module load runs before the persisted value is rehydrated, so without this
      // a reload would paint the default theme rather than the stored one.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'system' ? prefersDark() : theme === 'dark')
}

/**
 * "System" means *follow my device*, and the common case is the one that used to break: macOS,
 * Windows and iOS all switch appearance automatically at sunset. Reading `matchMedia` once at
 * selection time froze the resolved theme until the next reload (SAHA-D14), so a user who chose
 * System in the morning stayed on light all evening.
 *
 * The listener stays attached for the life of the tab and simply does nothing while an explicit
 * theme is selected — cheaper and less error-prone than attaching and detaching on every change.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', () => {
    if (useThemeStore.getState().theme === 'system') applyTheme('system')
  })
}

// Apply on store initialization, before React paints.
applyTheme(useThemeStore.getState().theme)
