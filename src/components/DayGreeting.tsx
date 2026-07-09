import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Greeting } from '../logic/guidance'
import { Card } from './ui'
import { useTheme } from '../theme/ThemeProvider'

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <View style={{ gap: 5 }}>
      {items.map((t, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.bullet, { color }]}>•</Text>
          <Text style={[styles.bulletText, { color }]}>{t}</Text>
        </View>
      ))}
    </View>
  )
}

export default function DayGreeting({ greeting, onDismiss }: { greeting: Greeting; onDismiss: () => void }) {
  const { colors } = useTheme()
  return (
    <Card style={{ backgroundColor: colors.primarySoft }}>
      <Pressable style={styles.close} onPress={onDismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel="Скрыть приветствие">
        <Ionicons name="close" size={22} color={colors.textSoft} />
      </Pressable>
      <View style={styles.head}>
        <Text style={styles.icon}>☀️</Text>
        <Text style={[styles.line, { color: colors.text }]}>{greeting.line}</Text>
      </View>

      {greeting.achievements.length > 0 && (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: colors.textSoft }]}>Достижения вчера</Text>
          <Bullets items={greeting.achievements} color={colors.text} />
        </View>
      )}

      <View style={styles.block}>
        <Text style={[styles.blockTitle, { color: colors.textSoft }]}>На что обратить внимание сегодня</Text>
        <Bullets items={greeting.attention} color={colors.text} />
      </View>

      {greeting.progress ? (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: colors.textSoft }]}>Как далеко вы продвинулись 💪</Text>
          <Text style={[styles.bulletText, { color: colors.text }]}>{greeting.progress}</Text>
        </View>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  close: { position: 'absolute', top: 8, right: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  closeText: { fontSize: 22 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingRight: 24 },
  icon: { fontSize: 26 },
  line: { flex: 1, fontSize: 15, fontWeight: '600' },
  block: { marginTop: 12 },
  blockTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  bulletRow: { flexDirection: 'row', gap: 6 },
  bullet: { fontSize: 14 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21 }
})
