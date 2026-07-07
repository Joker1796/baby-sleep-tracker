import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import dayjs from 'dayjs'
import { useChildrenStore, CHILD_COLORS, Child } from '../store/children'
import { GENDERS, FEEDING_TYPES, SLEEP_AIDS } from '../data/childOptions'
import { Btn } from './ui'
import DateTimeInput from './DateTimeInput'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export default function ChildForm({
  child,
  onSaved,
  onCancel
}: {
  child?: Child | null
  onSaved: () => void
  onCancel?: () => void
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
  const [error, setError] = useState('')

  const today = dayjs().format('YYYY-MM-DD')

  function toggleAid(id: string) {
    setAids(prev => (prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]))
  }

  async function save() {
    if (!name.trim()) return setError('Введите имя')
    if (!birthDate) return setError('Укажите дату рождения')
    if (birthDate > today) return setError('Дата рождения в будущем')
    const data = { name: name.trim(), birthDate, gender, color, feeding, aids: [...aids] }
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

      <Field label="Что используете для сна" s={s}>
        <View style={styles.chips}>
          {SLEEP_AIDS.map((a: any) => {
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
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3 }
})
