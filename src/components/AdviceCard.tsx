import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { radiusSm } from '../theme/colors'

const ICONS: Record<number, string> = { 3: '⚠️', 2: '💛', 1: '💡' }

export default function AdviceCard({
  advice,
  dismissible,
  onDismiss
}: {
  advice: { priority: number; text: string }
  dismissible?: boolean
  onDismiss?: () => void
}) {
  const { colors } = useTheme()
  const bg =
    advice.priority === 3 ? colors.urgentSoft : advice.priority === 2 ? colors.warnSoft : colors.infoSoft

  return (
    <View style={[styles.advice, { backgroundColor: bg }, dismissible && { paddingRight: 34 }]}>
      {dismissible && (
        <Pressable style={styles.close} onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.textSoft} />
        </Pressable>
      )}
      <Text style={styles.icon}>{ICONS[advice.priority] || '💡'}</Text>
      <Text style={[styles.text, { color: colors.text }]}>{advice.text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  advice: {
    position: 'relative',
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: radiusSm,
    marginBottom: 8
  },
  close: { position: 'absolute', top: 4, right: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20 },
  icon: { fontSize: 18, lineHeight: 22 },
  text: { flex: 1, fontSize: 14, lineHeight: 20 }
})
