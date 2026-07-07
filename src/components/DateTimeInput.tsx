import React, { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import dayjs from 'dayjs'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

type Mode = 'date' | 'time' | 'datetime'

// Кроссплатформенный ввод даты/времени. Заменяет web-инпуты
// <input type="date|time|datetime-local">. Значение — Date.
export default function DateTimeInput({
  value,
  mode = 'datetime',
  maximumDate,
  onChange
}: {
  value: Date
  mode?: Mode
  maximumDate?: Date
  onChange: (d: Date) => void
}) {
  const { colors, dark } = useTheme()
  const s = useCommonStyles()
  const [show, setShow] = useState(false)
  // На datetime под Android показываем два последовательных диалога (дата → время).
  const [androidStage, setAndroidStage] = useState<'date' | 'time'>('date')

  const fmt = mode === 'date' ? 'D MMMM YYYY' : mode === 'time' ? 'HH:mm' : 'D MMM YYYY, HH:mm'

  function openPicker() {
    setAndroidStage('date')
    setShow(true)
  }

  function handleChange(event: any, selected?: Date) {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        setShow(false)
        return
      }
      if (mode === 'datetime' && androidStage === 'date' && selected) {
        // Сохраняем выбранную дату, затем открываем выбор времени.
        onChange(mergeDate(value, selected, 'date'))
        setAndroidStage('time')
        return
      }
      setShow(false)
      if (selected) onChange(mode === 'datetime' ? mergeDate(value, selected, 'time') : selected)
    } else if (selected) {
      onChange(selected)
    }
  }

  const androidMode: Exclude<Mode, 'datetime'> = mode === 'datetime' ? androidStage : mode

  return (
    <View>
      <Pressable style={s.input} onPress={openPicker}>
        <Text style={{ color: colors.text, fontSize: 15 }}>{dayjs(value).format(fmt)}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value}
          mode={Platform.OS === 'android' ? androidMode : mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={maximumDate}
          themeVariant={dark ? 'dark' : 'light'}
          onChange={handleChange}
        />
      )}
    </View>
  )
}

// Совмещает часть даты и часть времени двух Date-объектов.
function mergeDate(base: Date, incoming: Date, take: 'date' | 'time'): Date {
  const b = dayjs(base)
  const inc = dayjs(incoming)
  if (take === 'date') {
    return b.year(inc.year()).month(inc.month()).date(inc.date()).toDate()
  }
  return b.hour(inc.hour()).minute(inc.minute()).toDate()
}
