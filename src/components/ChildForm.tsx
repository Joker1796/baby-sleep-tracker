import React, { useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import dayjs from 'dayjs'
import { useChildrenStore, CHILD_COLORS, Child, MainButton } from '../store/children'
import { GENDERS, FEEDING_TYPES, SLEEP_AIDS } from '../data/childOptions'
import { EVENT_TYPES, MAIN_BUTTON_TYPE_LIST, getMainButtons, typesForAge } from '../data/eventTypes'
import { ageInMonths } from '../logic/age'
import { Btn } from './ui'
import DateTimeInput from './DateTimeInput'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'
// Синтетическая строка «Грудь» объединяет feedLeft+feedRight в один переключатель.
const BREAST_ROW = { id: 'breast', icon: '🤱', btnLabel: 'Грудь', kind: 'point', canTime: true, combined: ['feedLeft', 'feedRight'] }

export default function ChildForm({
  child,
  onSaved,
  onCancel,
  onDelete
}: {
  child?: Child | null
  onSaved: () => void
  onCancel?: () => void
  onDelete?: () => void
}) {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const childCount = useChildrenStore(st => st.children.length)

  const [name, setName] = useState(child?.name || '')
  const [birthDate, setBirthDate] = useState<string>(child?.birthDate || dayjs().format('YYYY-MM-DD'))
  const [gender, setGender] = useState<string | null>(child?.gender || null)
  const [color, setColor] = useState<string>(child?.color || CHILD_COLORS[childCount % CHILD_COLORS.length])
  const [feeding, setFeeding] = useState<string>(child?.feeding || 'breast')
  const [aids, setAids] = useState<string[]>([...(child?.aids || [])])
  const [mainButtons, setMainButtons] = useState<MainButton[]>(getMainButtons(child).map((b: MainButton) => ({ ...b })))
  const [hideHints, setHideHints] = useState<boolean>(child?.hideHints || false)
  const [error, setError] = useState('')

  const today = dayjs().format('YYYY-MM-DD')

  function toggleAid(id: string) {
    setAids(prev => (prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]))
  }

  // Строки пикера: «Левая/Правая» грудь сводим в один переключатель «Грудь»
  const ageM = birthDate ? ageInMonths(birthDate) : null
  const pickerRows = useMemo(
    () =>
      typesForAge(MAIN_BUTTON_TYPE_LIST, ageM)
        .filter((t: any) => t.id !== 'feedRight')
        .map((t: any) => (t.id === 'feedLeft' ? BREAST_ROW : t)),
    [ageM]
  )

  const rowIds = (row: any): string[] => row.combined || [row.id]
  const defaultMode = (type: string): MainButton['mode'] => (EVENT_TYPES[type].kind === 'interval' ? 'time' : 'count')
  const isEnabled = (row: any) => rowIds(row).some(id => mainButtons.some(b => b.type === id))
  const modeOf = (row: any) => {
    for (const id of rowIds(row)) {
      const b = mainButtons.find(x => x.type === id)
      if (b) return b.mode
    }
    return undefined
  }
  function toggleType(row: any) {
    const ids = rowIds(row)
    if (isEnabled(row)) setMainButtons(prev => prev.filter(b => !ids.includes(b.type)))
    else setMainButtons(prev => [...prev, ...ids.map(id => ({ type: id, mode: defaultMode(id) }))])
  }
  function setMode(row: any, mode: MainButton['mode']) {
    const ids = rowIds(row)
    setMainButtons(prev => prev.map(b => (ids.includes(b.type) ? { ...b, mode } : b)))
  }

  async function save() {
    if (!name.trim()) return setError('Введите имя')
    if (!birthDate) return setError('Укажите дату рождения')
    if (birthDate > today) return setError('Дата рождения в будущем')
    const data = {
      name: name.trim(),
      birthDate,
      gender,
      color,
      feeding,
      aids: [...aids],
      mainButtons: mainButtons.map(b => ({ ...b })),
      hideHints
    }
    const store = useChildrenStore.getState()
    if (child) await store.update({ ...child, ...data })
    else await store.add(data as any)
    onSaved()
  }

  return (
    <View>
      <Field label="Имя" s={s}>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Например, Миша"
          placeholderTextColor={colors.textSoft}
        />
      </Field>

      <Field label="Дата рождения" s={s}>
        <DateTimeInput
          value={dayjs(birthDate).toDate()}
          mode="date"
          maximumDate={new Date()}
          onChange={d => setBirthDate(dayjs(d).format('YYYY-MM-DD'))}
        />
      </Field>

      <Field label="Пол" s={s}>
        <Chips options={GENDERS} selected={gender} onSelect={setGender} s={s} />
      </Field>

      <Field label="Кормление" s={s}>
        <Chips options={FEEDING_TYPES} selected={feeding} onSelect={setFeeding} s={s} />
      </Field>

      <Field label="Кнопки на главном экране" s={s}>
        <View style={{ gap: 8 }}>
          {pickerRows.map((t: any) => {
            const enabled = isEnabled(t)
            const showModes = enabled && (t.kind === 'interval' || t.canTime)
            return (
              <View key={t.id} style={styles.mbRow}>
                <Pressable onPress={() => toggleType(t)} style={[s.chip, enabled && s.chipActive, styles.mbToggle]}>
                  <Text style={[s.chipText, enabled && s.chipActiveText]}>
                    {t.icon} {t.btnLabel || t.label}
                  </Text>
                </Pressable>
                {showModes && (
                  <View style={styles.mbModes}>
                    <Pressable onPress={() => setMode(t, 'time')} style={[s.chip, modeOf(t) === 'time' && s.chipActive]}>
                      <Text style={[s.chipText, modeOf(t) === 'time' && s.chipActiveText]}>Время</Text>
                    </Pressable>
                    <Pressable onPress={() => setMode(t, 'count')} style={[s.chip, modeOf(t) === 'count' && s.chipActive]}>
                      <Text style={[s.chipText, modeOf(t) === 'count' && s.chipActiveText]}>Кол-во</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )
          })}
        </View>
        <Text style={[s.muted, s.small, { marginTop: 6 }]}>
          Эти кнопки появятся на главном. «Время» — засекает длительность, «Кол-во» — считает нажатия.
        </Text>
      </Field>

      <Field label="Подсказки" s={s}>
        <View style={s.row}>
          <Text style={[s.muted, s.small, s.grow]}>
            Скрывать приветствие, поддержку и карточки-подсказки на «Сегодня». Поздравления остаются.
          </Text>
          <Pressable onPress={() => setHideHints(v => !v)} style={[s.chip, hideHints && s.chipActive]}>
            <Text style={[s.chipText, hideHints && s.chipActiveText]}>{hideHints ? 'Скрыты' : 'Показаны'}</Text>
          </Pressable>
        </View>
      </Field>

      <Field label="Что используете для сна" s={s}>
        <View style={styles.chips}>
          {SLEEP_AIDS.map(a => {
            const active = aids.includes(a.id)
            return (
              <Pressable key={a.id} onPress={() => toggleAid(a.id)} style={[s.chip, active && s.chipActive]}>
                <Text style={[s.chipText, active && s.chipActiveText]}>
                  {a.icon} {a.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Text style={[s.muted, s.small, { marginTop: 6 }]}>
          Подсказки будут учитывать выбранное — например, напомнят, когда пора уходить от пеленания.
        </Text>
      </Field>

      <Field label="Цвет" s={s}>
        <View style={styles.colors}>
          {CHILD_COLORS.map(c => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? colors.text : 'transparent' }]}
            />
          ))}
        </View>
      </Field>

      {error ? <Text style={[s.small, { color: colors.urgent, marginBottom: 8 }]}>{error}</Text> : null}

      <View style={s.row}>
        {child && <Btn title="Отмена" variant="secondary" onPress={onCancel!} style={s.grow} />}
        <Btn title={child ? 'Сохранить' : 'Добавить'} onPress={save} style={s.grow} />
      </View>

      {child && onDelete && <Btn title="🗑 Удалить ребёнка" variant="danger" block onPress={onDelete} style={{ marginTop: 10 }} />}
    </View>
  )
}

function Field({ label, s, children }: { label: string; s: any; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  )
}

function Chips({ options, selected, onSelect, s }: { options: any[]; selected: string | null; onSelect: (id: string) => void; s: any }) {
  return (
    <View style={styles.chips}>
      {options.map(o => {
        const active = selected === o.id
        return (
          <Pressable key={o.id} onPress={() => onSelect(o.id)} style={[s.chip, active && s.chipActive]}>
            <Text style={[s.chipText, active && s.chipActiveText]}>
              {o.icon} {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colors: { flexDirection: 'row', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3 },
  mbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  mbToggle: { flex: 1, minWidth: 140 },
  mbModes: { flexDirection: 'row', gap: 6 }
})
