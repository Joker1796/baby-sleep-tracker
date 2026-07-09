import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'

// Граница ошибок рендера: вместо белого экрана — объяснение и кнопка повтора.
// Классовый компонент — у хуков нет аналога componentDidCatch.
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <View style={styles.screen}>
        <Text style={styles.icon}>😿</Text>
        <Text style={styles.title}>Что-то пошло не так</Text>
        <Text style={styles.text}>Произошла ошибка. Ваши данные не пострадали — они хранятся на устройстве.</Text>
        <Pressable style={styles.btn} onPress={() => this.setState({ error: null })} accessibilityRole="button">
          <Text style={styles.btnText}>Попробовать снова</Text>
        </Pressable>
        <Text style={styles.detail} numberOfLines={3}>
          {String(this.state.error)}
        </Text>
      </View>
    )
  }
}

// Тема может быть недоступна (ошибка могла случиться в ThemeProvider) —
// используем нейтральные фиксированные цвета.
const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f6f6fb' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1c1d2b', marginBottom: 8 },
  text: { fontSize: 15, lineHeight: 22, color: '#5b5d72', textAlign: 'center', marginBottom: 20 },
  btn: {
    backgroundColor: '#7c6ff0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    justifyContent: 'center'
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  detail: { marginTop: 20, fontSize: 11, color: '#9092a6', textAlign: 'center' }
})
