import React, { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { useSettingsStore } from '../store/settings'
import { lightColors, darkColors, ThemeColors } from './colors'

interface ThemeValue {
  colors: ThemeColors
  dark: boolean
}

const ThemeContext = createContext<ThemeValue>({ colors: lightColors, dark: false })

// Разрешает эффективную тему из предпочтения пользователя (auto/light/dark)
// и системной схемы (useColorScheme реактивен — замена matchMedia-слушателя).
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore(s => s.theme)
  const scheme = useColorScheme()

  const value = useMemo<ThemeValue>(() => {
    const dark = theme === 'dark' || (theme === 'auto' && scheme === 'dark')
    return { colors: dark ? darkColors : lightColors, dark }
  }, [theme, scheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext)
}
