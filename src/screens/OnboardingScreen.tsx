import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { importBackup, reloadStores } from '../utils/backup'
import ChildForm from '../components/ChildForm'
import { Card, Btn } from '../components/ui'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export default function OnboardingScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const [message, setMessage] = useState('')

  async function onImport() {
    try {
      const res = await importBackup({ replace: false })
      if (!res) return
      await reloadStores()
      const skippedNote = res.skipped > 0 ? `, пропущено битых записей — ${res.skipped}` : ''
      setMessage(`Импортировано: детей — ${res.children}, событий — ${res.events}${skippedNote}`)
    } catch (err: any) {
      setMessage(`Ошибка импорта: ${err.message}`)
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🌙</Text>
          <Text style={[styles.title, { color: colors.text }]}>Режим малыша</Text>
          <Text style={[s.muted, styles.heroText]}>
            Отмечайте сон, прогулки и купание — приложение подскажет, когда укладывать в следующий раз, и поможет
            наладить режим. Все данные хранятся только на вашем устройстве.
          </Text>
        </View>

        <Card>
          <Text style={s.h2}>Расскажите о малыше</Text>
          <ChildForm onSaved={() => {}} />
        </Card>

        <View style={{ marginTop: 16 }}>
          <View style={styles.or}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <Text style={[s.muted, s.small]}>или</Text>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>
          <Btn title="⬆️ Импортировать данные" variant="secondary" block onPress={onImport} />
          {message ? <Text style={[s.small, { color: colors.urgent, textAlign: 'center', marginTop: 8 }]}>{message}</Text> : null}
          <Text style={[s.muted, s.small, { textAlign: 'center', marginTop: 8 }]}>
            Есть резервная копия (.json)? Восстановите данные без ручного ввода.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: 24 },
  heroIcon: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  heroText: { maxWidth: 320, textAlign: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  orLine: { flex: 1, height: 1 }
})
