import React from 'react'
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { useActiveChild, useChildrenStore } from '../store/children'
import { useNow } from '../time/now'
import { formatDurationMin, ageInMonths } from '../logic/age'
import { getNorms } from '../data/sleepNorms'
import { Card, Btn } from '../components/ui'
import DateTimeInput from '../components/DateTimeInput'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export default function RegimeScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const child = useActiveChild()
  const now = useNow()

  const regime = child?.regime || null
  const isCustom = regime?.mode === 'custom'
  const norms = child ? getNorms(ageInMonths(child.birthDate, now)) : null

  function set(key: string, value: any) {
    if (child) useChildrenStore.getState().updateRegime(child.id, { [key]: value })
  }
  function enableCustom() {
    if (child) useChildrenStore.getState().setRegimeMode(child.id, 'custom')
  }

  const daySleepMin = (Number(regime?.napCount) || 0) * (Number(regime?.napDurationMin) || 0)
  const totalSleepMin = daySleepMin + (Number(regime?.nightSleepMin) || 0)

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 32 }]}>
        {norms && (
          <Card style={{ borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft }}>
            <Text style={s.cardTitle}>Нормы для возраста {norms.label}</Text>
            <SumRow label="Окно бодрствования" value={`${norms.wakeWindow[0]}–${norms.wakeWindow[1]} мин`} colors={colors} />
            <SumRow label="Дневных снов" value={norms.naps[0] === norms.naps[1] ? String(norms.naps[0]) : `${norms.naps[0]}–${norms.naps[1]}`} colors={colors} />
            <SumRow label="Дневной сон" value={`${formatDurationMin(norms.daySleep[0])} – ${formatDurationMin(norms.daySleep[1])}`} colors={colors} />
            <SumRow label="Ночной сон" value={`${formatDurationMin(norms.nightSleep[0])} – ${formatDurationMin(norms.nightSleep[1])}`} colors={colors} />
            <SumRow label="Всего за сутки" value={`${formatDurationMin(norms.totalSleep[0])} – ${formatDurationMin(norms.totalSleep[1])}`} colors={colors} />
            <SumRow label="Отбой" value={`${norms.bedtime[0]}–${norms.bedtime[1]}`} colors={colors} />
            <Text style={[s.muted, s.small, { marginTop: 10 }]}>{norms.note}</Text>
          </Card>
        )}

        {!child ? (
          <Card>
            <Text style={s.muted}>Сначала добавьте профиль малыша.</Text>
          </Card>
        ) : !isCustom ? (
          <Card>
            <Text style={[s.text, { marginBottom: 12 }]}>
              Настраиваемый режим выключен — сейчас приложение считает окна сна автоматически по возрасту.
            </Text>
            <Btn title="Включить настраиваемый режим" block onPress={enableCustom} />
          </Card>
        ) : (
          <>
            <Card>
              <Text style={s.cardTitle}>Целевые ориентиры</Text>
              <SumRow label="Дневной сон" value={formatDurationMin(daySleepMin)} colors={colors} />
              <SumRow label="Ночной сон" value={formatDurationMin(Number(regime?.nightSleepMin) || 0)} colors={colors} />
              <SumRow label="Всего за сутки" value={formatDurationMin(totalSleepMin)} colors={colors} />
            </Card>

            <Card>
              <Text style={s.cardTitle}>Основные параметры</Text>
              <NumField label="Окно бодрствования, мин" value={regime?.wakeWindow} onChange={v => set('wakeWindow', v)} s={s} colors={colors} />
              <NumField label="Количество дневных снов" value={regime?.napCount} onChange={v => set('napCount', v)} s={s} colors={colors} />
              <NumField label="Продолжительность одного сна, мин" value={regime?.napDurationMin} onChange={v => set('napDurationMin', v)} s={s} colors={colors} />
              <TimeField label="Начало дневного сна (первый)" value={regime?.dayStart} onChange={v => set('dayStart', v)} s={s} />
              <TimeField label="Начало ночного сна (отбой)" value={regime?.nightStart} onChange={v => set('nightStart', v)} s={s} />
            </Card>

            <Card>
              <Text style={s.cardTitle}>Дополнительно</Text>
              <TimeField label="Утренний подъём" value={regime?.morningWake} onChange={v => set('morningWake', v)} s={s} />
              <NumField label="Продолжительность ночного сна, мин" value={regime?.nightSleepMin} onChange={v => set('nightSleepMin', v)} s={s} colors={colors} />
              <NumField label="За сколько минут до сна «сбавить темп»" value={regime?.windDownMin} onChange={v => set('windDownMin', v)} s={s} colors={colors} />
              <Pressable style={styles.switchRow} onPress={() => set('shortNapReduce', !regime?.shortNapReduce)}>
                <View style={[styles.checkbox, { borderColor: regime?.shortNapReduce ? colors.primary : colors.border, backgroundColor: regime?.shortNapReduce ? colors.primary : 'transparent' }]}>
                  {regime?.shortNapReduce && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={[s.text, s.grow]}>Сокращать окно бодрствования после короткого сна</Text>
              </Pressable>
            </Card>

            <Text style={[s.muted, s.small]}>
              Значения переопределяют возрастные нормы. Чтобы вернуться к авторасчёту, переключите режим на «✨ Авто» на
              экране «Сегодня».
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function SumRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.sumItem}>
      <Text style={{ color: colors.textSoft, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{value}</Text>
    </View>
  )
}

function NumField({ label, value, onChange, s, colors }: { label: string; value: any; onChange: (v: number) => void; s: any; colors: any }) {
  return (
    <View style={styles.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        keyboardType="number-pad"
        defaultValue={value != null ? String(value) : ''}
        placeholderTextColor={colors.textSoft}
        onChangeText={t => onChange(Number(t) || 0)}
      />
    </View>
  )
}

function TimeField({ label, value, onChange, s }: { label: string; value: any; onChange: (v: string) => void; s: any }) {
  const date = value ? dayjs(`2000-01-01T${value}`).toDate() : dayjs().startOf('day').toDate()
  return (
    <View style={styles.field}>
      <Text style={s.label}>{label}</Text>
      <DateTimeInput value={date} mode="time" onChange={d => onChange(dayjs(d).format('HH:mm'))} />
    </View>
  )
}

const styles = StyleSheet.create({
  sumItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  field: { marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }
})
