import React, { useState } from 'react'
import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useChildrenStore, Child } from '../store/children'
import { useEventsStore } from '../store/events'
import { useSettingsStore, ThemePref } from '../store/settings'
import { formatAge } from '../logic/age'
import { getFeeding, getAid } from '../data/childOptions'
import { exportBackup, importBackup } from '../utils/backup'
import ChildForm from '../components/ChildForm'
import { Card, Btn } from '../components/ui'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'auto', label: 'Как в системе' },
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' }
]

export default function SettingsScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const children = useChildrenStore(st => st.children)
  const theme = useSettingsStore(st => st.theme)
  const setTheme = useSettingsStore(st => st.setTheme)

  // null | 'new' | child.id
  const [editing, setEditing] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function reloadActive() {
    const active = useChildrenStore.getState()
    const act = active.children.find(c => c.id === active.activeChildId) || active.children[0]
    if (act) await useEventsStore.getState().load(act.id)
  }

  function removeChild(child: Child) {
    Alert.alert(`Удалить профиль «${child.name}»?`, 'Все его события будут удалены безвозвратно.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await useChildrenStore.getState().remove(child.id)
          await reloadActive()
        }
      }
    ])
  }

  function onImport() {
    Alert.alert('Импорт данных', 'Заменить текущие данные или добавить к существующим?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Добавить', onPress: () => doImport(false) },
      { text: 'Заменить всё', style: 'destructive', onPress: () => doImport(true) }
    ])
  }

  async function doImport(replace: boolean) {
    try {
      const res = await importBackup({ replace })
      if (!res) return
      await useChildrenStore.getState().load()
      await reloadActive()
      setMessage(`Импортировано: детей — ${res.children}, событий — ${res.events}`)
    } catch (err: any) {
      setMessage(`Ошибка импорта: ${err.message}`)
    }
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 32 }]}>
        <Card>
          <Text style={s.cardTitle}>Дети</Text>
          {children.map(child => {
            const feeding = getFeeding(child.feeding)
            const aidIcons = (child.aids || []).map((id: string) => getAid(id)?.icon).filter(Boolean).join(' ')
            if (editing === child.id) {
              return (
                <View key={child.id} style={[styles.editBox, { borderBottomColor: colors.border }]}>
                  <ChildForm child={child} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
                </View>
              )
            }
            return (
              <View key={child.id} style={[styles.childRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.dot, { backgroundColor: child.color }]} />
                <View style={s.grow}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{child.name}</Text>
                  <Text style={[s.muted, s.small]}>
                    {formatAge(child.birthDate)} · {child.birthDate}
                    {feeding ? ` · ${feeding.icon} ${feeding.short}` : ''}
                  </Text>
                  {aidIcons ? <Text style={[s.muted, s.small]}>{aidIcons}</Text> : null}
                </View>
                <Pressable onPress={() => setEditing(child.id)} style={[s.btn, s.btnSecondary, styles.smBtn]}>
                  <Ionicons name="pencil" size={16} color={colors.text} />
                </Pressable>
                <Pressable onPress={() => removeChild(child)} style={[s.btn, s.btnDanger, styles.smBtn]}>
                  <Ionicons name="trash-outline" size={16} color={colors.urgent} />
                </Pressable>
              </View>
            )
          })}

          {editing === 'new' ? (
            <View style={styles.editBox}>
              <Text style={s.h3}>Новый ребёнок</Text>
              <ChildForm onSaved={() => setEditing(null)} />
              <Btn title="Отмена" variant="secondary" block onPress={() => setEditing(null)} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <Btn title="+ Добавить ребёнка" variant="secondary" block onPress={() => setEditing('new')} style={{ marginTop: 10 }} />
          )}
        </Card>

        <Card>
          <Text style={s.cardTitle}>Тема</Text>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            {THEMES.map(t => {
              const active = theme === t.id
              return (
                <Pressable key={t.id} onPress={() => setTheme(t.id)} style={[s.chip, active && s.chipActive]}>
                  <Text style={[s.chipText, active && s.chipActiveText]}>{t.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </Card>

        <Card>
          <Text style={s.cardTitle}>Данные</Text>
          <Text style={[s.muted, s.small]}>
            Все данные хранятся только на этом устройстве. Делайте резервные копии, чтобы не потерять историю и
            переносить её между устройствами.
          </Text>
          <View style={[s.row, { marginTop: 10 }]}>
            <Btn title="⬇️ Экспорт" variant="secondary" onPress={exportBackup} style={s.grow} />
            <Btn title="⬆️ Импорт" variant="secondary" onPress={onImport} style={s.grow} />
          </View>
          {message ? <Text style={[s.small, { color: colors.text, marginTop: 8 }]}>{message}</Text> : null}
        </Card>

        <Card>
          <Text style={s.cardTitle}>О приложении</Text>
          <Text style={[s.muted, s.small]}>
            «Режим малыша» — трекер сна и режима ребёнка с подсказками на основе возрастных норм. Подсказки носят
            информационный характер и не заменяют консультацию педиатра.
          </Text>
          <Text style={[s.muted, s.small, { marginTop: 8 }]}>Работает офлайн · данные на устройстве</Text>
        </Card>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  childRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  smBtn: { minHeight: 40, paddingVertical: 6, paddingHorizontal: 10 },
  editBox: { paddingVertical: 10, borderBottomWidth: 1 }
})
