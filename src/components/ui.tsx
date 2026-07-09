import React, { useEffect, useRef, useState } from 'react'
import { Animated, View, Text, Pressable, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useCommonStyles()
  return <View style={[s.card, style]}>{children}</View>
}

type BtnProps = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  block?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}

export function Btn({ title, onPress, variant = 'primary', block, disabled, style, textStyle }: BtnProps) {
  const s = useCommonStyles()
  const containerStyle = [
    s.btn,
    variant === 'secondary' && s.btnSecondary,
    variant === 'danger' && s.btnDanger,
    block && s.btnBlock,
    disabled && { opacity: 0.5 },
    style
  ]
  const label = [
    s.btnText,
    variant === 'secondary' && s.btnSecondaryText,
    variant === 'danger' && s.btnDangerText,
    textStyle
  ]
  return (
    <Pressable
      style={({ pressed }) => [containerStyle, pressed && { opacity: 0.8 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={label}>{title}</Text>
    </Pressable>
  )
}

// Строка «подпись — значение» для сводок и карточек статистики.
// mutedLabel=false — подпись основным цветом текста (для акцентных списков).
export function KeyValueRow({ label, value, mutedLabel = true }: { label: string; value: string; mutedLabel?: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={styles.kvRow}>
      <Text style={{ color: mutedLabel ? colors.textSoft : colors.text, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{value}</Text>
    </View>
  )
}

// Всплывающее уведомление с плавным появлением/скрытием.
// Пустое message запускает fade-out; текст держим до конца анимации.
export function Toast({ message, bottom }: { message: string; bottom: number }) {
  const { colors } = useTheme()
  const [shown, setShown] = useState(message)
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (message) {
      setShown(message)
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start()
    } else {
      Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setShown('')
      })
    }
  }, [message, progress])

  if (!shown) return null
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { backgroundColor: colors.text, bottom, opacity: progress, transform: [{ translateY }] }]}
    >
      <Text style={{ color: colors.bg, fontWeight: '600', fontSize: 14 }}>{shown}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 3.5 },
  toast: { position: 'absolute', alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 }
})
