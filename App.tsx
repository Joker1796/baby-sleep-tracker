import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider'
import { bootstrap } from './src/bootstrap'
import ErrorBoundary from './src/components/ErrorBoundary'
import { Btn } from './src/components/ui'
import RootNavigator from './src/navigation/RootNavigator'

function Splash() {
  const { colors } = useTheme()
  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

function BootError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.center, { backgroundColor: colors.bg, padding: 32 }]}>
      <Text style={{ fontSize: 44, marginBottom: 12 }}>😿</Text>
      <Text style={[styles.errTitle, { color: colors.text }]}>Не удалось запустить приложение</Text>
      <Text style={[styles.errText, { color: colors.textSoft }]}>
        Ошибка при инициализации хранилища. Данные на устройстве не тронуты — попробуйте ещё раз.
      </Text>
      <Btn title="Повторить" onPress={onRetry} />
      <Text style={[styles.errDetail, { color: colors.textSoft }]} numberOfLines={3}>
        {String(error)}
      </Text>
    </View>
  )
}

type BootState = { status: 'loading' | 'ready' } | { status: 'error'; error: Error }

function Root() {
  const { dark } = useTheme()
  const [boot, setBoot] = useState<BootState>({ status: 'loading' })

  const start = useCallback(() => {
    setBoot({ status: 'loading' })
    bootstrap()
      .then(() => setBoot({ status: 'ready' }))
      .catch((error: Error) => setBoot({ status: 'error', error }))
  }, [])

  useEffect(start, [start])

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {boot.status === 'ready' ? (
        <RootNavigator />
      ) : boot.status === 'error' ? (
        <BootError error={boot.error} onRetry={start} />
      ) : (
        <Splash />
      )}
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errTitle: { fontSize: 19, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  errText: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 20 },
  errDetail: { marginTop: 20, fontSize: 11, textAlign: 'center' }
})
