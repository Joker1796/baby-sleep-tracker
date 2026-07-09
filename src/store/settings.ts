import { create } from 'zustand'
import { loadString, saveString } from './persist'

export type ThemePref = 'auto' | 'light' | 'dark'

const THEME_KEY = 'theme'
const NAP_REMINDER_KEY = 'napReminder'

interface SettingsState {
  theme: ThemePref
  napReminder: boolean
  load: () => Promise<void>
  setTheme: (theme: ThemePref) => void
  setNapReminder: (enabled: boolean) => void
}

// Реакция на системную тему и собственно применение цветов вынесены в
// ThemeProvider (useColorScheme). Здесь — только предпочтения пользователя.
export const useSettingsStore = create<SettingsState>(set => ({
  theme: 'auto',
  napReminder: false,
  async load() {
    const [savedTheme, savedReminder] = await Promise.all([loadString(THEME_KEY), loadString(NAP_REMINDER_KEY)])
    if (savedTheme === 'auto' || savedTheme === 'light' || savedTheme === 'dark') set({ theme: savedTheme })
    if (savedReminder != null) set({ napReminder: savedReminder === '1' })
  },
  setTheme(theme) {
    set({ theme })
    saveString(THEME_KEY, theme)
  },
  setNapReminder(enabled) {
    set({ napReminder: enabled })
    saveString(NAP_REMINDER_KEY, enabled ? '1' : '0')
  }
}))
