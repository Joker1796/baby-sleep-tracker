import React, { useEffect, useState } from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider'
import { bootstrap } from './src/bootstrap'
import RootNavigator from './src/navigation/RootNavigator'

function Splash() {
  const { colors } = useTheme()
  return (
    <View style={[styles.splash, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

function Root() {
  const { dark } = useTheme()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    bootstrap().finally(() => setReady(true))
  }, [])

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {ready ? <RootNavigator /> : <Splash />}
    </>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' }
})
