import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, Modal, ScrollView, TextInput, Alert, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useEventsStore, SleepEvent } from '../store/events'
import { simNow } from '../time/now'
import { EVENT_TYPES, EVENT_TYPE_LIST } from '../data/eventTypes'
import { Btn } from './ui'
import DateTimeInput from './DateTimeInput'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export type EventModel =
  | (Partial<SleepEvent> & { isNew?: boolean })
  | null

export default function EventEditSheet({ model, onClose }: { model: EventModel; onClose: () => void }) {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()

  const [type, setType] = useState('sleep')
  const [startedAt, setStartedAt] = useState(() => new Date())
  const [endedAt, setEndedAt] = useState<Date | null>(null)
  const [hasEnd, setHasEnd] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const isNew = !!model?.isNew

  useEffect(() => {
    if (!model) return
    setError('')
    setType(model.type || 'sleep')
    setStartedAt(new Date(model.startedAt ?? simNow()))
    setEndedAt(model.endedAt != null ? new Date(model.endedAt) : null)
    setHasEnd(model.endedAt != null)
    setNote(model.note || '')
  }, [model])

  const typeDef = (EVENT_TYPES as any)[type] || EVENT_TYPES.sleep
  const isInterval = typeDef.kind === 'interval'

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
    const data = { type, startedAt: startMs, endedAt: endMs, note: note.trim() }
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
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 18 }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <ScrollView>
            <Text style={[s.h2, { fontSize: 19 }]}>{isNew ? 'Новое событие' : 'Изменить событие'}</Text>

            {isNew && (
              <View style={styles.field}>
                <Text style={s.label}>Тип события</Text>
                <View style={styles.chips}>
                  {EVENT_TYPE_LIST.map((t: any) => {
                    const active = type === t.id
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => setType(t.id)}
                        style={[s.chip, active && s.chipActive]}
                      >
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
                  <View style={[styles.checkbox, { borderColor: hasEnd ? colors.primary : colors.border, backgroundColor: hasEnd ? colors.primary : 'transparent' }]}>
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

            <View style={styles.field}>
              <Text style={s.label}>Заметка</Text>
              <TextInput
                style={s.input}
                value={note}
                onChangeText={setNote}
                placeholder={typeDef.notePlaceholder || 'Необязательно'}
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
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,12,24,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 8, maxHeight: '88%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  field: { marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }
})
