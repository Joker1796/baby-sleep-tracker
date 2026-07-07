import React from 'react'
import { View, Text, Pressable, StyleProp, ViewStyle, TextStyle } from 'react-native'
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
