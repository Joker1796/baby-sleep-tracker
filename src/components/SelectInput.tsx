import React, { useState } from 'react'
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export type SelectOption = { id: string; label: string; icon?: string }

// Выпадающий список: поле показывает текущий вариант, тап открывает
// список-шторку снизу (как нативный <select> в вебе). Чистый JS, без
// нативных модулей. Значение — id варианта.
export default function SelectInput({
  value,
  options,
  onChange,
  title,
  placeholder
}: {
  value: string
  options: SelectOption[]
  onChange: (id: string) => void
  title?: string
  placeholder?: string
}) {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  const current = options.find(o => o.id === value)
  const fieldLabel = current ? withIcon(current) : placeholder || 'Выберите'

  function pick(id: string) {
    onChange(id)
    setOpen(false)
  }

  return (
    <>
      <Pressable style={[s.input, styles.field]} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={{ color: current ? colors.text : colors.textSoft, fontSize: 15, flex: 1 }} numberOfLines={1}>
          {fieldLabel}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSoft} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 12 }]}
            onPress={() => {}}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            {title ? <Text style={[s.label, { marginBottom: 4 }]}>{title}</Text> : null}
            <ScrollView>
              {options.map(o => {
                const selected = o.id === value
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => pick(o.id)}
                    style={[styles.row, { borderBottomColor: colors.border }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>{withIcon(o)}</Text>
                    {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function withIcon(o: SelectOption): string {
  return o.icon ? `${o.icon} ${o.label}` : o.label
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,12,24,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 8, maxHeight: '70%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, minHeight: 52, gap: 8 }
})
