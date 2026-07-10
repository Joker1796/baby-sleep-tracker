import React, { useMemo, useState } from 'react'
import { View, Text, Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView, TextInput, Alert, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useEventsStore, useSorted, SleepEvent } from '../store/events'
import { useActiveChild } from '../store/children'
import { simNow } from '../time/now'
import { EVENT_TYPES, EVENT_TYPE_LIST, typesForAge } from '../data/eventTypes'
import { ageInMonths } from '../logic/age'
import { Btn } from './ui'
import DateTimeInput from './DateTimeInput'
import ToothChart from './ToothChart'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export type EventModel = (Partial<SleepEvent> & { isNew?: boolean }) | null

export default function EventEditSheet({
  model,
  onClose,
  types,
  allowPlan
}: {
  model: EventModel
  onClose: () => void
  types?: any[]
  allowPlan?: boolean
}) {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()

  const child = useActiveChild()
  const allEvents = useSorted()

  const [type, setType] = useState('sleep')
  const [startedAt, setStartedAt] = useState(() => new Date())
  const [endedAt, setEndedAt] = useState<Date | null>(null)
  const [hasEnd, setHasEnd] = useState(false)
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [planned, setPlanned] = useState(false)
  const [teeth, setTeeth] = useState<string[]>([])
  const [error, setError] = useState('')
  const isNew = !!model?.isNew

  // Модалка не размонтируется между открытиями, поэтому при смене model
  // сбрасываем поля формы. Обновление прямо в рендере — паттерн
  // «adjusting state when a prop changes» из документации React.
  const [prevModel, setPrevModel] = useState<EventModel>(null)
  if (model !== prevModel) {
    setPrevModel(model)
    if (model) {
      setError('')
      setType(model.type || 'sleep')
      setStartedAt(new Date(model.startedAt ?? simNow()))
      setEndedAt(model.endedAt != null ? new Date(model.endedAt) : null)
      setHasEnd(model.endedAt != null)
      setNote(model.note || '')
      setAmount(model.amount != null ? String(model.amount) : '')
      setPlanned(!!model.planned)
      setTeeth(Array.isArray(model.teeth) ? [...model.teeth] : [])
    }
  }

  const currentDef = EVENT_TYPES[type] || EVENT_TYPES.sleep
  const isInterval = currentDef.kind === 'interval'

  // Список типов в выпадашке: доступные по возрасту, недавно использованные первыми.
  const childAgeM = child?.birthDate ? ageInMonths(child.birthDate) : null
  const typeOptions = useMemo(() => {
    const last: Record<string, number> = {}
    for (const e of allEvents) {
      if (last[e.type] == null || e.startedAt > last[e.type]) last[e.type] = e.startedAt
    }
    const base = typesForAge(types || EVENT_TYPE_LIST, childAgeM)
    return [...base].sort((a: any, b: any) => {
      const la = last[a.id],
        lb = last[b.id]
      if (la != null && lb != null) return lb - la
      if (la != null) return -1
      if (lb != null) return 1
      return 0
    })
  }, [allEvents, childAgeM, types])

  function toggleEnd() {
    const next = !hasEnd
    setHasEnd(next)
    if (next && !endedAt) setEndedAt(new Date(simNow()))
  }

  async function save() {
    const startMs = startedAt.getTime()
    const endMs = isInterval && hasEnd && endedAt ? endedAt.getTime() : null
    if (endMs != null && endMs <= startMs) {
      setError('Окончание должно быть позже начала')
      return
    }
    const amt = currentDef.amountUnit && amount !== '' ? Number(amount) : null
    const data: any = { type, startedAt: startMs, endedAt: endMs, note: note.trim(), kind: currentDef.kind, amount: amt }
    if (allowPlan) data.planned = planned
    if (type === 'teeth') data.teeth = [...teeth]
    const store = useEventsStore.getState()
    if (isNew) await store.add(data as any)
    else await store.update({ ...(model as SleepEvent), ...data })
    onClose()
  }

  function remove() {
    Alert.alert('Удалить это событие?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          if (model?.id) await useEventsStore.getState().remove(model.id)
          onClose()
        }
      }
    ])
  }

  return (
    <Modal visible={!!model} transparent animationType="slide" onRequestClose={onClose}>
      {/* KAV поднимает шторку над клавиатурой на iOS (на Android это делает система). */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 18 }]} onPress={() => {}}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[s.h2, { fontSize: 19 }]}>{isNew ? 'Новое событие' : 'Изменить событие'}</Text>

              {allowPlan && (
                <View style={styles.field}>
                  <Text style={s.label}>Статус</Text>
                  <View style={styles.chips}>
                    <Pressable onPress={() => setPlanned(false)} style={[s.chip, !planned && s.chipActive]}>
                      <Text style={[s.chipText, !planned && s.chipActiveText]}>✓ Уже было</Text>
                    </Pressable>
                    <Pressable onPress={() => setPlanned(true)} style={[s.chip, planned && s.chipActive]}>
                      <Text style={[s.chipText, planned && s.chipActiveText]}>🎯 Запланировано</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {isNew && (
                <View style={styles.field}>
                  <Text style={s.label}>Тип события</Text>
                  <View style={styles.chips}>
                    {typeOptions.map((t: any) => {
                      const active = type === t.id
                      return (
                        <Pressable key={t.id} onPress={() => setType(t.id)} style={[s.chip, active && s.chipActive]}>
                          <Text style={[s.chipText, active && s.chipActiveText]}>
                            {t.icon} {t.label}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              )}

              <View style={styles.field}>
                <Text style={s.label}>{isInterval ? 'Начало' : 'Время'}</Text>
                <DateTimeInput value={startedAt} mode="datetime" onChange={setStartedAt} />
              </View>

              {isInterval && (
                <>
                  <Pressable style={[styles.field, styles.checkRow]} onPress={toggleEnd}>
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: hasEnd ? colors.primary : colors.border, backgroundColor: hasEnd ? colors.primary : 'transparent' }
                      ]}
                    >
                      {hasEnd && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={{ color: colors.text, fontSize: 15 }}>Уже закончилось</Text>
                  </Pressable>
                  {hasEnd && (
                    <View style={styles.field}>
                      <Text style={s.label}>Окончание</Text>
                      <DateTimeInput value={endedAt || new Date(simNow())} mode="datetime" onChange={setEndedAt} />
                    </View>
                  )}
                </>
              )}

              {currentDef.amountUnit && (
                <View style={styles.field}>
                  <Text style={s.label}>Количество, {currentDef.amountUnit}</Text>
                  <TextInput
                    style={s.input}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textSoft}
                  />
                </View>
              )}

              {type === 'teeth' && (
                <View style={styles.field}>
                  <Text style={s.label}>Прорезавшиеся зубы · {teeth.length}</Text>
                  <ToothChart value={teeth} onChange={setTeeth} />
                </View>
              )}

              <View style={styles.field}>
                <Text style={s.label}>Заметка</Text>
                <TextInput
                  style={s.input}
                  value={note}
                  onChangeText={setNote}
                  placeholder={currentDef.notePlaceholder || 'Необязательно'}
                  placeholderTextColor={colors.textSoft}
                />
              </View>

              {error ? <Text style={[s.small, { color: colors.urgent, marginBottom: 8 }]}>{error}</Text> : null}

              <View style={[s.row, { marginTop: 8 }]}>
                {!isNew && <Btn title="Удалить" variant="danger" onPress={remove} />}
                <View style={s.grow} />
                <Btn title="Отмена" variant="secondary" onPress={onClose} />
                <Btn title="Сохранить" onPress={save} />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,12,24,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 8, maxHeight: '88%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  field: { marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }
})
