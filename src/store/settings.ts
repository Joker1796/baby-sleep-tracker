import { create } from 'zustand'
import { loadString, saveString } from './persist'

export type ThemePref = 'auto' | 'light' | 'dark'

const THEME_KEY = 'theme'

interface SettingsState {
  theme: ThemePref
  load: () => Promise<void>
  setTheme: (theme: ThemePref) => void
}

// Реакция на системную тему и собственно применение цветов вынесены в
// ThemeProvider (useColorScheme). Здесь — только предпочтение пользователя.
export const useSettingsStore = create<SettingsState>(set => ({
  theme: 'auto',
  async load() {
    const saved = (await loadString(THEME_KEY)) as ThemePref | null
    if (saved === 'auto' || saved === 'light' || saved === 'dark') set({ theme: saved })
  },
  setTheme(theme) {
    set({ theme })
    saveString(THEME_KEY, theme)
  }
}))
